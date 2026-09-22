import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { ApiError } from '../../api/http'
import { useAuth } from '../../context/useAuth'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
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
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'No fue posible iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f4f6f8', p: 2 }}>
      <Card sx={{ maxWidth: 460, width: '100%', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,.08)' }}>
        <Box sx={{ p: 3.5, textAlign: 'center', bgcolor: '#0b2545', color: '#ffffff', borderRadius: '12px 12px 0 0' }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,.15)', mb: 1.5 }}>
            <AltRouteIcon sx={{ fontSize: 38, color: '#ffffff' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff' }}>
            EBR / BPM
          </Typography>
          <Typography variant="body2" sx={{ color: '#bfdbfe', mt: 0.5 }}>
            Portal de Coordinación y Asignaciones
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
            Ingrese con sus credenciales de Coordinador o Administrador.
          </Typography>
          {errorMessage && <Alert severity="error" sx={{ mb: 2.5 }}>{errorMessage}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 1,
                py: 1.3,
                bgcolor: '#0b2545',
                '&:hover': { bgcolor: '#134074' },
                fontWeight: 600,
              }}
            >
              {loading ? 'Accediendo...' : 'Iniciar Sesión'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
