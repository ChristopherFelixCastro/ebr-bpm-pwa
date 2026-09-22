import { Alert, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import ConstructionIcon from '@mui/icons-material/Construction'
import LockIcon from '@mui/icons-material/Lock'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const CenteredCard = ({ children }: { children: ReactNode }) => (
  <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F8FAFC', p: 2 }}>
    <Card sx={{ maxWidth: 620, width: '100%', borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(15,23,42,.08)' }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>{children}</CardContent>
    </Card>
  </Box>
)

export const IntegrationPage = () => {
  const { currentUser } = useAuth()
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>Bienvenido, {currentUser?.fullName}</Typography>
      <Typography sx={{ color: '#475569', mb: 3 }}>La sesión y autorización visual ya utilizan el Core EBR/BPM.</Typography>
      <Card sx={{ maxWidth: 760, borderRadius: 3, border: '1px solid #BFDBFE', boxShadow: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <ConstructionIcon sx={{ color: '#2563EB', fontSize: 38, mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Módulos operativos en integración</Typography>
          <Typography sx={{ color: '#475569', mb: 2 }}>Empresas, contactos, solicitudes, documentos y dashboard se habilitarán en entregas posteriores con contratos reales. Esta pantalla no presenta datos simulados.</Typography>
          <Chip label={`Rol: ${currentUser?.roleCode}`} color="primary" variant="outlined" />
          {currentUser?.companyId && <Chip label="Alcance empresarial disponible" color="success" variant="outlined" sx={{ ml: 1 }} />}
        </CardContent>
      </Card>
    </Box>
  )
}

export const UnavailablePage = ({ title }: { title: string }) => (
  <CenteredCard>
    <ConstructionIcon sx={{ color: '#2563EB', fontSize: 42 }} />
    <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>{title}</Typography>
    <Alert severity="info" sx={{ my: 2 }}>Módulo en integración. Todavía no existe soporte seguro en el Core.</Alert>
    <Button component={RouterLink} to="/login" variant="contained">Volver al inicio de sesión</Button>
  </CenteredCard>
)

export const ForbiddenPage = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // logout() already cleared the in-memory session in its finally block.
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <CenteredCard>
      <LockIcon sx={{ color: '#DC2626', fontSize: 42 }} />
      <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>Acceso no autorizado</Typography>
      <Typography sx={{ color: '#475569', my: 2 }}>Su sesión es válida, pero este portal no contiene una ruta habilitada para su rol.</Typography>
      <Button onClick={() => void handleLogout()} variant="outlined">Cerrar sesión</Button>
    </CenteredCard>
  )
}

export const NotFoundPage = () => (
  <CenteredCard>
    <SearchOffIcon sx={{ color: '#64748B', fontSize: 42 }} />
    <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>Página no encontrada</Typography>
    <Typography sx={{ color: '#475569', my: 2 }}>La ruta solicitada no existe o todavía no está habilitada.</Typography>
    <Button component={RouterLink} to="/dashboard" variant="contained">Ir al inicio</Button>
  </CenteredCard>
)
