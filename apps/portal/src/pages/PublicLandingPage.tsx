import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'

export function PublicHeader() {
  return <Box component="header" sx={{ borderBottom: '1px solid #dce7e8', bgcolor: '#fff' }}>
    <Container maxWidth="lg" sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Typography component={RouterLink} to="/" sx={{ color: '#103e4b', textDecoration: 'none', fontWeight: 900, fontSize: { xs: 18, sm: 23 }, letterSpacing: '-.04em' }}>EBR / BPM</Typography>
      <Stack direction="row" spacing={1}>
        <Button component={RouterLink} to="/login" variant="outlined" size="small" sx={{ borderRadius: 99, px: { xs: 1.5, sm: 2.5 }, textTransform: 'none', whiteSpace: 'nowrap' }}>Iniciar sesión</Button>
        <Button component={RouterLink} to="/registro" variant="contained" size="small" sx={{ borderRadius: 99, px: { xs: 1.5, sm: 2.5 }, textTransform: 'none', whiteSpace: 'nowrap' }}>Crear cuenta</Button>
      </Stack>
    </Container>
  </Box>
}

const features = [
  { icon: <TravelExploreOutlinedIcon />, title: 'Inspecciones de campo', text: 'El personal autorizado registra observaciones y evidencias en el establecimiento.' },
  { icon: <FactCheckOutlinedIcon />, title: 'Evaluación y seguimiento', text: 'Las inspecciones pasan por revisión, cálculo de riesgo e informe según corresponda.' },
  { icon: <CampaignOutlinedIcon />, title: 'Denuncias ciudadanas', text: 'Cualquier persona puede comunicar una situación para que el equipo responsable la revise.' },
]

export function PublicLandingPage() {
  return <Box sx={{ minHeight: '100vh', bgcolor: '#f4f8f7', color: '#103e4b' }}>
    <PublicHeader />
    <Box sx={{ background: 'radial-gradient(circle at 80% 10%, #2c8791 0%, #135665 42%, #103e4b 100%)', color: '#fff' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 13 } }}>
        <Stack spacing={3} sx={{ maxWidth: 740 }}>
          <Typography sx={{ textTransform: 'uppercase', letterSpacing: '.16em', fontWeight: 800, fontSize: 13, color: '#a7e8d6' }}>Portal sanitario EBR / BPM</Typography>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 900, fontSize: { xs: 39, sm: 56, md: 68 }, lineHeight: 1.07, letterSpacing: '-.045em' }}>Inspección y evaluación sanitaria, en un solo lugar.</Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 21 }, lineHeight: 1.6, color: '#e5f2ef', maxWidth: 650 }}>Un espacio para gestionar solicitudes BPM, inspecciones de establecimientos y evaluaciones basadas en riesgo.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1, alignItems: 'flex-start' }}>
            <Button component={RouterLink} to="/denunciar" variant="contained" size="large" sx={{ borderRadius: 99, px: 4, py: 1.4, bgcolor: '#dcf9b9', color: '#123e3b', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#c7eca1' } }}>Presentar una denuncia</Button>
            <Button component={RouterLink} to="/login" variant="outlined" size="large" sx={{ borderRadius: 99, px: 4, py: 1.4, borderColor: '#cee6e3', color: '#fff', textTransform: 'none' }}>Entrar al portal</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>¿Qué permite hacer este sistema?</Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 690 }}>Cada función está disponible según el rol de quien ingresa. Las denuncias pueden presentarse sin iniciar sesión.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {features.map((feature) => <Box key={feature.title} sx={{ bgcolor: '#fff', border: '1px solid #dce7e8', borderRadius: 4, p: 3.5, minHeight: 220 }}>
          <Box sx={{ color: '#167d80', mb: 2 }}>{feature.icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{feature.title}</Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>{feature.text}</Typography>
        </Box>)}
      </Box>
      <Box sx={{ mt: 7, bgcolor: '#dff1eb', borderRadius: 4, p: { xs: 3, md: 5 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>¿Quiere informar una situación sanitaria?</Typography><Typography color="text.secondary">Describa lo sucedido. Puede hacerlo de forma anónima o dejar un contacto voluntario. No necesita cuenta.</Typography></Box>
        <Button component={RouterLink} to="/denunciar" variant="contained" sx={{ borderRadius: 99, px: 3, whiteSpace: 'nowrap', textTransform: 'none' }}>Ir al formulario</Button>
      </Box>
    </Container>
    <Box component="footer" sx={{ py: 3, borderTop: '1px solid #dce7e8', textAlign: 'center', color: '#526b70' }}>Portal EBR / BPM · Gestión sanitaria</Box>
  </Box>
}
