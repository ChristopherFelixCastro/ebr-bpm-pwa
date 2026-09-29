import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, Chip, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { requestsApi, type CompanyRequest } from '../../api/resources'
import { routeForError, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'
import { useSession } from '../../session/SessionContext'
import { requestTypeLabel } from './requestTypes'
import { requestProgressLabel, type RequestProgressStatus } from './requestProgress'

export const RequestListPage = () => {
  const navigate = useNavigate()
  const { showError } = useNotification()
  const { user } = useSession()
  const canCreate = user?.roleCode === 'ADMIN' || user?.roleCode === 'UNIVERSAL' || ((user?.roleCode === 'COMPANY_ADMIN' || user?.roleCode === 'DELEGATE') && Boolean(user.companyId))
  const [items, setItems] = useState<CompanyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | RequestProgressStatus>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await requestsApi.list({ page: page + 1, limit: rowsPerPage, ...(search ? { search } : {}), ...(status !== 'ALL' ? { progressStatus: status } : {}) })
      setItems(result.data)
      setTotal(result.meta.total ?? result.data.length)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar las solicitudes.')) }
    finally { setLoading(false) }
  }, [navigate, page, rowsPerPage, search, showError, status])

  useEffect(() => { void load() }, [load])

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}><Box><Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', gap: 1, alignItems: 'center' }}><AssignmentIcon color="primary" />Solicitudes BPM</Typography><Typography color="text.secondary">Borradores y solicitudes enviadas dentro del alcance real.</Typography></Box>{canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/solicitudes/nueva')}>Nueva solicitud</Button>}</Box>
    <Card sx={{ border: '1px solid #fde68a' }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2 }}><TextField fullWidth size="small" label="Buscar" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><TextField select size="small" label="Avance" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(0) }} sx={{ minWidth: 210 }}><MenuItem value="ALL">Todos</MenuItem><MenuItem value="DRAFT">Borrador</MenuItem><MenuItem value="PENDING_ASSIGNMENT">Pendiente de asignación</MenuItem><MenuItem value="ASSIGNED">En trámite</MenuItem><MenuItem value="CLOSED">Cerrado</MenuItem><MenuItem value="NO_ACTION">Sin acción</MenuItem><MenuItem value="REFERRED">Remitido</MenuItem></TextField><Button variant="outlined" onClick={() => { setSearch(searchInput.trim()); setPage(0) }}>Buscar</Button></Stack>
      <TableContainer><Table><TableHead><TableRow><TableCell>Tipo</TableCell><TableCell>Establecimiento</TableCell><TableCell>Motivo</TableCell><TableCell>Avance</TableCell><TableCell>Última actualización</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No hay solicitudes.</TableCell></TableRow> : items.map((item) => <TableRow hover key={item.id} onClick={() => navigate(`/solicitudes/${item.id}`)} sx={{ cursor: 'pointer' }}><TableCell sx={{ fontWeight: 700 }}>{item.requestType ? requestTypeLabel(item.requestType) : '—'}</TableCell><TableCell>{item.establishmentName || item.establishmentId}</TableCell><TableCell>{item.reason}</TableCell><TableCell><Chip size="small" color={item.progressStatus === 'CLOSED' ? 'success' : item.status === 'DRAFT' ? 'warning' : 'info'} label={requestProgressLabel(item)} /></TableCell><TableCell>{new Date(item.caseUpdatedAt || item.updatedAt).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
      <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Filas:" />
    </Card>
  </Box>
}
