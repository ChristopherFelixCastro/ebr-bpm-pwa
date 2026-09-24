import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, MenuItem, Stack, TablePagination, TextField, Typography } from '@mui/material'
import { canAssign, canChangeSchedule, canDecide, canEditSource, canReassign, canSchedule } from '../../access/operationRules'
import { operationApi, type Assignment, type Evaluator, type OperationalCase, type OperationWarning, type Schedule } from '../../api/operation'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'
import { useSession } from '../../session/SessionContext'
import { caseReference, originNames, statusNames } from './CaseListPage'

const displayTime = (value: string) => new Intl.DateTimeFormat('es-DO', { timeZone: 'America/Santo_Domingo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const toCoreTime = (value: string) => new Date(`${value}:00-04:00`).toISOString()
const warningsOf = (meta: unknown) => (meta as { warnings?: OperationWarning[] })?.warnings ?? []

export function CaseDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const [item, setItem] = useState<OperationalCase | null>(null)
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([])
  const [scheduleHistory, setScheduleHistory] = useState<Schedule[]>([])
  const [assignmentTotal, setAssignmentTotal] = useState(0)
  const [scheduleTotal, setScheduleTotal] = useState(0)
  const [assignmentPage, setAssignmentPage] = useState(0)
  const [schedulePage, setSchedulePage] = useState(0)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | undefined>()
  const [activeSchedule, setActiveSchedule] = useState<Schedule | undefined>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(false)
  const [warnings, setWarnings] = useState<OperationWarning[]>([])
  const [decision, setDecision] = useState<'PROCEEDS' | 'NOT_PROCEEDS' | 'REFERRED'>('PROCEEDS')
  const [decisionReason, setDecisionReason] = useState('')
  const [referralDestination, setReferralDestination] = useState('')
  const [evaluatorSearch, setEvaluatorSearch] = useState('')
  const [evaluatorPage, setEvaluatorPage] = useState(0)
  const [evaluators, setEvaluators] = useState<Evaluator[]>([])
  const [evaluatorTotal, setEvaluatorTotal] = useState(0)
  const [selectedEvaluator, setSelectedEvaluator] = useState('')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'create' | 'reschedule' | 'cancel'>('create')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleReason, setScheduleReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [caseResult, activeAssignments, activeSchedules, assignments, schedules] = await Promise.all([
        operationApi.case(id), operationApi.caseAssignments(id, { page: 1, limit: 1, active: true }),
        operationApi.caseSchedules(id, { page: 1, limit: 1, status: 'SCHEDULED' }),
        operationApi.caseAssignments(id, { page: assignmentPage + 1, limit: 10 }),
        operationApi.caseSchedules(id, { page: schedulePage + 1, limit: 10 }),
      ])
      setItem(caseResult); setActiveAssignment(activeAssignments.data[0]); setActiveSchedule(activeSchedules.data[0]); setScheduleMode(activeSchedules.data[0] ? 'reschedule' : 'create'); setDecision('PROCEEDS')
      setAssignmentHistory(assignments.data); setAssignmentTotal(assignments.meta.total ?? assignments.data.length)
      setScheduleHistory(schedules.data); setScheduleTotal(schedules.meta.total ?? schedules.data.length); setStale(false)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar el caso.')) }
    finally { setLoading(false) }
  }, [assignmentPage, id, navigate, schedulePage, showError])
  useEffect(() => { void load() }, [load])

  const handleError = (error: unknown, fallback: string) => { if (isStaleVersion(error)) setStale(true); else { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, fallback)) } }
  const decide = async () => {
    if (!item || !canDecide(user, item) || busy) return
    setBusy(true)
    try {
      if (item.origin === 'HEALTH_ALERT') await operationApi.decideAlert(id, { version: item.source.version, decision: decision === 'REFERRED' ? 'NOT_PROCEEDS' : decision, ...(decision === 'NOT_PROCEEDS' ? { reason: decisionReason.trim() } : {}) })
      else await operationApi.decideComplaint(id, { version: item.source.version, decision, ...(decision === 'REFERRED' ? { referralReason: decisionReason.trim(), referralDestination: referralDestination.trim() } : decision === 'NOT_PROCEEDS' ? { decisionReason: decisionReason.trim() } : {}) })
      showSuccess('Decisión registrada.'); await load()
    } catch (error) { handleError(error, 'No fue posible decidir el caso.') }
    finally { setBusy(false) }
  }
  const searchEvaluators = async (page = 0) => {
    try { const result = await operationApi.evaluators({ page: page + 1, limit: 10, ...(evaluatorSearch.trim() ? { search: evaluatorSearch.trim() } : {}) }); setEvaluators(result.data); setEvaluatorTotal(result.meta.total ?? result.data.length); setEvaluatorPage(page) }
    catch (error) { handleError(error, 'No fue posible consultar evaluadores asignables.') }
  }
  const assign = async () => {
    if (!item || !selectedEvaluator || busy) return
    const reassigning = canReassign(user, item, activeAssignment)
    if (!reassigning && !canAssign(user, item, activeAssignment)) return
    if (reassigning && !assignmentReason.trim()) return
    setBusy(true)
    try {
      const response = reassigning ? await operationApi.reassign(id, { newEvaluatorUserId: selectedEvaluator, currentAssignmentVersion: activeAssignment!.version, reason: assignmentReason.trim() }) : await operationApi.assign(id, { evaluatorUserId: selectedEvaluator, ...(assignmentReason.trim() ? { reason: assignmentReason.trim() } : {}) })
      setWarnings(warningsOf(response.meta)); setSelectedEvaluator(''); setAssignmentReason(''); showSuccess(reassigning ? 'Caso reasignado; el historial permanece disponible.' : 'Evaluador asignado.'); await load()
    } catch (error) { handleError(error, 'No fue posible asignar el caso.') }
    finally { setBusy(false) }
  }
  const changeSchedule = async () => {
    if (!item || busy) return
    if (scheduleMode === 'create' && !canSchedule(user, item, activeAssignment, activeSchedule)) return
    if (scheduleMode !== 'create' && !canChangeSchedule(user, item, activeSchedule)) return
    setBusy(true)
    try {
      let response
      if (scheduleMode === 'cancel') response = await operationApi.cancelSchedule(id, activeSchedule!.id, { version: activeSchedule!.version, reason: scheduleReason.trim() })
      else {
        const window = { scheduledStartAt: toCoreTime(start), scheduledEndAt: toCoreTime(end) }
        response = scheduleMode === 'reschedule' ? await operationApi.reschedule(id, activeSchedule!.id, { version: activeSchedule!.version, ...window, reason: scheduleReason.trim(), ...(scheduleNotes.trim() ? { notes: scheduleNotes.trim() } : {}) }) : await operationApi.schedule(id, { ...window, ...(scheduleNotes.trim() ? { notes: scheduleNotes.trim() } : {}) })
      }
      setWarnings(warningsOf(response.meta)); setScheduleReason(''); showSuccess(scheduleMode === 'cancel' ? 'Programación cancelada; el caso y la asignación siguen activos.' : 'Programación guardada con historial.'); await load()
    } catch (error) { handleError(error, 'No fue posible guardar la programación.') }
    finally { setBusy(false) }
  }
  if (loading && !item) return <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress /></Box>
  if (!item) return null
  const canSelectEvaluator = canAssign(user, item, activeAssignment) || canReassign(user, item, activeAssignment)
  const canMakeSchedule = canSchedule(user, item, activeAssignment, activeSchedule)
  const canModifySchedule = canChangeSchedule(user, item, activeSchedule)
  const sourceEditPath = item.origin === 'INSTITUTIONAL_PROGRAM' ? 'programas' : item.origin === 'HEALTH_ALERT' ? 'alertas' : 'denuncias'
  return <Stack spacing={2}>
    <Box><Button onClick={() => navigate('/operacion/casos')}>Casos</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>{originNames[item.origin]} · {caseReference(item)}</Typography><Stack direction="row" spacing={1} sx={{ mt: 1 }}><Chip label={statusNames[item.status]} color={item.status === 'ASSIGNED' ? 'success' : 'default'} /><Chip label={`Prioridad ${item.priority}`} variant="outlined" /></Stack></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Descartar cambios y recargar</Button>}>La versión cambió. Los datos introducidos se conservan hasta que decida recargar.</Alert>}
    {warnings.map((warning, index) => <Alert key={`${warning.code}-${index}`} severity="warning">Solapamiento de agenda detectado para el evaluador. La operación se guardó; revise su agenda.</Alert>)}
    <Card><CardContent><Typography variant="h6">Fuente del caso</Typography><Divider sx={{ my: 1 }} /><Typography>Estado: {statusNames[item.status]} · Versión {item.source.version}</Typography><Typography>Referencia: {caseReference(item)}</Typography>{item.source.establishmentName && <Typography>Establecimiento: {item.source.establishmentName}</Typography>}{item.source.productDescription && <Typography>Producto: {item.source.productDescription}</Typography>}{(item.source.reason || item.source.description) && <Typography>Descripción: {item.source.reason || item.source.description}</Typography>}{item.source.decision && <Typography>Decisión: {item.source.decision}</Typography>}{item.source.decisionReason && <Typography>Motivo: {item.source.decisionReason}</Typography>}{item.source.referralDestination && <Typography>Destino de remisión: {item.source.referralDestination}</Typography>}{item.origin === 'COMPLAINT' && <Typography>Denuncia {item.source.isAnonymous ? 'anónima' : 'identificada'}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>{canEditSource(user, item, activeAssignment) && <Button onClick={() => navigate(`/operacion/${sourceEditPath}/${id}/editar`)}>Editar fuente</Button>}{item.origin === 'COMPANY_REQUEST' && item.source.requestId && <Button onClick={() => navigate(`/solicitudes/${item.source.requestId}`)}>Ver solicitud BPM</Button>}</Stack>
    </CardContent></Card>
    {canDecide(user, item) && <Card><CardContent><Stack spacing={2}><Typography variant="h6">Decisión previa a la asignación</Typography><TextField select label="Decisión" value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><MenuItem value="PROCEEDS">Procede evaluación</MenuItem><MenuItem value="NOT_PROCEEDS">No procede</MenuItem>{item.origin === 'COMPLAINT' && <MenuItem value="REFERRED">Remitir</MenuItem>}</TextField>{decision !== 'PROCEEDS' && <TextField label={decision === 'REFERRED' ? 'Motivo de remisión' : 'Motivo de no procedencia'} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} multiline minRows={2} required />}{decision === 'REFERRED' && <TextField label="Destino de remisión" value={referralDestination} onChange={(event) => setReferralDestination(event.target.value)} required />}<Button variant="contained" onClick={() => void decide()} disabled={busy || (decision !== 'PROCEEDS' && !decisionReason.trim()) || (decision === 'REFERRED' && !referralDestination.trim())}>Registrar decisión</Button></Stack></CardContent></Card>}
    <Card><CardContent><Typography variant="h6">Asignación</Typography>{activeAssignment ? <Typography>Evaluador activo: {activeAssignment.evaluator.fullName} · versión {activeAssignment.version}</Typography> : <Alert severity="info">No hay evaluador activo.</Alert>}{canSelectEvaluator && <Stack spacing={2} sx={{ mt: 2 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}><TextField label="Buscar evaluador aprobado" value={evaluatorSearch} onChange={(event) => setEvaluatorSearch(event.target.value)} fullWidth /><Button onClick={() => void searchEvaluators(0)}>Buscar</Button></Stack><TextField select label="Evaluador" value={selectedEvaluator} onChange={(event) => setSelectedEvaluator(event.target.value)}><MenuItem value="">Seleccione</MenuItem>{evaluators.map((evaluator) => <MenuItem key={evaluator.id} value={evaluator.id}>{evaluator.fullName}</MenuItem>)}</TextField>{evaluatorTotal > 10 && <TablePagination component="div" count={evaluatorTotal} page={evaluatorPage} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, next) => void searchEvaluators(next)} labelRowsPerPage="Evaluadores:" />}<TextField label={activeAssignment ? 'Motivo de reasignación' : 'Motivo de asignación (opcional)'} value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} required={Boolean(activeAssignment)} /><Button variant="contained" onClick={() => void assign()} disabled={busy || !selectedEvaluator || (Boolean(activeAssignment) && !assignmentReason.trim())}>{activeAssignment ? 'Reasignar' : 'Asignar'}</Button></Stack>}<Divider sx={{ my: 2 }} /><Typography variant="subtitle1">Historial de asignaciones</Typography>{assignmentHistory.map((assignment) => <Typography key={assignment.id} variant="body2">{assignment.evaluator.fullName} · {displayTime(assignment.assignedAt)} · {assignment.isActive ? 'Activa' : 'Finalizada'} · versión {assignment.version}</Typography>)}<TablePagination component="div" count={assignmentTotal} page={assignmentPage} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, next) => setAssignmentPage(next)} labelRowsPerPage="Asignaciones:" /></CardContent></Card>
    <Card><CardContent><Typography variant="h6">Agenda del caso</Typography>{activeSchedule ? <Typography>Activa: {displayTime(activeSchedule.scheduledStartAt)} – {displayTime(activeSchedule.scheduledEndAt)} · {activeSchedule.evaluator.fullName} · versión {activeSchedule.version}</Typography> : <Alert severity="info">No hay programación activa.</Alert>}{(canMakeSchedule || canModifySchedule) && <Stack spacing={2} sx={{ mt: 2 }}><TextField select label="Acción de agenda" value={scheduleMode === 'create' && !canMakeSchedule ? 'reschedule' : scheduleMode} onChange={(event) => setScheduleMode(event.target.value as typeof scheduleMode)}>{canMakeSchedule && <MenuItem value="create">Programar</MenuItem>}{canModifySchedule && <MenuItem value="reschedule">Reprogramar</MenuItem>}{canModifySchedule && <MenuItem value="cancel">Cancelar programación</MenuItem>}</TextField>{(scheduleMode !== 'cancel' || canMakeSchedule) && <><Alert severity="info">Horario de República Dominicana (America/Santo_Domingo). Los solapamientos se notifican como advertencia.</Alert><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}><TextField label="Inicio" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth /><TextField label="Fin" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth /></Stack><TextField label="Notas" value={scheduleNotes} onChange={(event) => setScheduleNotes(event.target.value)} multiline minRows={2} /></>}{(scheduleMode === 'reschedule' || scheduleMode === 'cancel') && <TextField label="Motivo" value={scheduleReason} onChange={(event) => setScheduleReason(event.target.value)} required />}<Button variant="contained" onClick={() => void changeSchedule()} disabled={busy || ((scheduleMode === 'reschedule' || scheduleMode === 'cancel') && !scheduleReason.trim()) || (scheduleMode !== 'cancel' && (!start || !end))}>Guardar agenda</Button></Stack>}<Divider sx={{ my: 2 }} /><Typography variant="subtitle1">Historial de programación</Typography>{scheduleHistory.map((schedule) => <Typography key={schedule.id} variant="body2">{displayTime(schedule.scheduledStartAt)} – {displayTime(schedule.scheduledEndAt)} · {schedule.evaluator.fullName} · {schedule.status} · versión {schedule.version}</Typography>)}<TablePagination component="div" count={scheduleTotal} page={schedulePage} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, next) => setSchedulePage(next)} labelRowsPerPage="Programaciones:" /></CardContent></Card>
  </Stack>
}
