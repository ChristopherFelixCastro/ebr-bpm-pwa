import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material'
import { useSession } from '../session/SessionContext'

export function AccountPage() {
  const { user, reauthenticate } = useSession()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('busy')
    try { await reauthenticate(password); setPassword(''); setStatus('ok') }
    catch { setStatus('error') }
  }
  return <Box sx={{ maxWidth: 620 }}>
    <Typography variant="h4" sx={{ mb: 3 }}>Mi cuenta</Typography>
    <Card><CardContent>
      <Typography variant="h6">{user?.fullName}</Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>Rol: {user?.roleCode}</Typography>
      <Typography variant="h6" sx={{ mb: 1 }}>Confirmar identidad</Typography>
      <Typography sx={{ mb: 2 }}>Algunas acciones del Core exigen volver a escribir su contraseña. Esta verificación renueva la autenticación de la misma sesión.</Typography>
      {status === 'ok' && <Alert severity="success" sx={{ mb: 2 }}>Identidad confirmada.</Alert>}
      {status === 'error' && <Alert severity="error" sx={{ mb: 2 }}>No fue posible confirmar su identidad.</Alert>}
      <Box component="form" onSubmit={submit}>
        <TextField fullWidth label="Contraseña actual" type="password" autoComplete="current-password" value={password}
          onChange={(event) => setPassword(event.target.value)} sx={{ mb: 2 }} />
        <Button type="submit" variant="contained" disabled={!password || status === 'busy'}>Confirmar identidad</Button>
      </Box>
    </CardContent></Card>
  </Box>
}
