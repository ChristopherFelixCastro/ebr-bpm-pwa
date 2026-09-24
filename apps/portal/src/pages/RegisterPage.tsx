import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import { useNavigate } from 'react-router-dom'

// Core todavía no acepta ni conserva la carta obligatoria de aprobación de cuenta.
// Se mantiene la entrada visual sin enviar registros incompletos ni simular una carga.
export function RegisterPage() {
  const navigate = useNavigate()
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F8FAFC', p: 2 }}>
    <Card sx={{ maxWidth: 600, width: '100%' }}>
      <Box sx={{ p: 3, bgcolor: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', gap: 2 }}>
        <ShieldIcon /><Typography variant="h6" sx={{ color: 'white' }}>Registro de usuario y empresa</Typography>
      </Box>
      <CardContent sx={{ p: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>El registro de cuentas está pendiente de habilitación.</Alert>
        <Typography sx={{ mb: 2 }}>Para aprobar una cuenta empresarial se requiere una carta de autorización de la persona solicitante. El Core todavía no dispone de un contrato para adjuntarla y consultarla durante la aprobación.</Typography>
        <Typography sx={{ mb: 2 }}>Por ahora no se envían solicitudes de registro desde este portal. Consulte al administrador central para gestionar el alta y la documentación requerida.</Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>Volver al inicio de sesión</Button>
      </CardContent>
    </Card>
  </Box>
}
