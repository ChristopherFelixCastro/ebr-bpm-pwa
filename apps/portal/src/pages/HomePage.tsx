import { Alert, Box, Card, CardContent, Typography } from '@mui/material'
import { useSession } from '../session/SessionContext'

export function HomePage() {
  const { user, offlineEnrollmentError } = useSession()
  return <Box>
    <Typography variant="h4" sx={{ mb: 1 }}>Inicio</Typography>
    <Typography variant="body1" sx={{ mb: 3 }}>Bienvenido, {user?.fullName}.</Typography>
    {offlineEnrollmentError && <Alert severity="warning" sx={{ mb: 3 }}>La sesión online funciona, pero no se pudo habilitar el acceso local. Sus paquetes anteriores permanecen guardados; compruebe el acceso antes de trabajar sin red.</Alert>}
    <Card><CardContent>
      <Typography variant="h6" sx={{ mb: 1 }}>Portal único EBR / BPM</Typography>
      <Typography sx={{ mb: 2 }}>La sesión y la navegación central ya están disponibles. Las pantallas de negocio se incorporarán por entregas después de validar esta base.</Typography>
      <Alert severity="info">Su acceso a datos y acciones dependerá del alcance, asignación, estado y versión comprobados por el Core al migrar cada flujo.</Alert>
    </CardContent></Card>
  </Box>
}
