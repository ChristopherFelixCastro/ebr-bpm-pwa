import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'

export function PublicHeader() {
  return <Box component="header" sx={{ borderBottom: '1px solid #e5e4d9', bgcolor: '#F2F3ED' }}>
    <Container maxWidth="lg" sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box component={RouterLink} to="/" aria-label="SIRA Tech, inicio" sx={{ display: 'inline-flex', alignItems: 'center' }}><Box component="img" src="/sira-imagotipo.jpeg" alt="SIRA Tech" sx={{ width: { xs: 148, sm: 196 }, height: 52, objectFit: 'cover', objectPosition: 'center' }} /></Box>
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
  return <Box sx={{ minHeight: '100vh', bgcolor: '#fffbeb', color: '#78350f' }}>
    <PublicHeader />
    <Box sx={{ background: 'radial-gradient(circle at 80% 10%, #b45309 0%, #92400e 42%, #78350f 100%)', color: '#fff' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 13 } }}>
        <Stack spacing={3} sx={{ maxWidth: 740 }}>
          <Typography sx={{ textTransform: 'uppercase', letterSpacing: '.16em', fontWeight: 800, fontSize: 13, color: '#fde68a' }}>SIRA Tech · Sistema de Inspección y Riesgo Alimentario</Typography>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 900, fontSize: { xs: 39, sm: 56, md: 68 }, lineHeight: 1.07, letterSpacing: '-.045em' }}>Inspección y evaluación sanitaria, en un solo lugar.</Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 21 }, lineHeight: 1.6, color: '#fff7ed', maxWidth: 650 }}>Un espacio para gestionar solicitudes BPM, inspecciones de establecimientos y evaluaciones basadas en riesgo.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1, alignItems: 'flex-start' }}>
            <Button component={RouterLink} to="/denunciar" variant="contained" size="large" sx={{ borderRadius: 99, px: 4, py: 1.4, bgcolor: '#f59e0b', color: '#451a03', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#fbbf24' } }}>Presentar una denuncia</Button>
            <Button component={RouterLink} to="/login" variant="outlined" size="large" sx={{ borderRadius: 99, px: 4, py: 1.4, borderColor: '#fde68a', color: '#fff', textTransform: 'none' }}>Entrar al portal</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>¿Qué permite hacer este sistema?</Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 690 }}>Cada función está disponible según el rol de quien ingresa. Las denuncias pueden presentarse sin iniciar sesión.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {features.map((feature) => <Box key={feature.title} sx={{ bgcolor: '#fff', border: '1px solid #fde68a', borderRadius: 4, p: 3.5, minHeight: 220 }}>
          <Box sx={{ color: '#b45309', mb: 2 }}>{feature.icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{feature.title}</Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>{feature.text}</Typography>
        </Box>)}
      </Box>
      <Box sx={{ mt: 7, bgcolor: '#fef3c7', borderRadius: 4, p: { xs: 3, md: 5 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>¿Quiere informar una situación sanitaria?</Typography><Typography color="text.secondary">Describa lo sucedido. Puede hacerlo de forma anónima o dejar un contacto voluntario. No necesita cuenta.</Typography></Box>
        <Button component={RouterLink} to="/denunciar" variant="contained" sx={{ borderRadius: 99, px: 3, whiteSpace: 'nowrap', textTransform: 'none' }}>Ir al formulario</Button>
      </Box>
    </Container>
    <Box component="footer" sx={{ py: 3, borderTop: '1px solid #fde68a', textAlign: 'center', color: '#92400e' }}>Portal SIRA Tech · Gestión sanitaria</Box>
  </Box>
}
