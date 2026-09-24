import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { capabilities, hasCapability, homeFor } from './access/capabilities'
import { PortalLayout } from './components/PortalLayout'
import { SessionProvider, useSession } from './session/SessionContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { AccountPage } from './pages/AccountPage'
import { OfflineAccessPage, OfflinePackagesPage } from './pages/OfflinePages'
import { StatusPage } from './pages/StatusPage'
import { theme } from './theme'

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <StatusPage title="Restaurando sesión…" />
  if (user) return <Navigate to={homeFor(user.roleCode)} replace />
  return children
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession()
  const location = useLocation()
  if (loading) return <StatusPage title="Restaurando sesión…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <PortalLayout>{children}</PortalLayout>
}

function ProtectedDestination() {
  const { user } = useSession()
  const { pathname } = useLocation()
  const capability = [...capabilities].sort((a, b) => b.path.length - a.path.length)
    .find(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
  if (!capability) return <StatusPage title="Página no encontrada" description="La dirección no corresponde a una página del portal." />
  if (!hasCapability(user, capability)) return <StatusPage title="Acceso denegado" description="Su cuenta no tiene permiso para abrir esta sección." />
  return <StatusPage title="Función pendiente de migración" description="Esta pantalla aún no está disponible en el portal único." />
}

function OnlineRoutes() {
  return <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/recuperar-clave" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/acceso-sin-conexion" element={<OfflineAccessPage />} />
    <Route path="/campo/paquetes" element={<OfflinePackagesPage />} />
    <Route path="/" element={<Navigate to="/inicio" replace />} />
    <Route path="/inicio" element={<PrivateRoute><HomePage /></PrivateRoute>} />
    <Route path="/cuenta" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
    <Route path="*" element={<PrivateRoute><ProtectedDestination /></PrivateRoute>} />
  </Routes>
}

export default function App() {
  return <ThemeProvider theme={theme}><CssBaseline /><BrowserRouter><SessionProvider><OnlineRoutes /></SessionProvider></BrowserRouter></ThemeProvider>
}
