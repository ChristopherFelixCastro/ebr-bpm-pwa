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
      <Typography sx={{ mb: 2 }}>El directorio empresarial y las solicitudes BPM están disponibles según su rol. La operación sanitaria y el trabajo de campo se incorporarán en entregas posteriores.</Typography>
      <Alert severity="info">Core comprueba el alcance empresarial, estado y versión de cada operación.</Alert>
    </CardContent></Card>
  </Box>
}
