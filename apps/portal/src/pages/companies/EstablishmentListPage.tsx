import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Card, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography, Button } from '@mui/material'
import { establishmentsApi, type Establishment } from '../../api/resources'
import { routeForError, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'

export function EstablishmentListPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const companyId = params.get('companyId') || undefined
  const { showError } = useNotification()
  const [items, setItems] = useState<Establishment[]>([])
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    void establishmentsApi.list({ page: page + 1, limit, search, companyId }).then((result) => {
      if (active) { setItems(result.data); setTotal(result.meta.total ?? result.data.length) }
    }).catch((error) => { if (!active) return; const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar los establecimientos.')) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, limit, search, companyId, navigate, showError])
  return <Stack spacing={2}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Establecimientos</Typography><Typography color="text.secondary">Consulta limitada por Core según la empresa activa y el rol.{companyId ? ' Filtrado por empresa seleccionada.' : ''}</Typography></Box>
    <Card><Stack direction="row" spacing={1} sx={{ p: 2 }}><TextField fullWidth size="small" label="Buscar" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(0); setSearch(searchInput.trim()) } }} /><Button onClick={() => { setPage(0); setSearch(searchInput.trim()) }}>Buscar</Button></Stack>
      <Table><TableHead><TableRow><TableCell>Establecimiento</TableCell><TableCell>Empresa</TableCell><TableCell>Estado</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={3} align="center"><CircularProgress /></TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={3}>No hay establecimientos.</TableCell></TableRow> : items.map((item) => <TableRow hover key={item.id} onClick={() => navigate(`/directorio/establecimientos/${item.id}`)} sx={{ cursor: 'pointer' }}><TableCell>{item.name}</TableCell><TableCell>{item.companyLegalName}</TableCell><TableCell><Chip size="small" label={item.status} /></TableCell></TableRow>)}</TableBody></Table>
      <TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} />
    </Card></Stack>
}
