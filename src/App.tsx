import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CautionCardsPage } from './pages/CautionCardsPage';
import { ReportsPage } from './pages/ReportsPage';
import { OcrPage } from './pages/OcrPage';
import { AuthProvider, RequireAuth } from './context/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Patient routes */}
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id" element={<PatientDetails />} />
              
              {/* Caution Cards routes */}
              <Route path="/caution-cards" element={<CautionCardsPage />} />
              <Route path="/caution-cards/:id" element={<CautionCardsPage />} />
              
              {/* Reports routes */}
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/:id" element={<ReportsPage />} />
              
              {/* OCR routes */}
              <Route path="/ocr" element={<OcrPage />} />
              
              {/* User routes */}
              <Route path="/profile" element={<UserProfilePage />} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}; 