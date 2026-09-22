import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/muiTheme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppShell } from './components/AppShell';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Main Functional Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CompanyListPage } from './pages/companies/CompanyListPage';
import { CompanyDetailPage } from './pages/companies/CompanyDetailPage';
import { RequestListPage } from './pages/requests/RequestListPage';
import { RequestFormPage } from './pages/requests/RequestFormPage';
import { RequestDetailPage } from './pages/requests/RequestDetailPage';
import { UserManagementPage } from './pages/users/UserManagementPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected Routes inside AppShell */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/companies"
                element={
                  <ProtectedRoute>
                    <CompanyListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/companies/:id"
                element={
                  <ProtectedRoute>
                    <CompanyDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests"
                element={
                  <ProtectedRoute>
                    <RequestListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/new"
                element={
                  <ProtectedRoute>
                    <RequestFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/edit/:id"
                element={
                  <ProtectedRoute>
                    <RequestFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/:id"
                element={
                  <ProtectedRoute>
                    <RequestDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
