import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Chip, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { operationApi, type Assignment, type Schedule } from '../../api/operation'
import { routeForError, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'

export function OperationHistoryPage({ kind }: { kind: 'assignments' | 'schedules' }) {
  const navigate = useNavigate()
  const { showError } = useNotification()
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scheduleStatus, setScheduleStatus] = useState<Schedule['status'] | ''>('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (kind === 'assignments') { const result = await operationApi.assignments({ page: page + 1, limit: 10 }); setAssignments(result.data); setTotal(result.meta.total ?? result.data.length) }
      else { const result = await operationApi.schedules({ page: page + 1, limit: 10, ...(scheduleStatus ? { status: scheduleStatus } : {}) }); setSchedules(result.data); setTotal(result.meta.total ?? result.data.length) }
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar el historial.')) }
    finally { setLoading(false) }
  }, [kind, navigate, page, scheduleStatus, showError])
  useEffect(() => { void load() }, [load])
  return <Stack spacing={2}>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>{kind === 'assignments' ? 'Asignaciones' : 'Agenda de inspecciones'}</Typography>
    {kind === 'schedules' && <TextField select size="small" label="Estado" value={scheduleStatus} onChange={(event) => { setScheduleStatus(event.target.value as Schedule['status'] | ''); setPage(0) }} sx={{ maxWidth: 260 }}><MenuItem value="">Todos</MenuItem><MenuItem value="SCHEDULED">Activa</MenuItem><MenuItem value="RESCHEDULED">Reprogramada</MenuItem><MenuItem value="CANCELLED">Cancelada</MenuItem></TextField>}
    <Card><TableContainer><Table><TableHead><TableRow><TableCell>Caso</TableCell><TableCell>Evaluador</TableCell><TableCell>{kind === 'assignments' ? 'Asignada' : 'Inicio'}</TableCell><TableCell>Estado</TableCell><TableCell>Acción</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow> : (kind === 'assignments' ? assignments : schedules).length === 0 ? <TableRow><TableCell colSpan={5}><Alert severity="info">Sin registros.</Alert></TableCell></TableRow> : kind === 'assignments' ? assignments.map((item) => <TableRow key={item.id}><TableCell>{item.caseId}</TableCell><TableCell>{item.evaluator.fullName}</TableCell><TableCell>{new Date(item.assignedAt).toLocaleString('es-DO')}</TableCell><TableCell><Chip size="small" label={item.isActive ? 'Activa' : 'Histórica'} /></TableCell><TableCell><Button onClick={() => navigate(`/operacion/casos/${item.caseId}`)}>Ver caso</Button></TableCell></TableRow>) : schedules.map((item) => <TableRow key={item.id}><TableCell>{item.caseId}</TableCell><TableCell>{item.evaluator.fullName}</TableCell><TableCell>{new Intl.DateTimeFormat('es-DO', { timeZone: 'America/Santo_Domingo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.scheduledStartAt))}</TableCell><TableCell><Chip size="small" label={item.status} /></TableCell><TableCell><Button onClick={() => navigate(`/operacion/casos/${item.caseId}`)}>Ver caso</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer><TablePagination component="div" count={total} page={page} rowsPerPage={10} rowsPerPageOptions={[10]} onPageChange={(_, next) => setPage(next)} labelRowsPerPage="Registros:" /></Card>
  </Stack>
}
