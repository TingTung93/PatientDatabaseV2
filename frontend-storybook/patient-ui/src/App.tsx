import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'; // Renamed MUI ThemeProvider
import { ThemeProvider as StyledThemeProvider } from 'styled-components'; // Import styled-components ThemeProvider
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/common/Layout';
import './App.css';
import PatientsPage from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage'; // Use named import
import { PatientFormPage } from './pages/PatientFormPage'; // Use named import
import PatientReportsPage from './pages/PatientReportsPage';
import { ReportsPage } from './pages/ReportsPage'; // Use named import
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { errorReportingService } from './services/errorReportingService';
import { CautionCardsPage } from './pages/CautionCardsPage';
import ReportUploadPage from './pages/ReportUploadPage';
import { CautionCardUploadPage } from './pages/CautionCardUploadPage';
// import AppRoutes from './routes'; // Cannot find module - commented out
// import CautionCardsPage from './pages/CautionCardsPage';
// import OCRPage from './pages/OCRPage';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Import pages here (will be created in future steps)
// import { HomePage } from './pages/HomePage';
// import { PatientsPage } from './pages/PatientsPage';
// import { PatientDetailPage } from './pages/PatientDetailPage';
// import { ReportsPage } from './pages/ReportsPage';
// import { CautionCardsPage } from './pages/CautionCardsPage';
// import { OCRPage } from './pages/OCRPage';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize error reporting service
    errorReportingService.initialize({
      environment: process.env.NODE_ENV,
      version: process.env['REACT_APP_VERSION'] || '1.0.0', // Use bracket notation
    });
  }, []);

  const handleError = (error: Error, errorInfo: React.ErrorInfo): void => {
    errorReportingService.logError(error, {
      componentStack: errorInfo.componentStack ?? '', // Provide default empty string
    });
  };

  return (
    <AuthProvider>
      <WebSocketProvider>
        <QueryClientProvider client={queryClient}>
          <MuiThemeProvider theme={theme}>
            {' '}
            {/* Use renamed MUI provider */}
            <StyledThemeProvider theme={theme}>
              {' '}
              {/* Add styled-components provider */}
              <CssBaseline />
              <ToastProvider>
                <ErrorBoundary onError={handleError}>
                  <Router>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <Navigate to="/patients" replace />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patients"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PatientsPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patients/new"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PatientFormPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patients/:id"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PatientDetailPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patients/:id/edit"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PatientFormPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patients/:id/reports"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <PatientReportsPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reports"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <ReportsPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reports/upload"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <ReportUploadPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/caution-cards"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <CautionCardsPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/caution-cards/upload"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <CautionCardUploadPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                      {/* These routes will be implemented later 
                    <Route path="/patients/:id/caution-cards" element={<CautionCardsPage />} />
                    <Route path="/ocr" element={<OCRPage />} />
                    */}
                    </Routes>
                  </Router>
                </ErrorBoundary>
              </ToastProvider>
            </StyledThemeProvider>{' '}
            {/* Close styled-components provider */}
          </MuiThemeProvider>{' '}
          {/* Close MUI provider */}
        </QueryClientProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App;
