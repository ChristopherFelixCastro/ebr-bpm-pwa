import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, IconButton, InputAdornment,
  TextField, Typography,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import ShieldIcon from '@mui/icons-material/Shield'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { ApiError } from '../../api/http'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showSuccess } = useNotification()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setErrorMessage('Ingrese su correo electrónico y contraseña.')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      await login(email, password)
      showSuccess('Inicio de sesión exitoso')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'No fue posible iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F8FAFC', p: 2 }}>
      <Card sx={{ maxWidth: 480, width: '100%', borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,.08)' }}>
        <Box sx={{ p: 3.5, textAlign: 'center', bgcolor: '#1E3A8A', color: '#FFFFFF', borderRadius: '12px 12px 0 0' }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.15)', mb: 1.5 }}>
            <ShieldIcon sx={{ fontSize: 38, color: '#FFFFFF' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF' }}>Sistema EBR / BPM</Typography>
          <Typography variant="body2" sx={{ color: '#BFDBFE', mt: .5 }}>Portal de Identidad, Empresas y Solicitudes</Typography>
        </Box>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: .5 }}>Iniciar sesión</Typography>
          <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>Ingrese las credenciales administradas por el Core EBR/BPM.</Typography>
          {errorMessage && <Alert severity="error" sx={{ mb: 2.5 }}>{errorMessage}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="subtitle2" sx={{ mb: .75 }}>Correo electrónico</Typography>
            <TextField
              fullWidth
              autoComplete="username"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#94A3B8' }} /></InputAdornment> } }}
              sx={{ mb: 2.5 }}
            />
            <Typography variant="subtitle2" sx={{ mb: .75 }}>Contraseña</Typography>
            <TextField
              fullWidth
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              slotProps={{ input: {
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#94A3B8' }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton aria-label="Mostrar u ocultar contraseña" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              } }}
              sx={{ mb: 3 }}
            />
            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ py: 1.3, bgcolor: '#1E3A8A' }}>
              {loading ? 'Verificando…' : 'Acceder al sistema'}
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 3 }}>Registro público y recuperación de contraseña: módulos en integración.</Alert>
        </CardContent>
      </Card>
    </Box>
  )
}
