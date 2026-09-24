import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, Chip, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { operationApi, type CaseOrigin, type CaseStatus, type OperationalCase } from '../../api/operation'
import { routeForError, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'

export const originNames: Record<CaseOrigin, string> = { COMPANY_REQUEST: 'Solicitud BPM', INSTITUTIONAL_PROGRAM: 'Programa institucional', HEALTH_ALERT: 'Alerta sanitaria', COMPLAINT: 'Denuncia' }
export const statusNames: Record<CaseStatus, string> = { PENDING_REVIEW: 'Pendiente de decisión', PENDING_ASSIGNMENT: 'Pendiente de asignación', ASSIGNED: 'Asignado', NO_ACTION: 'No procede', REFERRED: 'Remitido', CLOSED: 'Cerrado' }
export const caseReference = (item: OperationalCase) => item.source.requestType || item.source.programReference || item.source.alertNumber || item.source.complaintType || item.id

export function CaseListPage({ origin }: { origin?: CaseOrigin }) {
  const navigate = useNavigate()
  const { showError } = useNotification()
  const [items, setItems] = useState<OperationalCase[]>([])
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<CaseStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await operationApi.cases({ page: page + 1, limit, ...(origin ? { origin } : {}), ...(status ? { status } : {}), ...(search ? { search } : {}) })
      setItems(result.data); setTotal(result.meta.total ?? result.data.length)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar los casos.')) }
    finally { setLoading(false) }
  }, [limit, navigate, origin, page, search, showError, status])
  useEffect(() => { void load() }, [load])
  const createPath = origin === 'INSTITUTIONAL_PROGRAM' ? '/operacion/programas/nuevo' : origin === 'HEALTH_ALERT' ? '/operacion/alertas/nueva' : origin === 'COMPLAINT' ? '/operacion/denuncias/nueva' : null
  return <Stack spacing={2}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{origin ? originNames[origin] : 'Casos de operación sanitaria'}</Typography><Typography color="text.secondary">Cuatro orígenes con estado y referencias reales de Core.</Typography></Box>{createPath && origin && <Button variant="contained" onClick={() => navigate(createPath)}>Crear {originNames[origin].toLowerCase()}</Button>}</Box>
    <Card sx={{ p: 2 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}><TextField size="small" label="Referencia" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} fullWidth /><TextField size="small" select label="Estado" value={status} onChange={(event) => { setStatus(event.target.value as CaseStatus | ''); setPage(0) }} sx={{ minWidth: 220 }}><MenuItem value="">Todos</MenuItem>{Object.entries(statusNames).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField><Button onClick={() => { setSearch(searchInput.trim()); setPage(0) }}>Buscar</Button></Stack></Card>
    <Card><TableContainer><Table><TableHead><TableRow><TableCell>Origen</TableCell><TableCell>Referencia</TableCell><TableCell>Prioridad</TableCell><TableCell>Estado</TableCell><TableCell>Fecha</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={5}><Alert severity="info">No hay casos con estos filtros.</Alert></TableCell></TableRow> : items.map((item) => <TableRow key={item.id} hover onClick={() => navigate(`/operacion/casos/${item.id}`)} sx={{ cursor: 'pointer' }}><TableCell>{originNames[item.origin]}</TableCell><TableCell>{caseReference(item)}</TableCell><TableCell>{item.priority}</TableCell><TableCell><Chip size="small" label={statusNames[item.status]} color={item.status === 'PENDING_REVIEW' ? 'warning' : item.status === 'ASSIGNED' ? 'success' : 'default'} /></TableCell><TableCell>{new Date(item.createdAt).toLocaleDateString('es-DO')}</TableCell></TableRow>)}</TableBody></Table></TableContainer><TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Casos por página:" /></Card>
  </Stack>
}
