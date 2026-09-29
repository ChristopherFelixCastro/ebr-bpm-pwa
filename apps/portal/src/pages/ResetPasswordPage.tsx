import { useEffect, useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import { core } from '../api/core'

export function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', '/restablecer-clave')
  }, [token])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 12) return setError('La contraseña debe tener al menos 12 caracteres.')
    if (password !== confirmation) return setError('Las contraseñas no coinciden.')
    setBusy(true); setError('')
    try {
      await core.request('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      setDone(true)
    } catch { setError('El enlace no es válido o caducó. Solicita uno nuevo.') }
    finally { setBusy(false) }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#fffbeb', p: 2 }}>
    <Card sx={{ maxWidth: 480, width: '100%' }}>
      <Box sx={{ p: 3, bgcolor: '#78350f', color: 'white', textAlign: 'center' }}><LockResetIcon sx={{ fontSize: 40 }} /><Typography variant="h6" sx={{ color: 'white' }}>Nueva contraseña</Typography></Box>
      <CardContent sx={{ p: 4 }}>
        {done ? <Stack spacing={2}><Alert severity="success">Contraseña actualizada. Vuelve a iniciar sesión.</Alert><Button component={RouterLink} to="/login" variant="contained">Ir al inicio de sesión</Button></Stack>
          : !token ? <Stack spacing={2}><Alert severity="warning">Falta el enlace de recuperación. Solicita uno nuevo.</Alert><Button component={RouterLink} to="/recuperar-clave">Solicitar enlace</Button></Stack>
            : <Box component="form" onSubmit={submit}>
              <Typography sx={{ mb: 2 }}>Escribe una nueva contraseña para tu cuenta.</Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField fullWidth label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="Confirmar contraseña" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} sx={{ mb: 2 }} />
              <Button type="submit" fullWidth variant="contained" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</Button>
            </Box>}
      </CardContent>
    </Card>
  </Box>
}
