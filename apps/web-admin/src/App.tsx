import { lazy, Suspense, type ReactNode } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ReauthenticationProvider } from './context/ReauthenticationContext'
import { ForbiddenPage, NotFoundPage, UnavailablePage } from './pages/system/SystemPages'
import { operationalRoles, portalRoles, userManagementRoles, resolveRouteAccess } from './routes/access'
import type { RoleCode } from './api/auth'
import { theme } from './theme/muiTheme'

// Code-splitting mediante lazy imports
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const CompanyListPage = lazy(() => import('./pages/companies/CompanyListPage').then((m) => ({ default: m.CompanyListPage })))
const CompanyDetailPage = lazy(() => import('./pages/companies/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })))
const EstablishmentDetailPage = lazy(() => import('./pages/companies/EstablishmentDetailPage').then((m) => ({ default: m.EstablishmentDetailPage })))
const RequestListPage = lazy(() => import('./pages/requests/RequestListPage').then((m) => ({ default: m.RequestListPage })))
const RequestFormPage = lazy(() => import('./pages/requests/RequestFormPage').then((m) => ({ default: m.RequestFormPage })))
const RequestDetailPage = lazy(() => import('./pages/requests/RequestDetailPage').then((m) => ({ default: m.RequestDetailPage })))
const UserManagementPage = lazy(() => import('./pages/users/UserManagementPage').then((m) => ({ default: m.UserManagementPage })))

const LoadingFallback = () => (
  <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
    <CircularProgress aria-label="Cargando módulo" sx={{ color: '#1E3A8A' }} />
  </Box>
)

const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: readonly RoleCode[] }) => {
  const { currentUser, isLoading } = useAuth()
  const access = resolveRouteAccess(isLoading, currentUser?.roleCode ?? null, allowedRoles)

  if (access === 'loading') {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Restaurando sesión" /></Box>
  }
  if (access === 'unauthenticated') return <Navigate to="/login" replace />
  if (access === 'forbidden') return <Navigate to="/403" replace />
  return <AppShell>{children}</AppShell>
}

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser, isLoading } = useAuth()
  if (isLoading) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Restaurando sesión" /></Box>
  return currentUser ? <Navigate to="/dashboard" replace /> : children
}

export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <NotificationProvider>
      <AuthProvider>
        <ReauthenticationProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<UnavailablePage title="Registro público" />} />
                <Route path="/forgot-password" element={<UnavailablePage title="Recuperación de contraseña" />} />
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={portalRoles}><DashboardPage /></ProtectedRoute>} />
                <Route path="/companies" element={<ProtectedRoute allowedRoles={operationalRoles}><CompanyListPage /></ProtectedRoute>} />
                <Route path="/companies/:id" element={<ProtectedRoute allowedRoles={operationalRoles}><CompanyDetailPage /></ProtectedRoute>} />
                <Route path="/establishments/:id" element={<ProtectedRoute allowedRoles={operationalRoles}><EstablishmentDetailPage /></ProtectedRoute>} />
                <Route path="/requests" element={<ProtectedRoute allowedRoles={operationalRoles}><RequestListPage /></ProtectedRoute>} />
                <Route path="/requests/new" element={<ProtectedRoute allowedRoles={operationalRoles}><RequestFormPage /></ProtectedRoute>} />
                <Route path="/requests/:id/edit" element={<ProtectedRoute allowedRoles={operationalRoles}><RequestFormPage /></ProtectedRoute>} />
                <Route path="/requests/:id" element={<ProtectedRoute allowedRoles={operationalRoles}><RequestDetailPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute allowedRoles={userManagementRoles}><UserManagementPage /></ProtectedRoute>} />
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ReauthenticationProvider>
      </AuthProvider>
    </NotificationProvider>
  </ThemeProvider>
)

export default App
