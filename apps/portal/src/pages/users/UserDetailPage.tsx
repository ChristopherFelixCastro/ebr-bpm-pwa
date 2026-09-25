import { useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import type { CoreRole } from '@ebr-bpm/core-client'
import {
  awaitingApproval, companyRoles, letterColor, letterLabels, openSignedDownload, roleLabels, statusColor, statusLabels,
  usersApi, validateLetterFile, type AuthorizationLetter, type PortalUser,
} from '../../api/users'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { CompanyPicker } from '../../components/CompanyPicker'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'

type EditForm = { fullName: string; phone: string; roleCode: CoreRole; company: { id: string; legalName: string } | null }
type Decision = 'approve' | 'reject' | 'deactivate'
const decisions: Record<Decision, { title: string; message: string; confirm: string; done: string; variant: 'success' | 'danger' | 'warning' }> = {
  approve: { title: 'Aprobar cuenta', message: 'La cuenta podrá iniciar sesión con su rol. Core comprobará la carta válida y solicitará confirmar su identidad.', confirm: 'Aprobar', done: 'Cuenta aprobada.', variant: 'success' },
  reject: { title: 'Rechazar cuenta', message: 'La solicitud de cuenta quedará rechazada y se revocarán sus sesiones. Se solicitará confirmar su identidad.', confirm: 'Rechazar', done: 'Cuenta rechazada.', variant: 'danger' },
  deactivate: { title: 'Desactivar cuenta', message: 'La cuenta no podrá iniciar sesión y se revocarán sus sesiones. Se solicitará confirmar su identidad.', confirm: 'Desactivar', done: 'Cuenta desactivada.', variant: 'warning' },
}
const bytes = (size: number) => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`
const when = (value: string | null) => value ? new Date(value).toLocaleString('es-DO') : '—'
const toForm = (account: PortalUser): EditForm => ({ fullName: account.fullName, phone: account.phone ?? '', roleCode: account.roleCode, company: account.companyId ? { id: account.companyId, legalName: account.companyName ?? account.companyId } : null })

export function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, runWithReauthentication } = useSession()
  const { showError, showSuccess } = useNotification()
  const fileInput = useRef<HTMLInputElement>(null)
  const [account, setAccount] = useState<PortalUser | null>(null)
  const [letters, setLetters] = useState<AuthorizationLetter[]>([])
  const [form, setForm] = useState<EditForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [rejectLetterOpen, setRejectLetterOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async (keepForm = false) => {
    setLoading(true)
    try {
      const [loaded, history] = await Promise.all([usersApi.get(id), usersApi.letters(id)])
      setAccount(loaded); setLetters(history); setStale(false)
      if (!keepForm) setForm(toForm(loaded))
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'No fue posible cargar la cuenta.'))
    } finally { setLoading(false) }
  }, [id, navigate, showError])
  useEffect(() => { void load() }, [load])

  const run = async <T,>(action: () => Promise<T>, fallback: string, onDone: (result: T) => void | Promise<void>) => {
    setBusy(true)
    try { await onDone(await runWithReauthentication(action)) }
    catch (error) {
      if (error instanceof ReauthenticationCancelledError) return
      if (isStaleVersion(error)) setStale(true)
      else showError(supportMessage(error, fallback))
    } finally { setBusy(false) }
  }

  if (loading && !account) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
  if (!account || !form) return null

  const self = user?.id === account.id
  const activeLetter = letters.find((letter) => letter.status !== 'ARCHIVED') ?? null
  const needsCompany = companyRoles.includes(account.roleCode) && !account.companyId
  const canApprove = !self && awaitingApproval(account.status) && account.authorizationLetterStatus === 'VALID' && !needsCompany
  const canReject = !self && account.status === 'PENDING_VALIDATION'
  const canDeactivate = !self && (account.status === 'PENDING_VALIDATION' || account.status === 'APPROVED')
  const lettersEditable = awaitingApproval(account.status)
  const roleOptions = (Object.keys(roleLabels) as CoreRole[]).filter((code) => code !== 'UNIVERSAL' || user?.roleCode === 'UNIVERSAL')

  const save = () => {
    const nextNeedsCompany = companyRoles.includes(form.roleCode)
    if (!form.fullName.trim()) return showError('El nombre es obligatorio.')
    if (nextNeedsCompany && !form.company) return showError('Seleccione la empresa de la cuenta empresarial.')
    void run(() => usersApi.update(account.id, {
      version: account.version, fullName: form.fullName.trim(), phone: form.phone.trim() || null, roleCode: form.roleCode,
      companyId: nextNeedsCompany ? form.company!.id : null,
    }), 'No fue posible guardar la cuenta.', (updated) => { setAccount(updated); setForm(toForm(updated)); showSuccess('Cuenta actualizada.') })
  }
  const decide = (kind: Decision) => void run(() => usersApi[kind](account.id, account.version), 'No fue posible completar la decisión.', async (updated) => {
    setDecision(null); setAccount(updated); showSuccess(decisions[kind].done); await load(true)
  })
  const upload = (file: File | undefined) => {
    if (!file) return
    const problem = validateLetterFile(file)
    if (problem) return showError(problem)
    void run(() => usersApi.uploadLetter(account.id, file), 'No fue posible adjuntar la carta.', async () => { showSuccess(activeLetter ? 'Carta reemplazada; la anterior quedó archivada.' : 'Carta adjuntada.'); await load(true) })
  }
  const reviewLetter = (valid: boolean) => {
    if (!activeLetter) return
    if (!valid && !rejectReason.trim()) return showError('Indique el motivo del rechazo.')
    void run(() => valid ? usersApi.validateLetter(account.id, activeLetter.id, activeLetter.version) : usersApi.rejectLetter(account.id, activeLetter.id, activeLetter.version, rejectReason.trim()),
      'No fue posible revisar la carta.', async () => { setRejectLetterOpen(false); setRejectReason(''); showSuccess(valid ? 'Carta marcada como válida.' : 'Carta rechazada.'); await load(true) })
  }
  const download = (letter: AuthorizationLetter) => openSignedDownload(() => usersApi.letterDownloadUrl(account.id, letter.id))
    .catch((error) => showError(supportMessage(error, 'No fue posible abrir la carta.')))

  return <Stack spacing={3}>
    <Box>
      <Button component={RouterLink} to="/configuracion/usuarios" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>Usuarios</Button>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{account.fullName}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
        <Chip color={statusColor(account.status)} label={statusLabels[account.status]} />
        <Chip variant="outlined" label={roleLabels[account.roleCode]} />
        {account.companyName && <Chip variant="outlined" label={account.companyName} />}
      </Stack>
    </Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load(true)}>Recargar para comparar</Button>}>La cuenta o su carta cambió en el servidor. Sus valores siguen en el formulario; recargue y revise antes de volver a guardar.</Alert>}
    {self && <Alert severity="info">Está viendo su propia cuenta: no puede aprobarla, rechazarla, desactivarla ni revisar su carta.</Alert>}

    <Card><CardContent><Typography variant="h6" sx={{ mb: 2 }}>Datos de la cuenta</Typography>
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        <TextField label="Correo electrónico" value={account.email} disabled helperText="El correo identifica la cuenta y no se modifica aquí." />
        <TextField label="Nombre completo" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        <TextField label="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <TextField select label="Rol" value={form.roleCode} onChange={(event) => setForm({ ...form, roleCode: event.target.value as CoreRole, company: companyRoles.includes(event.target.value as CoreRole) ? form.company : null })}
          helperText={form.roleCode !== account.roleCode ? 'Cambiar el rol revoca las sesiones activas de la cuenta.' : undefined}>
          {roleOptions.map((code) => <MenuItem key={code} value={code}>{roleLabels[code]}</MenuItem>)}
        </TextField>
        {companyRoles.includes(form.roleCode) && <CompanyPicker required value={form.company} onChange={(company) => setForm({ ...form, company })} />}
        <Box><Button variant="contained" disabled={busy} onClick={save}>Guardar cambios</Button></Box>
      </Stack>
    </CardContent></Card>

    <Card><CardContent><Typography variant="h6" sx={{ mb: 1 }}>Estado de la cuenta</Typography>
      {awaitingApproval(account.status) && account.authorizationLetterStatus !== 'VALID' && <Alert severity="info" sx={{ mb: 2 }}>La aprobación estará disponible cuando Core confirme una carta de autorización válida.</Alert>}
      {awaitingApproval(account.status) && needsCompany && <Alert severity="warning" sx={{ mb: 2 }}>Asigne la empresa de la cuenta empresarial antes de aprobarla.</Alert>}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {awaitingApproval(account.status) && <Button variant="contained" color="success" disabled={busy || !canApprove} onClick={() => setDecision('approve')}>{account.status === 'INACTIVE' ? 'Reactivar' : 'Aprobar'}</Button>}
        {canReject && <Button variant="outlined" color="error" disabled={busy} onClick={() => setDecision('reject')}>Rechazar</Button>}
        {canDeactivate && <Button variant="outlined" color="warning" disabled={busy} onClick={() => setDecision('deactivate')}>Desactivar</Button>}
        {!awaitingApproval(account.status) && !canDeactivate && <Typography color="text.secondary">No hay decisiones disponibles en el estado actual.</Typography>}
      </Stack>
    </CardContent></Card>

    <Card><CardContent>
      <Typography variant="h6">Carta de autorización de la cuenta</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Distinta de la carta de una solicitud BPM. PDF, JPG o PNG de hasta 5 MB.</Typography>
      {activeLetter ? <Stack spacing={1} sx={{ mb: 2 }}>
        <Box><Chip color={letterColor(activeLetter.status)} label={letterLabels[activeLetter.status]} /></Box>
        <Typography variant="body2">{activeLetter.fileName} · {bytes(activeLetter.sizeBytes)} · adjuntada {when(activeLetter.uploadedAt)}</Typography>
        {activeLetter.reviewedAt && <Typography variant="body2">Revisada {when(activeLetter.reviewedAt)}</Typography>}
        {activeLetter.rejectionReason && <Alert severity="error">Motivo del rechazo: {activeLetter.rejectionReason}</Alert>}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button disabled={busy} onClick={() => void download(activeLetter)}>Descargar</Button>
          {!self && lettersEditable && activeLetter.status === 'PENDING' && <>
            <Button variant="contained" color="success" disabled={busy} onClick={() => reviewLetter(true)}>Marcar como válida</Button>
            <Button variant="outlined" color="error" disabled={busy} onClick={() => setRejectLetterOpen(true)}>Rechazar carta</Button>
          </>}
        </Stack>
      </Stack> : <Alert severity="warning" sx={{ mb: 2 }}>La cuenta no tiene una carta de autorización activa.</Alert>}
      {lettersEditable && !self && <>
        <input ref={fileInput} type="file" hidden accept="application/pdf,image/jpeg,image/png" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = '' }} />
        <Button variant="outlined" startIcon={<UploadFileIcon />} disabled={busy} onClick={() => fileInput.current?.click()}>{activeLetter ? 'Reemplazar carta' : 'Adjuntar carta'}</Button>
      </>}
      {letters.length > 0 && <>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Historial</Typography>
        <Table size="small"><TableHead><TableRow><TableCell>Estado</TableCell><TableCell>Adjuntada</TableCell><TableCell>Revisada</TableCell><TableCell>Archivada</TableCell><TableCell>Motivo</TableCell></TableRow></TableHead>
          <TableBody>{letters.map((letter) => <TableRow key={letter.id}>
            <TableCell>{letterLabels[letter.status]}</TableCell><TableCell>{when(letter.uploadedAt)}</TableCell><TableCell>{when(letter.reviewedAt)}</TableCell><TableCell>{when(letter.archivedAt)}</TableCell><TableCell>{letter.rejectionReason ?? '—'}</TableCell>
          </TableRow>)}</TableBody></Table>
      </>}
    </CardContent></Card>

    {decision && <ConfirmDialog open title={decisions[decision].title} message={decisions[decision].message} confirmText={decisions[decision].confirm} variant={decisions[decision].variant}
      loading={busy} onClose={() => setDecision(null)} onConfirm={() => decide(decision)} />}
    <Dialog open={rejectLetterOpen} onClose={() => !busy && setRejectLetterOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Rechazar carta de autorización</DialogTitle>
      <DialogContent><TextField autoFocus fullWidth multiline minRows={3} label="Motivo" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} sx={{ mt: 1 }} slotProps={{ htmlInput: { maxLength: 1000 } }} /></DialogContent>
      <DialogActions><Button onClick={() => setRejectLetterOpen(false)} disabled={busy}>Cancelar</Button><Button color="error" variant="contained" disabled={busy || !rejectReason.trim()} onClick={() => reviewLetter(false)}>Rechazar carta</Button></DialogActions>
    </Dialog>
  </Stack>
}
