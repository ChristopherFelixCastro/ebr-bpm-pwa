import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  CoreClient,
  type CoreAssignment,
  type CoreCase,
  type CoreSchedule,
  type CoreUser,
} from '@ebr-bpm/core-client'

const initialUrl = import.meta.env.VITE_CORE_API_URL || 'http://127.0.0.1:3000'

function date(value: string) {
  return new Date(value).toLocaleString('es-DO')
}

export default function CoreIntegrationPage() {
  const [url, setUrl] = useState(initialUrl)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [client, setClient] = useState<CoreClient | null>(null)
  const [user, setUser] = useState<CoreUser | null>(null)
  const [cases, setCases] = useState<CoreCase[]>([])
  const [assignments, setAssignments] = useState<CoreAssignment[]>([])
  const [schedules, setSchedules] = useState<CoreSchedule[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  async function checkConnection() {
    setBusy(true)
    setError(null)
    setConnected(false)
    setUser(null)
    setCases([])
    setAssignments([])
    setSchedules([])
    try {
      const next = new CoreClient(url)
      await next.health()
      setClient(next)
      setConnected(true)
    } catch (cause) {
      setClient(null)
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar al Core.')
    } finally {
      setBusy(false)
    }
  }

  async function loadData(activeClient: CoreClient) {
    const [caseResult, assignmentResult, scheduleResult] = await Promise.all([
      activeClient.cases(),
      activeClient.assignments(),
      activeClient.schedules(),
    ])
    setCases(caseResult.data)
    setAssignments(assignmentResult.data)
    setSchedules(scheduleResult.data)
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    setBusy(true)
    setError(null)
    try {
      const currentUser = await client.login(email, password)
      setPassword('')
      setUser(currentUser)
      await loadData(client)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el Core.')
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    if (!client) return
    setBusy(true)
    setError(null)
    try {
      await loadData(client)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 750, color: '#172033', textAlign: 'left' }} gutterBottom>Coordinación conectada al Core</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Datos reales del contrato publicado en main: casos institucionales, asignaciones y agenda.
        Las demás pantallas del portal conservan sus datos de demostración.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: { lg: 'center' } }}>
            <TextField label="URL de la API Core" value={url} onChange={(event) => setUrl(event.target.value)}
              fullWidth size="small" disabled={busy || Boolean(user)} />
            <Button variant="outlined" onClick={checkConnection} disabled={busy || Boolean(user)}
              sx={{ whiteSpace: 'nowrap', minWidth: 190, flexShrink: 0 }}>Comprobar conexión</Button>
            <Chip label={connected ? 'Core disponible' : 'Core sin conectar'}
              color={connected ? 'success' : 'default'} sx={{ flexShrink: 0 }} />
          </Stack>
          {connected && !user && (
            <Box component="form" onSubmit={signIn} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Correo institucional" type="email" autoComplete="username" required
                  value={email} onChange={(event) => setEmail(event.target.value)} size="small" />
                <TextField label="Contraseña" type="password" autoComplete="current-password" required
                  value={password} onChange={(event) => setPassword(event.target.value)} size="small" />
                <Button type="submit" variant="contained" disabled={busy}>Ingresar al Core</Button>
              </Stack>
            </Box>
          )}
          {user && (
            <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
              <Chip label={user.role} color="primary" size="small" />
              <Typography variant="body2">Sesión en memoria para esta pestaña</Typography>
              <Button onClick={refresh} disabled={busy}>Actualizar</Button>
              <Button onClick={() => {
                client?.disconnect()
                setUser(null)
                setCases([])
                setAssignments([])
                setSchedules([])
              }}>Desconectar</Button>
            </Stack>
          )}
          {busy && <CircularProgress size={22} sx={{ mt: 2 }} />}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>

      {user && (
        <Stack spacing={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="h6">Casos institucionales ({cases.length})</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              El Core entrega referencias e identificadores; las pantallas de demostración muestran nombres semilla.
            </Typography>
            {cases.length === 0 && <Typography>Sin casos registrados.</Typography>}
            {cases.map((item) => (
              <Box key={item.id} sx={{ py: 1.5, borderTop: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontWeight: 700 }}>{item.origin} · {item.status}</Typography>
                <Typography variant="body2">Prioridad: {item.priority} · Creado: {date(item.createdAt)}</Typography>
                <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Caso {item.id}</Typography>
              </Box>
            ))}
          </CardContent></Card>
          <Card variant="outlined"><CardContent>
            <Typography variant="h6">Asignaciones ({assignments.length})</Typography>
            {assignments.length === 0 && <Typography>Sin asignaciones registradas.</Typography>}
            {assignments.map((item) => (
              <Box key={item.id} sx={{ py: 1.5, borderTop: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontWeight: 700 }}>{item.evaluator.fullName} · {item.isActive ? 'Activa' : 'Histórica'}</Typography>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>Caso {item.caseId} · {date(item.assignedAt)}</Typography>
              </Box>
            ))}
          </CardContent></Card>
          <Card variant="outlined"><CardContent>
            <Typography variant="h6">Agenda ({schedules.length})</Typography>
            {schedules.length === 0 && <Typography>Sin programaciones registradas.</Typography>}
            {schedules.map((item) => (
              <Box key={item.id} sx={{ py: 1.5, borderTop: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontWeight: 700 }}>{item.evaluator.fullName} · {item.status}</Typography>
                <Typography variant="body2">{date(item.scheduledStartAt)} — {date(item.scheduledEndAt)}</Typography>
                <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>Caso {item.caseId}</Typography>
              </Box>
            ))}
          </CardContent></Card>
        </Stack>
      )}
    </Box>
  )
}
