import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TestCreateEdit } from './pages/TestCreateEdit';
import { TestResults } from './pages/TestResults';
import { StudentAttemptReport } from './pages/StudentAttemptReport';
import { StudentTestLanding } from './pages/StudentTestLanding';
import { StudentTestExam } from './pages/StudentTestExam';
import { StudentTestResult } from './pages/StudentTestResult';

export function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 font-tajawal antialiased text-slate-900 selection:bg-gold-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Teacher Routes */}
                <Route path="/login" element={<Login />} />
                
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/tests/create"
                  element={
                    <ProtectedRoute>
                      <TestCreateEdit />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/tests/:id/edit"
                  element={
                    <ProtectedRoute>
                      <TestCreateEdit />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/tests/:id/results"
                  element={
                    <ProtectedRoute>
                      <TestResults />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/tests/:id/results/:attemptId"
                  element={
                    <ProtectedRoute>
                      <StudentAttemptReport />
                    </ProtectedRoute>
                  }
                />

                {/* Student Public Routes */}
                <Route path="/test/:testId" element={<StudentTestLanding />} />
                <Route path="/test/:testId/start" element={<StudentTestExam />} />
                <Route path="/test/:testId/result/:attemptId" element={<StudentTestResult />} />

                {/* Default Redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
