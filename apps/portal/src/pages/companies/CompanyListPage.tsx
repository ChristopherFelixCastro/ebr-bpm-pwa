import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BusinessIcon from '@mui/icons-material/Business'
import { companiesApi, type Company, type CompanyCreate } from '../../api/resources'
import { routeForError, supportMessage } from '../../api/presentation'
import { useSession } from '../../session/SessionContext'
import { useNotification } from '../../components/NoticeProvider'

const emptyForm: CompanyCreate = { legalName: '', rnc: '', tradeName: null, address: null, phone: null, email: null, economicActivityCode: null }

export const CompanyListPage = () => {
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CompanyCreate>(emptyForm)
  const [saving, setSaving] = useState(false)
  const canCreate = user?.roleCode === 'ADMIN' || user?.roleCode === 'UNIVERSAL'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await companiesApi.list({ page: page + 1, limit: rowsPerPage, ...(search ? { search } : {}), ...(status !== 'ALL' ? { status } : {}) })
      setCompanies(result.data)
      setTotal(result.meta.total ?? result.data.length)
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'No fue posible cargar las empresas.'))
    } finally { setLoading(false) }
  }, [navigate, page, rowsPerPage, search, showError, status])

  useEffect(() => { void load() }, [load])

  const create = async () => {
    if (!form.legalName.trim() || !form.rnc.trim()) return showError('Razón social y RNC son obligatorios.')
    setSaving(true)
    try {
      const company = await companiesApi.create(form)
      showSuccess('Empresa creada correctamente.')
      setOpen(false)
      setForm(emptyForm)
      navigate(`/directorio/empresas/${company.id}`)
    } catch (error) { showError(supportMessage(error, 'No fue posible crear la empresa.')) }
    finally { setSaving(false) }
  }

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
      <Box><Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', gap: 1, alignItems: 'center' }}><BusinessIcon color="primary" />Empresas</Typography><Typography color="text.secondary">Catálogo real del Core, limitado por el alcance de la sesión.</Typography></Box>
      {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Crear empresa</Button>}
    </Box>
    <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, borderBottom: '1px solid #E2E8F0' }}>
        <TextField fullWidth size="small" label="Buscar por nombre o RNC" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(0); setSearch(searchInput.trim()) } }} />
        <TextField select size="small" label="Estado" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value as typeof status) }} sx={{ minWidth: 180 }}><MenuItem value="ALL">Todos</MenuItem><MenuItem value="ACTIVE">Activas</MenuItem><MenuItem value="INACTIVE">Inactivas</MenuItem></TextField>
        <Button variant="outlined" onClick={() => { setPage(0); setSearch(searchInput.trim()) }}>Buscar</Button>
      </Stack>
      <TableContainer><Table><TableHead><TableRow><TableCell>Empresa</TableCell><TableCell>RNC</TableCell><TableCell>Contacto</TableCell><TableCell>Establecimientos</TableCell><TableCell>Estado</TableCell></TableRow></TableHead>
        <TableBody>{loading ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow> : companies.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No hay empresas para los filtros seleccionados.</TableCell></TableRow> : companies.map((company) => <TableRow hover key={company.id} onClick={() => navigate(`/directorio/empresas/${company.id}`)} sx={{ cursor: 'pointer' }}><TableCell><Typography sx={{ fontWeight: 700 }}>{company.legalName}</Typography><Typography variant="caption" color="text.secondary">{company.tradeName || 'Sin nombre comercial'}</Typography></TableCell><TableCell>{company.rnc || '—'}</TableCell><TableCell>{company.email || company.phone || '—'}</TableCell><TableCell>{company.activeEstablishmentCount}/{company.establishmentCount} activos</TableCell><TableCell><Chip size="small" color={company.status === 'ACTIVE' ? 'success' : 'default'} label={company.status} /></TableCell></TableRow>)}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Filas:" />
    </Card>

    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth><DialogTitle>Registrar empresa</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <TextField label="Razón social" required value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
      <TextField label="RNC" required value={form.rnc} onChange={(event) => setForm({ ...form, rnc: event.target.value })} />
      <TextField label="Nombre comercial" value={form.tradeName ?? ''} onChange={(event) => setForm({ ...form, tradeName: event.target.value || null })} />
      <TextField label="Dirección" value={form.address ?? ''} onChange={(event) => setForm({ ...form, address: event.target.value || null })} />
      <TextField label="Actividad económica" value={form.economicActivityCode ?? ''} onChange={(event) => setForm({ ...form, economicActivityCode: event.target.value || null })} />
      <TextField label="Correo" type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value || null })} />
      <TextField label="Teléfono" value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value || null })} />
    </Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="contained" disabled={saving} onClick={() => void create()}>Guardar</Button></DialogActions></Dialog>
  </Box>
}
