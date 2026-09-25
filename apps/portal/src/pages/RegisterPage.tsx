import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { registerAccount, validateLetterFile, type RegistrationInput } from '../api/users'
import { supportMessage } from '../api/presentation'

type Form = Omit<RegistrationInput, 'authorizationLetter'> & { confirmPassword: string }
const emptyForm: Form = { fullName: '', email: '', phone: '', password: '', confirmPassword: '', roleCode: 'COMPANY_ADMIN' }

// Registro público: Core crea la cuenta en PENDING_VALIDATION con su carta de autorización y no abre sesión.
export function RegisterPage() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [letter, setLetter] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const pickLetter = (file: File | undefined) => {
    if (!file) return
    const problem = validateLetterFile(file)
    setError(problem ?? ''); setLetter(problem ? null : file)
  }
  const submit = async () => {
    if (!form.fullName.trim() || !form.email.trim()) return setError('Nombre y correo son obligatorios.')
    if (form.password.length < 12) return setError('La contraseña debe tener al menos 12 caracteres.')
    if (form.password !== form.confirmPassword) return setError('Las contraseñas no coinciden.')
    if (!letter) return setError('Adjunte la carta de autorización de la cuenta.')
    setSending(true); setError('')
    try {
      const { confirmPassword: _confirm, ...input } = form
      await registerAccount({ ...input, authorizationLetter: letter })
      setDone(true)
    } catch (failure) { setError(supportMessage(failure, 'No fue posible registrar la cuenta.')) }
    finally { setSending(false) }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#F8FAFC', p: 2 }}>
    <Card sx={{ maxWidth: 640, width: '100%' }}>
      <Box sx={{ p: 3, bgcolor: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', gap: 2 }}>
        <ShieldIcon /><Typography variant="h6" sx={{ color: 'white' }}>Registro de cuenta empresarial</Typography>
      </Box>
      <CardContent sx={{ p: 4 }}>
        {done ? <Stack spacing={2}>
          <Alert severity="success">Solicitud de cuenta registrada.</Alert>
          <Typography>La cuenta quedó pendiente de validación. La administración revisará su carta de autorización y vinculará la cuenta con su empresa; podrá iniciar sesión cuando sea aprobada.</Typography>
          <Box><Button variant="contained" onClick={() => navigate('/login')}>Volver al inicio de sesión</Button></Box>
        </Stack> : <Stack spacing={2}>
          <Typography color="text.secondary">Para aprobar la cuenta se requiere la carta de autorización de la persona solicitante, firmada por la empresa.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nombre completo" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <TextField label="Correo electrónico" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <TextField label="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <TextField select label="Tipo de cuenta" value={form.roleCode} onChange={(event) => setForm({ ...form, roleCode: event.target.value as Form['roleCode'] })}>
            <MenuItem value="COMPANY_ADMIN">Administrador de empresa</MenuItem>
            <MenuItem value="DELEGATE">Delegado de empresa</MenuItem>
          </TextField>
          <TextField label="Contraseña" type="password" required value={form.password} helperText="Mínimo 12 caracteres." onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <TextField label="Confirmar contraseña" type="password" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
          <Box>
            <input ref={fileInput} type="file" hidden accept="application/pdf,image/jpeg,image/png" onChange={(event) => { pickLetter(event.target.files?.[0]); event.target.value = '' }} />
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>{letter ? 'Cambiar carta' : 'Adjuntar carta de autorización'}</Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{letter ? `${letter.name} (${Math.max(1, Math.round(letter.size / 1024))} KB)` : 'PDF, JPG o PNG de hasta 5 MB.'}</Typography>
          </Box>
          <Alert severity="info">La vinculación con su empresa la realiza la administración durante la validación de la cuenta.</Alert>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={sending} onClick={() => void submit()}>Enviar solicitud</Button>
            <Button onClick={() => navigate('/login')} disabled={sending}>Cancelar</Button>
          </Stack>
        </Stack>}
      </CardContent>
    </Card>
  </Box>
}
