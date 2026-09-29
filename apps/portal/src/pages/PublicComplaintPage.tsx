import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Container, FormControlLabel, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { core } from '../api/core'
import { supportMessage } from '../api/presentation'
import { PublicHeader } from './PublicLandingPage'

type ContactMethod = 'PHONE' | 'EMAIL'

export function PublicComplaintPage() {
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<ContactMethod>('EMAIL')
  const [sending, setSending] = useState(false)
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!type.trim() || !description.trim()) return setError('Complete el tipo de denuncia y la descripción.')
    if (contact && !(method === 'PHONE' ? phone.trim() : email.trim())) return setError('Indique el medio de contacto que seleccionó.')
    setSending(true); setError('')
    try {
      const complainantData = contact ? {
        ...(name.trim() ? { fullName: name.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        preferredContactMethod: method,
      } : undefined
      const result = await core.request<{ reference: string }>('/v1/public/complaints', {
        method: 'POST',
        body: JSON.stringify({ complaintType: type.trim(), description: description.trim(), ...(complainantData ? { complainantData } : {}) }),
      })
      setReference(result.data.reference)
    } catch (cause) { setError(supportMessage(cause, 'No se pudo enviar la denuncia. Inténtelo de nuevo.')) }
    finally { setSending(false) }
  }

  return <Box sx={{ minHeight: '100vh', bgcolor: '#fffbeb' }}>
    <PublicHeader />
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Button component={RouterLink} to="/" sx={{ mb: 3, textTransform: 'none' }}>← Volver al inicio</Button>
      <Typography component="h1" variant="h3" sx={{ fontWeight: 900, mb: 1 }}>Presentar una denuncia</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Describa una situación relacionada con un establecimiento, alimento o bebida. El equipo responsable revisará la información recibida.</Typography>
      {reference ? <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>Denuncia recibida para revisión.</Alert>
        <Typography>Guarde esta referencia:</Typography>
        <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere', my: 1 }}>{reference}</Typography>
        <Typography color="text.secondary">La referencia identifica el envío. Este portal todavía no ofrece una consulta pública del estado.</Typography>
        <Button component={RouterLink} to="/" sx={{ mt: 3, textTransform: 'none' }}>Volver al inicio</Button>
      </Paper> : <Paper component="form" onSubmit={submit} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>Lo que desea informar</Typography><Typography color="text.secondary">No incluya contraseñas ni datos sensibles que no sean necesarios para describir el hecho.</Typography></Box>
          <TextField label="Tipo de denuncia" value={type} onChange={(event) => setType(event.target.value)} required fullWidth slotProps={{ htmlInput: { maxLength: 120 } }} helperText="Por ejemplo: condiciones del establecimiento, manipulación de alimentos o calidad del agua." />
          <TextField label="Descripción de lo sucedido" value={description} onChange={(event) => setDescription(event.target.value)} required fullWidth multiline minRows={6} slotProps={{ htmlInput: { maxLength: 5000 } }} helperText="Indique dónde ocurrió, cuándo lo observó y qué sucedió. Máximo 5,000 caracteres." />
          <Box sx={{ borderTop: '1px solid #fde68a', pt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Datos de contacto</Typography>
            <RadioGroup value={contact ? 'contacto' : 'anonima'} onChange={(event) => setContact(event.target.value === 'contacto')}>
              <FormControlLabel value="anonima" control={<Radio />} label="Enviar de forma anónima" />
              <FormControlLabel value="contacto" control={<Radio />} label="Dejar un contacto voluntario" />
            </RadioGroup>
          </Box>
          {contact && <Stack spacing={2}>
            <TextField label="Nombre (opcional)" value={name} onChange={(event) => setName(event.target.value)} fullWidth slotProps={{ htmlInput: { maxLength: 200 } }} />
            <TextField label="Medio de contacto preferido" select value={method} onChange={(event) => setMethod(event.target.value as ContactMethod)} fullWidth><MenuItem value="EMAIL">Correo electrónico</MenuItem><MenuItem value="PHONE">Teléfono</MenuItem></TextField>
            <TextField label="Correo electrónico" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required={method === 'EMAIL'} fullWidth slotProps={{ htmlInput: { maxLength: 320 } }} />
            <TextField label="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} required={method === 'PHONE'} fullWidth slotProps={{ htmlInput: { maxLength: 40 } }} />
          </Stack>}
          <Alert severity="info">El formulario no admite archivos por ahora. Si deja un contacto, se conservará con la denuncia para su revisión.</Alert>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <Button type="submit" variant="contained" disabled={sending} size="large" sx={{ borderRadius: 99, alignSelf: 'flex-start', px: 4, textTransform: 'none' }}>{sending ? 'Enviando…' : 'Enviar denuncia'}</Button>
        </Stack>
      </Paper>}
    </Container>
  </Box>
}
