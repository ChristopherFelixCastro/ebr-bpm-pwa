import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, List, ListItemButton, ListItemText, MenuItem, TextField, Typography } from '@mui/material'
import { availableOfflineIdentities, listOfflinePackages, openOfflinePackage, type OfflineIdentity } from '../offline/vault'
import { useSession } from '../session/SessionContext'

export function OfflineAccessPage() {
  const { offlineUser, unlockOffline } = useSession()
  const [identities, setIdentities] = useState<OfflineIdentity[]>([])
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { void availableOfflineIdentities().then(setIdentities).catch(() => setError('No se pudo leer el almacenamiento local.')) }, [])
  if (offlineUser) return <Navigate to="/campo/paquetes" replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try { await unlockOffline(userId, password) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo desbloquear el trabajo local.') }
    finally { setBusy(false); setPassword('') }
  }
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
    <Card sx={{ width: '100%', maxWidth: 520 }}><CardContent sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Trabajo de campo sin conexión</Typography>
      <Typography sx={{ mb: 2 }}>Los paquetes guardados en este origen se abren con la contraseña de la cuenta evaluadora que los descargó. La clave solo permanece en memoria durante esta sesión.</Typography>
      {navigator.onLine && <Alert severity="info" sx={{ mb: 2 }}>Si Core está disponible, inicie sesión normalmente para validar su cuenta.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {identities.length ? <Box component="form" onSubmit={submit}>
        <TextField select fullWidth label="Cuenta evaluadora" value={userId} onChange={(event) => setUserId(event.target.value)} sx={{ mb: 2 }}>
          {identities.map((identity) => <MenuItem key={identity.id} value={identity.id}>{identity.fullName}</MenuItem>)}
        </TextField>
        <TextField fullWidth label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} sx={{ mb: 2 }} />
        <Button fullWidth type="submit" variant="contained" disabled={!userId || !password || busy}>Desbloquear paquetes</Button>
      </Box> : <Alert severity="warning">No hay cuentas evaluadoras habilitadas localmente en este origen. Primero inicie sesión con conexión.</Alert>}
      <Button component={Link} to="/login" sx={{ mt: 2 }}>Volver al inicio de sesión</Button>
    </CardContent></Card>
  </Box>
}

export function OfflinePackagesPage() {
  const { offlineUser, lockOffline } = useSession()
  const navigate = useNavigate()
  const [packageIds, setPackageIds] = useState<string[]>([])
  const [opened, setOpened] = useState<{ id: string; content: unknown } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!offlineUser) return
    void listOfflinePackages(offlineUser.id).then(setPackageIds).catch(() => setError('No se pudieron leer los paquetes.'))
  }, [offlineUser])
  if (!offlineUser) return <Navigate to="/acceso-sin-conexion" replace />
  const open = async (id: string) => {
    setError('')
    try { setOpened({ id, content: await openOfflinePackage(offlineUser.id, id) }) }
    catch { setError('No se pudo abrir este paquete.') }
  }
  return <Box sx={{ p: 4, maxWidth: 800 }}>
    <Typography variant="h4" sx={{ mb: 1 }}>Paquetes locales</Typography>
    <Typography sx={{ mb: 2 }}>Cuenta: {offlineUser.fullName}</Typography>
    <Alert severity="info" sx={{ mb: 3 }}>Vista local de solo lectura. La edición y sincronización de inspecciones se integrarán en una entrega posterior.</Alert>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {packageIds.length ? <List>{packageIds.map((id) => <ListItemButton key={id} onClick={() => void open(id)}><ListItemText primary={id} secondary="Abrir paquete cifrado" /></ListItemButton>)}</List>
      : <Typography>No hay paquetes descargados para esta cuenta en este origen.</Typography>}
    {opened && <Card sx={{ mt: 3 }}><CardContent>
      <Typography variant="h6" sx={{ mb: 2 }}>Paquete {opened.id}</Typography>
      <Box component="pre" sx={{ overflow: 'auto', maxHeight: 420, fontSize: 12 }}>{JSON.stringify(opened.content, null, 2)}</Box>
    </CardContent></Card>}
    <Button onClick={() => { lockOffline(); navigate('/acceso-sin-conexion', { replace: true }) }} sx={{ mt: 3 }}>Bloquear y salir</Button>
  </Box>
}
