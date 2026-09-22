import type { ReactNode } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppShell } from './components/AppShell'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { LoginPage } from './pages/auth/LoginPage'
import { ForbiddenPage, IntegrationPage, NotFoundPage, UnavailablePage } from './pages/system/SystemPages'
import { portalRoles, resolveRouteAccess } from './routes/access'
import { theme } from './theme/muiTheme'

const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: typeof portalRoles }) => {
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
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<UnavailablePage title="Registro público" />} />
            <Route path="/forgot-password" element={<UnavailablePage title="Recuperación de contraseña" />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={portalRoles}><IntegrationPage /></ProtectedRoute>} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  </ThemeProvider>
)

export default App
