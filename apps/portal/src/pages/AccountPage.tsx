import { useState, type FormEvent } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined'
import type { CoreRole } from '@ebr-bpm/core-client'
import { roleLabels } from '../api/users'
import { useSession } from '../session/SessionContext'

const roleScope: Record<CoreRole, string> = {
  UNIVERSAL: 'Supervisa la operación institucional y administra las cuentas y definiciones del sistema.',
  ADMIN: 'Administra cuentas, casos y el seguimiento de la operación sanitaria.',
  COORDINATOR: 'Coordina casos, documentos, asignaciones y la agenda de inspecciones.',
  EVALUATOR: 'Realiza las inspecciones asignadas y atiende las correcciones de sus evaluaciones.',
  COMPANY_ADMIN: 'Administra los datos de su empresa y presenta solicitudes BPM dentro de ella.',
  DELEGATE: 'Consulta la información de su empresa y gestiona sus solicitudes BPM.',
}

function Detail({ label, value }: { label: string; value: string }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
    <Typography sx={{ fontWeight: 650, overflowWrap: 'anywhere' }}>{value}</Typography>
  </Box>
}

export function AccountPage() {
  const { user, reauthenticate, offlineEnrollmentError, recoverOfflineVault } = useSession()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [password, setPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('busy')
    try { await reauthenticate(password); setPassword(''); setStatus('ok'); setShowConfirmation(false) }
    catch { setStatus('error') }
  }
  if (!user) return null
  const fieldRole = user.roleCode === 'EVALUATOR' || user.roleCode === 'UNIVERSAL'
  const companyRole = user.roleCode === 'COMPANY_ADMIN' || user.roleCode === 'DELEGATE'
  return <Stack spacing={3} sx={{ maxWidth: 1080, pb: 4 }}>
    <Box>
      <Typography component="h1" variant="h4" sx={{ fontWeight: 850 }}>Mi cuenta</Typography>
      <Typography color="text.secondary">Consulte sus datos, el alcance de su rol y la seguridad de su acceso.</Typography>
    </Box>

    <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ height: 8, background: 'linear-gradient(90deg, #78350f, #d97706, #fbbf24)' }} />
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: '#fef3c7', color: '#78350f', fontSize: 26, fontWeight: 800 }} aria-hidden="true">
            {user.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || <AccountCircleOutlinedIcon />}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" variant="h5" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{user.fullName}</Typography>
            <Typography color="text.secondary">{roleLabels[user.roleCode]}</Typography>
          </Box>
          <Chip icon={<VerifiedUserOutlinedIcon />} label={user.status === 'APPROVED' ? 'Cuenta activa' : 'Estado de cuenta no disponible'} color={user.status === 'APPROVED' ? 'success' : 'default'} variant="outlined" />
        </Stack>
      </CardContent>
    </Card>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
      <Card sx={{ borderRadius: 3 }}><CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}><AccountCircleOutlinedIcon color="primary" /><Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>Datos de la cuenta</Typography></Stack>
        <Stack spacing={2.5}>
          <Detail label="Nombre completo" value={user.fullName} />
          <Divider />
          <Detail label="Correo electrónico" value={user.email || 'No disponible'} />
          <Divider />
          <Detail label="Teléfono" value={user.phone || 'No registrado'} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>Si algún dato necesita corrección, solicítela a la administración de cuentas.</Typography>
      </CardContent></Card>

      <Card sx={{ borderRadius: 3 }}><CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}><BusinessOutlinedIcon color="primary" /><Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>Acceso y permisos</Typography></Stack>
        <Detail label="Rol asignado" value={roleLabels[user.roleCode]} />
        <Typography sx={{ mt: 1.5, lineHeight: 1.65 }}>{roleScope[user.roleCode]}</Typography>
        {companyRole && <><Divider sx={{ my: 2.5 }} /><Detail label="Empresa vinculada" value={user.companyName || (user.companyId ? 'Empresa activa vinculada' : 'Sin empresa activa vinculada')} />
          {!user.companyId && <Alert severity="info" sx={{ mt: 2 }}>La administración debe vincular su cuenta a una empresa activa para habilitar las operaciones empresariales.</Alert>}</>}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>Cada operación también se comprueba según la empresa, la asignación y el estado del registro.</Typography>
      </CardContent></Card>
    </Box>

    <Card sx={{ borderRadius: 3 }}><CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}><LockOutlinedIcon color="primary" /><Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>Seguridad</Typography></Stack>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Su sesión ya está iniciada. Algunas operaciones sensibles le pedirán confirmar su identidad al realizarlas.</Typography>
      {status === 'ok' && <Alert severity="success" sx={{ mb: 2 }}>Identidad confirmada.</Alert>}
      {status === 'error' && <Alert severity="error" sx={{ mb: 2 }}>No fue posible confirmar su identidad. Compruebe la contraseña e inténtelo de nuevo.</Alert>}
      {!showConfirmation ? <Button variant="outlined" onClick={() => { setStatus('idle'); setShowConfirmation(true) }}>Confirmar identidad ahora</Button> :
        <Box component="form" onSubmit={submit} sx={{ maxWidth: 450 }}>
          <TextField fullWidth label="Contraseña actual" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} sx={{ mb: 2 }} />
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={!password || status === 'busy'}>Confirmar identidad</Button>
            <Button onClick={() => { setPassword(''); setStatus('idle'); setShowConfirmation(false) }}>Cancelar</Button>
          </Stack>
        </Box>}
    </CardContent></Card>

    {fieldRole && <Card sx={{ borderRadius: 3 }}><CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}><WifiOffOutlinedIcon color="primary" /><Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>Trabajo sin conexión</Typography></Stack>
      <Typography color="text.secondary">Las inspecciones preparadas en este dispositivo se guardan cifradas. Puede continuarlas sin conexión y enviarlas cuando vuelva a estar disponible.</Typography>
      {offlineEnrollmentError && <Box sx={{ mt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>El trabajo local sigue cifrado con una contraseña anterior. Para recuperar el acceso, confirme la contraseña anterior y la actual. Si no conoce la anterior, conserve este dispositivo y contacte soporte.</Alert>
        {recoveryError && <Alert severity="error" sx={{ mb: 2 }}>{recoveryError}</Alert>}
        <Box component="form" onSubmit={(event) => { event.preventDefault(); void recoverOfflineVault(oldPassword, currentPassword).then(() => { setOldPassword(''); setCurrentPassword(''); setRecoveryError('') }).catch((error: Error) => setRecoveryError(error.message)) }} sx={{ maxWidth: 450 }}>
          <TextField fullWidth label="Contraseña anterior del trabajo local" type="password" autoComplete="off" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Contraseña actual" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" disabled={!oldPassword || !currentPassword}>Recuperar trabajo local</Button>
        </Box>
      </Box>}
    </CardContent></Card>}
  </Stack>
}
