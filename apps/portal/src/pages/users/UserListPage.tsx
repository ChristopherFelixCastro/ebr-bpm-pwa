import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import type { CoreRole } from '@ebr-bpm/core-client'
import { companyRoles, letterColor, letterLabels, roleLabels, statusColor, statusLabels, usersApi, type PortalUser, type UserStatus } from '../../api/users'
import { routeForError, supportMessage } from '../../api/presentation'
import { CompanyPicker } from '../../components/CompanyPicker'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'

type CreateForm = { fullName: string; email: string; phone: string; password: string; roleCode: CoreRole; company: { id: string; legalName: string } | null }
const emptyForm: CreateForm = { fullName: '', email: '', phone: '', password: '', roleCode: 'EVALUATOR', company: null }

export function UserListPage() {
  const navigate = useNavigate()
  const { user, runWithReauthentication } = useSession()
  const { showError, showSuccess } = useNotification()
  const [users, setUsers] = useState<PortalUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | 'ALL'>('ALL')
  const [role, setRole] = useState<CoreRole | 'ALL'>('ALL')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  // ADMIN no administra ni descubre cuentas UNIVERSAL; Core lo impone igualmente.
  const assignableRoles = (Object.keys(roleLabels) as CoreRole[]).filter((code) => code !== 'UNIVERSAL' || user?.roleCode === 'UNIVERSAL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await usersApi.list({ page: page + 1, limit: rowsPerPage, ...(search ? { search } : {}), ...(status !== 'ALL' ? { status } : {}), ...(role !== 'ALL' ? { roleCode: role } : {}) })
      setUsers(result.data)
      setTotal(result.meta.total ?? result.data.length)
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'No fue posible cargar los usuarios.'))
    } finally { setLoading(false) }
  }, [navigate, page, role, rowsPerPage, search, showError, status])
  useEffect(() => { void load() }, [load])

  const applySearch = () => { setPage(0); setSearch(searchInput.trim()) }
  const create = async () => {
    const needsCompany = companyRoles.includes(form.roleCode)
    if (!form.fullName.trim() || !form.email.trim() || !form.password) return showError('Nombre, correo y contraseña temporal son obligatorios.')
    if (needsCompany && !form.company) return showError('Seleccione la empresa de la cuenta empresarial.')
    setSaving(true)
    try {
      const body = { fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), password: form.password, roleCode: form.roleCode,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), ...(needsCompany && form.company ? { companyId: form.company.id } : {}) }
      const created = await runWithReauthentication(() => usersApi.create(body))
      showSuccess('Cuenta creada en estado pendiente. Adjunte y valide su carta de autorización antes de aprobarla.')
      setOpen(false); setForm(emptyForm)
      navigate(`/configuracion/usuarios/${created.id}`)
    } catch (error) {
      if (!(error instanceof ReauthenticationCancelledError)) showError(supportMessage(error, 'No fue posible crear la cuenta.'))
    } finally { setSaving(false) }
  }

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', gap: 1, alignItems: 'center' }}><ManageAccountsIcon color="primary" />Usuarios</Typography>
        <Typography color="text.secondary">Cuentas del Core. La aprobación exige una carta de autorización válida.</Typography>
      </Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Crear usuario</Button>
    </Box>
    <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, borderBottom: '1px solid #E2E8F0' }}>
        <TextField fullWidth size="small" label="Buscar por nombre o correo" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applySearch() }} />
        <TextField select size="small" label="Estado" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value as UserStatus | 'ALL') }} sx={{ minWidth: 210 }}>
          <MenuItem value="ALL">Todos</MenuItem>
          {(Object.keys(statusLabels) as UserStatus[]).map((code) => <MenuItem key={code} value={code}>{statusLabels[code]}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Rol" value={role} onChange={(event) => { setPage(0); setRole(event.target.value as CoreRole | 'ALL') }} sx={{ minWidth: 210 }}>
          <MenuItem value="ALL">Todos</MenuItem>
          {assignableRoles.map((code) => <MenuItem key={code} value={code}>{roleLabels[code]}</MenuItem>)}
        </TextField>
        <Button variant="outlined" onClick={applySearch}>Buscar</Button>
      </Stack>
      <TableContainer><Table>
        <TableHead><TableRow><TableCell>Cuenta</TableCell><TableCell>Empresa</TableCell><TableCell>Estado</TableCell><TableCell>Carta de autorización</TableCell><TableCell>Registro</TableCell></TableRow></TableHead>
        <TableBody>{loading
          ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
          : users.length === 0
            ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No hay cuentas para los filtros seleccionados.</TableCell></TableRow>
            : users.map((account) => <TableRow hover key={account.id} onClick={() => navigate(`/configuracion/usuarios/${account.id}`)} sx={{ cursor: 'pointer' }}>
              <TableCell><Typography sx={{ fontWeight: 700 }}>{account.fullName}</Typography><Typography variant="caption" color="text.secondary">{roleLabels[account.roleCode]}</Typography></TableCell>
              <TableCell>{account.companyName ?? '—'}</TableCell>
              <TableCell><Chip size="small" color={statusColor(account.status)} label={statusLabels[account.status]} /></TableCell>
              <TableCell>{account.authorizationLetterStatus ? <Chip size="small" variant="outlined" color={letterColor(account.authorizationLetterStatus)} label={letterLabels[account.authorizationLetterStatus]} /> : <Typography variant="body2" color="text.secondary">Sin carta</Typography>}</TableCell>
              <TableCell>{new Date(account.createdAt).toLocaleDateString('es-DO')}</TableCell>
            </TableRow>)}
        </TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, value) => setPage(value)}
        onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Filas:" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
    </Card>

    <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Crear usuario</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        <TextField label="Nombre completo" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        <TextField label="Correo electrónico" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <TextField label="Teléfono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <TextField label="Contraseña temporal" type="password" required value={form.password} helperText="Mínimo según la política de contraseñas del Core." onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <TextField select label="Rol" value={form.roleCode} onChange={(event) => setForm({ ...form, roleCode: event.target.value as CoreRole, company: null })}
          helperText={form.roleCode === 'UNIVERSAL' ? 'Crear una cuenta UNIVERSAL solicitará confirmar su identidad.' : undefined}>
          {assignableRoles.map((code) => <MenuItem key={code} value={code}>{roleLabels[code]}</MenuItem>)}
        </TextField>
        {companyRoles.includes(form.roleCode) && <CompanyPicker required value={form.company} onChange={(company) => setForm({ ...form, company })} />}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button variant="contained" disabled={saving} onClick={() => void create()}>Crear cuenta pendiente</Button></DialogActions>
    </Dialog>
  </Box>
}
