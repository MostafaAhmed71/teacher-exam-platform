import type { EvaluationRating } from '../types';

/**
 * Generates an 8-character hard-to-guess alphanumeric ID for test links (e.g. Ab7K92xP)
 */
export function generateUniqueTestId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a persistent browser fingerprint identifier to prevent duplicate submissions
 */
export function getDeviceFingerprint(): string {
  const key = 'teacher_platform_student_device_id';
  let deviceId = localStorage.getItem(key);
  
  if (!deviceId) {
    const randomSeed = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const navSpecs = (navigator.userAgent || '') + (screen.height || '') + (screen.width || '');
    // simple hash
    let hash = 0;
    for (let i = 0; i < navSpecs.length; i++) {
      const char = navSpecs.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    deviceId = `dev_${Math.abs(hash)}_${randomSeed}`;
    localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

/**
 * Calculates evaluation rating based on score percentage
 */
export function calculateRating(percentage: number): EvaluationRating {
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جداً';
  if (percentage >= 70) return 'جيد';
  if (percentage >= 60) return 'مقبول';
  return 'يحتاج إلى تحسين';
}

/**
 * Formats remaining seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Copies text to clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}

/**
 * Builds a direct WhatsApp share URL with pre-formatted Arabic message
 */
export function generateWhatsAppShareUrl(testTitle: string, testUrl: string): string {
  const message = `اختبار: ${testTitle}\n\nيرجى الدخول إلى الرابط التالي وإكمال الاختبار:\n${testUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Formats date into readable Arabic format
 */
export function formatDateArabic(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns the public web base URL for sharing test links.
 * When running inside a native mobile app (Capacitor/localhost),
 * it returns the configured public web domain so shared links always open on the web.
 */
export function getAppBaseUrl(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isNativeOrLocalhost =
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('file://');

  if (isNativeOrLocalhost) {
    return 'https://teacher-exam-platform.vercel.app';
  }

  return origin;
}

