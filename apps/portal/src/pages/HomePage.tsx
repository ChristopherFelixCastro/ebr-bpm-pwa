import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Link as RouterLink } from 'react-router-dom'
import type { CoreRole } from '@ebr-bpm/core-client'
import { capabilities, hasCapability } from '../access/capabilities'
import { useSession } from '../session/SessionContext'

const startByRole: Record<CoreRole, { intro: string; ids: string[]; next: string }> = {
  UNIVERSAL: { intro: 'Supervise la operación completa, los usuarios y las definiciones que utiliza el sistema.', ids: ['cases', 'analytics', 'users', 'requests'], next: 'Revise los casos que requieren una decisión y las evaluaciones pendientes.' },
  ADMIN: { intro: 'Organice la operación sanitaria y haga seguimiento de los casos e informes.', ids: ['cases', 'assignments', 'analytics', 'users'], next: 'Compruebe los casos, asigne evaluadores y revise los resultados.' },
  COORDINATOR: { intro: 'Coordine los casos, los documentos y la agenda de inspecciones.', ids: ['cases', 'document-review', 'assignments', 'scheduling'], next: 'Empiece por los documentos y casos que esperan atención.' },
  EVALUATOR: { intro: 'Consulte su trabajo de campo y las correcciones que requieren respuesta.', ids: ['field-calendar', 'field', 'corrections', 'establishments'], next: 'Revise su calendario y abra Mis inspecciones para iniciar o continuar una visita.' },
  COMPANY_ADMIN: { intro: 'Administre los datos de su empresa y presente solicitudes BPM.', ids: ['requests', 'establishments', 'contacts', 'companies'], next: 'Revise sus establecimientos y solicitudes antes de enviar una nueva.' },
  DELEGATE: { intro: 'Consulte los establecimientos y gestione solicitudes dentro de su empresa.', ids: ['requests', 'establishments', 'contacts'], next: 'Revise las solicitudes de la empresa o prepare una nueva.' },
}

const descriptions: Record<string, string> = {
  cases: 'Revise el estado y avance de los casos sanitarios.', analytics: 'Consulte inspecciones, revisiones y cálculos de riesgo.',
  users: 'Gestione cuentas, roles y autorizaciones.', requests: 'Prepare y consulte solicitudes BPM.',
  assignments: 'Consulte las asignaciones de evaluadores.', 'document-review': 'Valide los documentos enviados.',
  scheduling: 'Consulte y organice las visitas de campo.', field: 'Inicie asignaciones y continúe inspecciones.',
  corrections: 'Responda las observaciones de una revisión.', establishments: 'Consulte los establecimientos registrados.',
  'field-calendar': 'Consulte sus visitas programadas por día, semana o mes.',
  contacts: 'Consulte los contactos asociados.', companies: 'Consulte los datos de la empresa.',
}

export function HomePage() {
  const { user, offlineEnrollmentError } = useSession()
  const guide = user ? startByRole[user.roleCode] : null
  const quickLinks = guide?.ids.map((id) => capabilities.find((item) => item.id === id)).filter((item) => item && hasCapability(user, item)) ?? []
  return <Stack spacing={3}>
    <Typography component="h1" variant="h4" sx={{ fontWeight: 850 }}>Inicio</Typography>
    <Box sx={{ bgcolor: '#78350f', color: '#fff', borderRadius: 3, p: { xs: 3, md: 4 }, background: 'linear-gradient(120deg, #78350f, #b45309)' }}>
      <Chip label="Portal SIRA Tech" size="small" sx={{ mb: 2, bgcolor: '#fef3c7', color: '#78350f', fontWeight: 800 }} />
      <Typography component="h2" variant="h5" sx={{ fontWeight: 850, mb: 1, color: '#fff' }}>Bienvenido, {user?.fullName}</Typography>
      <Typography sx={{ color: '#fff7ed', maxWidth: 660, lineHeight: 1.6 }}>{guide?.intro}</Typography>
    </Box>
    {offlineEnrollmentError && <Alert severity="warning">La sesión online funciona, pero no se pudo habilitar el acceso local. Sus paquetes anteriores permanecen guardados; compruebe el acceso antes de trabajar sin red.</Alert>}
    <Box><Typography component="h2" variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Empiece por aquí</Typography><Typography color="text.secondary">Acceda a las funciones disponibles para su cuenta.</Typography></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      {quickLinks.map((item) => item && <Card key={item.id} variant="outlined" sx={{ borderRadius: 2.5, '&:hover': { borderColor: '#d97706', boxShadow: '0 8px 20px rgba(120,53,15,.08)' } }}>
        <CardActionArea component={RouterLink} to={item.path} sx={{ height: '100%' }}><CardContent sx={{ minHeight: 135, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box><Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>{item.label}</Typography><Typography variant="body2" color="text.secondary">{descriptions[item.id]}</Typography></Box>
          <ArrowForwardIcon sx={{ color: '#78350f', mt: 1, fontSize: 20 }} aria-hidden="true" />
        </CardContent></CardActionArea>
      </Card>)}
    </Box>
    <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#fef3c7' }}><CardContent sx={{ p: 3 }}>
      <Typography component="h2" variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Siguiente paso recomendado</Typography>
      <Typography color="text.secondary" sx={{ mb: 1.5 }}>{guide?.next}</Typography>
      {quickLinks[0] && <Button component={RouterLink} to={quickLinks[0].path} endIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none' }}>Ir a {quickLinks[0].label}</Button>}
    </CardContent></Card>
  </Stack>
}
