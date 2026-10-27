import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('deletion, activation quotas, protected questions, submission and teacher ownership', async () => {
  const db = new PGlite();
  const teacher = '11111111-1111-4111-8111-111111111111';
  const otherTeacher = '22222222-2222-4222-8222-222222222222';
  const query = (sql, args = []) => db.query(sql, args);
  const rpc = async (name, args) => (await query(
    `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as result`, args,
  )).rows[0].result;
  const asRole = async (role, uid = '') => {
    await db.exec('reset role');
    await query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
    await db.exec(`set role ${role}`);
  };

  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on all functions in schema auth to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
    `);
    const schema = (await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
      .replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '');
    await db.exec(schema);
    // Reproduce the old bug: RETURN NEW suppresses DELETE before the upgrade.
    await db.exec(`create or replace function public.enforce_license_quota()
      returns trigger language plpgsql as $$ begin return new; end $$;`);
    await query('insert into auth.users values ($1, $2, $3)', [teacher, 'teacher@example.test', '{}']);
    await query('insert into auth.users values ($1, $2, $3)', [otherTeacher, 'other@example.test', '{}']);
    await query("insert into public.tests(id, teacher_id, title, subject, grade, status) values ('exam', $1, 'Exam', 'Math', '1', 'published')", [teacher]);
    await db.exec("delete from public.tests where id = 'exam'");
    assert.equal((await query("select count(*)::int as n from public.tests where id = 'exam'")).rows[0].n, 1);

    const upgrade = await readFile(new URL('../supabase/upgrade_exam_access.sql', import.meta.url), 'utf8');
    await db.exec(upgrade);
    await db.exec(upgrade); // Upgrade is safe to rerun.

    await asRole('authenticated', teacher);
    const question = { id: 'new-question', question_text: '1+1?', question_type: 'multiple_choice', points: 2,
      correct_answer: 'a', options: [{ option_text: '2', option_key: 'a', sort_order: 1 }] };
    await rpc('save_test_questions', ['exam', JSON.stringify([question])]);
    const q = (await query("select * from public.questions where test_id = 'exam'")).rows[0];
    await rpc('save_test_questions', ['exam', JSON.stringify([{ ...question, id: q.id, question_text: 'Updated' }])]);
    assert.equal((await query('select id from public.questions')).rows[0].id, q.id);
    // A bad option must roll back the question update and deletion of existing options.
    await assert.rejects(rpc('save_test_questions', ['exam', JSON.stringify([
      { ...question, id: q.id, question_text: 'Should roll back', options: [{ option_key: 'a', sort_order: 1 }] },
    ])]));
    assert.equal((await query('select question_text from public.questions')).rows[0].question_text, 'Updated');
    assert.equal((await query('select count(*)::int as n from public.question_options')).rows[0].n, 1);
    const code = (await query("insert into public.test_access_codes(test_id, max_uses) values ('exam', 3) returning *")).rows[0];
    await assert.rejects(query('update public.test_access_codes set used_count = 0'));
    await assert.rejects(query("insert into public.test_access_codes(test_id, max_uses, used_count) values ('exam', 3, 0)"));

    await asRole('authenticated', otherTeacher);
    assert.equal((await query('select * from public.test_access_codes')).rows.length, 0);
    assert.equal((await query("delete from public.tests where id = 'exam' returning id")).rows.length, 0);
    await assert.rejects(rpc('save_test_questions', ['exam', '[]']));
    await assert.rejects(query("insert into public.test_access_codes(test_id, max_uses) values ('exam', 3)"));

    await asRole('anon');
    const metadata = await rpc('get_public_test_details', ['exam']);
    assert.equal(metadata.test.questions_count, 1);
    assert.deepEqual(metadata.questions, []);
    assert.equal((await query('select * from public.questions')).rows.length, 0);
    await assert.rejects(query('select * from public.test_access_codes'));
    await assert.rejects(query("select exam_private.get_public_test_details('exam')"));
    await assert.rejects(rpc('redeem_test_code', ['exam', 'invalid', 'Student', '1']));
    await assert.rejects(rpc('submit_test_attempt', ['exam', 'Student', '1', 'fake', '{}']));
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      tokens.push((await rpc('redeem_test_code', ['exam', code.code, 'Student', '1'])).token);
    }
    await assert.rejects(rpc('redeem_test_code', ['exam', code.code, 'Fourth student', '1']));
    const activated = await rpc('get_activated_test', ['exam', tokens[0]]);
    assert.equal(activated.questions.length, 1);
    assert.equal(activated.questions[0].correct_answer, undefined);
    await rpc('get_activated_test', ['exam', tokens[0]]); // Refresh consumes no uses.
    const submission = await rpc('submit_test_attempt', ['exam', 'Spoofed', 'Other', tokens[0], JSON.stringify({ [q.id]: 'a' })]);
    assert.equal(submission.score, 2);
    await assert.rejects(rpc('submit_test_attempt', ['exam', 'Student', '1', tokens[0], '{}']));
    await assert.rejects(rpc('get_activated_test', ['exam', tokens[0]]));

    await asRole('authenticated', teacher);
    const attempt = (await query('select * from public.attempts')).rows[0];
    assert.equal(attempt.student_name, 'Student');
    assert.equal((await query('select used_count from public.test_access_codes')).rows[0].used_count, 3);
    await query("insert into public.tests(id, teacher_id, title, subject, grade, status) values ('other-exam', $1, 'Other', 'Math', '1', 'published')", [teacher]);
    const expiringCode = (await query("insert into public.test_access_codes(test_id, max_uses) values ('exam', 1) returning *")).rows[0];
    await asRole('anon');
    await assert.rejects(rpc('redeem_test_code', ['other-exam', expiringCode.code, 'Student', '1']));
    await assert.rejects(rpc('get_activated_test', ['other-exam', tokens[1]]));
    const expiringToken = (await rpc('redeem_test_code', ['exam', expiringCode.code, 'Student', '1'])).token;
    await asRole('postgres');
    await query("update exam_private.sessions set expires_at = now() - interval '2 minutes' where token = $1", [expiringToken]);
    await asRole('anon');
    await assert.rejects(rpc('get_activated_test', ['exam', expiringToken]));
    await assert.rejects(rpc('submit_test_attempt', ['exam', 'Student', '1', expiringToken, '{}']));
    await asRole('authenticated', teacher);
    // Delete question/options and verify persistence instead of a misleading success.
    await rpc('save_test_questions', ['exam', '[]']);
    assert.equal((await query('select * from public.questions')).rows.length, 0);
    assert.equal((await query('select * from public.question_options')).rows.length, 0);
    // Revoking a code also invalidates already-issued sessions.
    await query('delete from public.test_access_codes where id = $1', [code.id]);
    await asRole('anon');
    await assert.rejects(rpc('get_activated_test', ['exam', tokens[1]]));
    await asRole('authenticated', teacher);
    assert.equal((await query("delete from public.tests where id = 'exam' returning id")).rows.length, 1);
    assert.equal((await query("select * from public.tests where id = 'exam'")).rows.length, 0);
    assert.equal((await query('select * from public.attempts')).rows.length, 0);
  } finally { await db.close(); }
});
