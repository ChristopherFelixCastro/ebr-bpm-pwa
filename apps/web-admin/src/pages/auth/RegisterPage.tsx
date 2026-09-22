import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  Paper,
  IconButton,
} from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { authApi } from '../../api/auth'
import { useNotification } from '../../context/NotificationContext'
import { supportMessage } from '../../api/presentation'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [roleCode, setRoleCode] = useState<'COMPANY_ADMIN' | 'DELEGATE'>('COMPANY_ADMIN')
  const [companyName, setCompanyName] = useState('')
  const [authFile, setAuthFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('La carta de autorización no puede superar los 5 MB.')
        return
      }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png']
      if (!allowed.includes(file.type)) {
        setErrorMessage('Formato no válido. Solo se admiten documentos PDF o imágenes JPG/PNG.')
        return
      }
      setErrorMessage(null)
      setAuthFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Form validations
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Por favor complete todos los campos obligatorios marcados con (*).')
      return
    }

    if (password.length < 12) {
      setErrorMessage('La contraseña debe tener al menos 12 caracteres según la política de seguridad.')
      return
    }

    if (!authFile) {
      setErrorMessage('Es obligatorio adjuntar la Carta de Autorización o Poder Notariado de la empresa (máx. 5 MB).')
      return
    }

    try {
      setLoading(true)
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        roleCode,
      })

      showSuccess('Solicitud de registro enviada con éxito')
      setRegisteredSuccess(true)
    } catch (err: unknown) {
      const msg = supportMessage(err, 'Error al procesar el registro.')
      setErrorMessage(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (registeredSuccess) {
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
            maxWidth: 540,
            width: '100%',
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #E2E8F0',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#DCFCE7',
              color: '#15803D',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 42 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
            Registro en Proceso de Validación
          </Typography>
          <Typography variant="body1" sx={{ color: '#475569', mb: 3 }}>
            Su solicitud de cuenta con rol <strong>{roleCode === 'COMPANY_ADMIN' ? 'Administrador de Empresa' : 'Delegado de Empresa'}</strong> ha sido registrada con estado{' '}
            <strong style={{ color: '#D97706' }}>PENDIENTE_VALIDACION</strong>.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#F8FAFC', textAlign: 'left' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              Pasos siguientes:
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              1. Un Administrador Central evaluará su Carta de Autorización y asignará su alcance empresarial.
              <br />
              2. Una vez aprobada la validación en el Core, podrá acceder con sus credenciales institucionales.
            </Typography>
          </Paper>

          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/login')}
            sx={{ px: 4, py: 1.2, bgcolor: '#1E3A8A' }}
          >
            Volver a Iniciar Sesión
          </Button>
        </Card>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        py: 4,
        px: 2,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Card
        sx={{
          maxWidth: 720,
          width: '100%',
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <ShieldIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              Registro de Usuario y Empresa
            </Typography>
            <Typography variant="caption" sx={{ color: '#BFDBFE' }}>
              Portal Web EBR/BPM - Módulo de Identidad
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
              1. Datos Personales del Solicitante
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Nombre Completo *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Ing. Manuel Morales"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Correo Electrónico Corporativo *
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="usuario@empresa.com.do"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Teléfono de Contacto
                </Typography>
                <TextField
                  fullWidth
                  placeholder="(809) 555-1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Contraseña Segura *
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder="Mínimo 12 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Mínimo 12 caracteres (política Core EBR/BPM)"
                  required
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
              2. Rol y Empresa Representada
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Rol Solicitado *
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value as 'COMPANY_ADMIN' | 'DELEGATE')}
                >
                  <MenuItem value="COMPANY_ADMIN">Administrador de Empresa (Gestor Principal)</MenuItem>
                  <MenuItem value="DELEGATE">Usuario Delegado (Representante de Sede)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Razón Social de la Empresa *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Industrias Lácteas Dominicanas, S.R.L."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  helperText="Se asociará durante la validación del Administrador"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
              3. Carta de Autorización Obligatoria
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
              Debe adjuntar la Carta de Designación o Poder Notariado firmado por el Representante Legal que acredita su facultad para radicar trámites BPM en nombre de la empresa.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: '#F8FAFC' }}>
              {authFile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InsertDriveFileIcon sx={{ color: '#1E3A8A', fontSize: 32 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        {authFile.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {(authFile.size / 1024).toFixed(1)} KB · Documento cargado
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton color="error" onClick={() => setAuthFile(null)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#CBD5E1', color: '#1E3A8A' }}
                  >
                    Seleccionar Carta de Autorización (PDF, JPG, PNG)
                    <input
                      type="file"
                      hidden
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                    />
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748B' }}>
                    Máximo 5 MB por archivo.
                  </Typography>
                </Box>
              )}
            </Paper>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/login')}
                sx={{ textTransform: 'none' }}
              >
                Volver al Login
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  px: 4,
                  py: 1.2,
                  bgcolor: '#1E3A8A',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#1E40AF' },
                }}
              >
                {loading ? 'Procesando...' : 'Enviar Solicitud de Registro'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
