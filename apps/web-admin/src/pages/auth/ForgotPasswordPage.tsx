import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
} from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { authApi } from '../../api/auth'
import { useNotification } from '../../context/NotificationContext'
import { supportMessage } from '../../api/presentation'

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [requestedSuccess, setRequestedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Por favor ingrese su correo electrónico registrado.')
      return
    }
    setError(null)
    setLoading(true)

    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      showSuccess('Solicitud enviada exitosamente.')
      setRequestedSuccess(true)
    } catch (err: unknown) {
      const msg = supportMessage(err, 'No fue posible tramitar la solicitud.')
      setError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          <LockResetIcon sx={{ fontSize: 40, mb: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Recuperación de Contraseña
          </Typography>
          <Typography variant="caption" sx={{ color: '#BFDBFE' }}>
            Portal Web EBR/BPM - Módulo de Identidad
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {requestedSuccess ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: '#DCFCE7',
                  color: '#15803D',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                Solicitud Procesada
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                Si el correo <strong>{email}</strong> se encuentra registrado en el sistema oficial EBR/BPM, recibirá instrucciones de seguridad para restablecer su acceso.
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#F8FAFC', textAlign: 'left' }}>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  Por motivos de seguridad y privacidad, el sistema no confirma públicamente la existencia de cuentas individuales. Si necesita asistencia inmediata, comuníquese con el Administrador Central de su entidad.
                </Typography>
              </Paper>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/login')}
                sx={{ py: 1.2, bgcolor: '#1E3A8A', textTransform: 'none' }}
              >
                Volver a Iniciar Sesión
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRequest} noValidate>
              <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                Ingrese su correo institucional o corporativo registrado para tramitar el restablecimiento seguro de su contraseña.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Correo Electrónico
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="ejemplo@empresa.com.do"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ py: 1.2, bgcolor: '#1E3A8A', textTransform: 'none', '&:hover': { bgcolor: '#1E40AF' } }}
              >
                {loading ? 'Enviando...' : 'Solicitar Restablecimiento'}
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="text"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/login')}
                  sx={{ color: '#475569', fontSize: '0.85rem', textTransform: 'none' }}
                >
                  Volver a Iniciar Sesión
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
