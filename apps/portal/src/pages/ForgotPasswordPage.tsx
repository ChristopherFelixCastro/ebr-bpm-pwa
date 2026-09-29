import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import { core } from '../api/core'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) { setError('Ingrese su correo electrónico.'); return }
    setBusy(true); setError('')
    try {
      await core.request<{ requested: boolean }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) })
      setSubmitted(true)
    } catch { setError('No fue posible registrar la petición.') }
    finally { setBusy(false) }
  }
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#fffbeb', p: 2 }}>
    <Card sx={{ maxWidth: 480, width: '100%' }}>
      <Box sx={{ p: 3, bgcolor: '#78350f', color: 'white', textAlign: 'center' }}><LockResetIcon sx={{ fontSize: 40 }} /><Typography variant="h6" sx={{ color: 'white' }}>Recuperación de contraseña</Typography></Box>
      <CardContent sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {submitted ? <Alert severity="info" sx={{ mb: 2 }}>Si existe una cuenta activa con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también la carpeta de correo no deseado.</Alert>
          : <Box component="form" onSubmit={submit}>
              <Typography sx={{ mb: 2 }}>Indica el correo de tu cuenta. Si está activa, recibirás un enlace válido durante 30 minutos.</Typography>
              <TextField fullWidth label="Correo electrónico" type="email" value={email} onChange={(event) => setEmail(event.target.value)} sx={{ mb: 2 }} />
              <Button type="submit" fullWidth variant="contained" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</Button>
            </Box>}
        <Button onClick={() => navigate('/login')} sx={{ mt: 2 }}>Volver al inicio de sesión</Button>
      </CardContent>
    </Card>
  </Box>
}
