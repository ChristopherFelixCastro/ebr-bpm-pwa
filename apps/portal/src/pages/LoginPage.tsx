import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, IconButton, InputAdornment, TextField, Typography } from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import ShieldIcon from '@mui/icons-material/Shield'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { CoreApiError } from '@ebr-bpm/core-client'
import { useSession } from '../session/SessionContext'
import { homeFor } from '../access/capabilities'

// Adaptación visual de LoginPage de web-admin; el proveedor y cliente son los del portal.
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) { setError('Ingrese su correo electrónico y contraseña.'); return }
    setSubmitting(true)
    setError('')
    try {
      const user = await login(email, password)
      const requested = (location.state as { from?: string } | null)?.from
      navigate(requested?.startsWith('/') && !requested.startsWith('//') ? requested : homeFor(user.roleCode), { replace: true })
    } catch (caught) {
      setError(caught instanceof CoreApiError ? caught.message : 'No fue posible iniciar sesión.')
    } finally { setSubmitting(false) }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F8FAFC', p: 2 }}>
    <Card sx={{ maxWidth: 480, width: '100%', borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,.08)' }}>
      <Box sx={{ p: 3.5, textAlign: 'center', bgcolor: '#1E3A8A', color: '#FFFFFF', borderRadius: '12px 12px 0 0' }}>
        <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.15)', mb: 1.5 }}><ShieldIcon sx={{ fontSize: 38, color: '#FFFFFF' }} /></Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF' }}>Sistema EBR / BPM</Typography>
        <Typography variant="body2" sx={{ color: '#BFDBFE', mt: .5 }}>Portal único de evaluación sanitaria</Typography>
      </Box>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: .5 }}>Iniciar sesión</Typography>
        <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>Ingrese las credenciales administradas por el Core EBR/BPM.</Typography>
        {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
        <Box component="form" onSubmit={submit} noValidate>
          <Typography variant="subtitle2" sx={{ mb: .75 }}>Correo electrónico</Typography>
          <TextField fullWidth autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting}
            slotProps={{ htmlInput: { 'aria-label': 'Correo electrónico' }, input: { startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#94A3B8' }} /></InputAdornment> } }} sx={{ mb: 2.5 }} />
          <Typography variant="subtitle2" sx={{ mb: .75 }}>Contraseña</Typography>
          <TextField fullWidth autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting}
            slotProps={{ htmlInput: { 'aria-label': 'Contraseña' }, input: {
              startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#94A3B8' }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><IconButton aria-label="Mostrar u ocultar contraseña" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
            } }} sx={{ mb: 3 }} />
          <Box sx={{ textAlign: 'right' }}><Button size="small" onClick={() => navigate('/recuperar-clave')}>¿Olvidó su contraseña?</Button></Box>
          <Button type="submit" fullWidth variant="contained" disabled={submitting} sx={{ mt: 2, py: 1.3 }}>{submitting ? 'Verificando…' : 'Acceder al sistema'}</Button>
        </Box>
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Typography variant="body2">¿Aún no tiene cuenta empresarial? <Button size="small" onClick={() => navigate('/registro')}>Consulte el registro</Button></Typography>
          <Button size="small" onClick={() => navigate('/acceso-sin-conexion')} sx={{ mt: 1 }}>Abrir trabajo de campo sin conexión</Button>
        </Box>
      </CardContent>
    </Card>
  </Box>
}
