import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import BlockIcon from '@mui/icons-material/Block'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { StatusChip } from '../../components/StatusChip'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { usersApi, companiesApi, type User, type Company } from '../../api/resources'
import { supportMessage, routeForError, isStaleVersion } from '../../api/presentation'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import { useReauthentication } from '../../context/ReauthenticationContext'
import { useNavigate } from 'react-router-dom'

export const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuth()
  const { showSuccess, showError } = useNotification()
  const { runWithReauthentication } = useReauthentication()
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0) // 0: Pendientes, 1: Todos
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleCode: 'COMPANY_ADMIN' as User['roleCode'],
    companyId: '',
  })
  const [companies, setCompanies] = useState<Company[]>([])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await usersApi.list({ page: 1, limit: 100, search: searchTerm || undefined })
      setUsers(res.data)
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'Error al cargar la lista de usuarios'))
    } finally {
      setLoading(false)
    }
  }, [searchTerm, navigate, showError])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const loadCompanies = async () => {
    try {
      const res = await companiesApi.list({ page: 1, limit: 100, status: 'ACTIVE' })
      setCompanies(res.data)
    } catch {
      // Ignorar fallo de carga de empresas si no hay permisos
    }
  }

  const handleApprove = async () => {
    if (!selectedUser) return
    try {
      setActionLoading(true)
      await runWithReauthentication(async () => {
        await usersApi.approve(selectedUser.id, selectedUser.version)
      })
      showSuccess(`El usuario "${selectedUser.fullName}" ha sido aprobado exitosamente`)
      setApproveConfirmOpen(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (err: unknown) {
      if (isStaleVersion(err)) {
        showError('La versión del usuario cambió. Se actualizará la lista.')
      } else {
        showError(supportMessage(err, 'Error al aprobar usuario'))
      }
      await fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedUser) return
    try {
      setActionLoading(true)
      await runWithReauthentication(async () => {
        await usersApi.reject(selectedUser.id, selectedUser.version)
      })
      showSuccess(`La solicitud de "${selectedUser.fullName}" ha sido rechazada`)
      setRejectDialogOpen(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (err: unknown) {
      if (isStaleVersion(err)) {
        showError('La versión del usuario cambió. Se actualizará la lista.')
      } else {
        showError(supportMessage(err, 'Error al rechazar usuario'))
      }
      await fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return
    try {
      setActionLoading(true)
      await runWithReauthentication(async () => {
        await usersApi.deactivate(selectedUser.id, selectedUser.version)
      })
      showSuccess(`El usuario "${selectedUser.fullName}" ha sido desactivado`)
      setDeactivateConfirmOpen(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (err: unknown) {
      if (isStaleVersion(err)) {
        showError('La versión del usuario cambió. Se actualizará la lista.')
      } else {
        showError(supportMessage(err, 'Error al desactivar usuario'))
      }
      await fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      setActionLoading(true)
      const payload = {
        fullName: createForm.fullName,
        email: createForm.email,
        phone: createForm.phone || undefined,
        password: createForm.password,
        roleCode: createForm.roleCode,
        companyId: ['COMPANY_ADMIN', 'DELEGATE'].includes(createForm.roleCode) ? createForm.companyId || undefined : undefined,
      }
      await runWithReauthentication(async () => {
        await usersApi.create(payload)
      })
      showSuccess('Usuario creado exitosamente en estado Pendiente de Validación')
      setCreateDialogOpen(false)
      setCreateForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        roleCode: 'COMPANY_ADMIN',
        companyId: '',
      })
      await fetchUsers()
    } catch (err: unknown) {
      showError(supportMessage(err, 'Error al crear el usuario'))
    } finally {
      setActionLoading(false)
    }
  }

  const pendingUsers = users.filter((u) => u.status === 'PENDING_VALIDATION')
  const displayedUsers = tabValue === 0 ? pendingUsers : users

  return (
    <Box>
      {/* Header section */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <AdminPanelSettingsIcon sx={{ color: '#1E3A8A', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Gestión y Aprobación de Usuarios
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Valide el acceso corporativo, administre estados del sistema EBR/BPM y asigne roles autorizados.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => {
            loadCompanies()
            setCreateDialogOpen(true)
          }}
          sx={{ bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#172554' } }}
        >
          Nuevo Usuario
        </Button>
      </Box>

      {/* Tabs and search bar */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #E2E8F0' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
            gap: 2,
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40, py: 0.5 },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Pendientes de Validación</span>
                  {pendingUsers.length > 0 && (
                    <Chip
                      label={pendingUsers.length}
                      size="small"
                      sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700, height: 20 }}
                    />
                  )}
                </Box>
              }
            />
            <Tab label={`Todos los Usuarios (${users.length})`} />
          </Tabs>

          <TextField
            placeholder="Buscar por nombre o correo..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94A3B8' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {/* Data Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Empresa Asociada</TableCell>
                <TableCell>Rol Asignado</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1E3A8A' }} />
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                      Cargando registros de usuarios...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" sx={{ color: '#0F172A', fontWeight: 600 }}>
                      No se encontraron usuarios
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                      {tabValue === 0
                        ? 'No hay usuarios pendientes de validación en este momento.'
                        : 'No hay usuarios que coincidan con la búsqueda.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: '#EFF6FF',
                            color: '#1E3A8A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                        >
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                            {user.fullName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 500 }}>
                        {user.companyName || 'Administración Central'}
                      </Typography>
                      {user.phone && (
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          Tel: {user.phone}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={user.roleCode}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: ['ADMIN', 'UNIVERSAL'].includes(user.roleCode) ? '#EFF6FF' : '#F1F5F9',
                          color: ['ADMIN', 'UNIVERSAL'].includes(user.roleCode) ? '#1E3A8A' : '#334155',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip status={user.status} />
                    </TableCell>

                    <TableCell align="right">
                      {user.status === 'PENDING_VALIDATION' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                            onClick={() => {
                              setSelectedUser(user)
                              setApproveConfirmOpen(true)
                            }}
                            sx={{
                              bgcolor: '#166534',
                              '&:hover': { bgcolor: '#14532D' },
                              fontSize: '0.78rem',
                              py: 0.5,
                            }}
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
                            onClick={() => {
                              setSelectedUser(user)
                              setRejectDialogOpen(true)
                            }}
                            sx={{
                              color: '#991B1B',
                              borderColor: '#FECACA',
                              '&:hover': { bgcolor: '#FEF2F2', borderColor: '#F87171' },
                              fontSize: '0.78rem',
                              py: 0.5,
                            }}
                          >
                            Rechazar
                          </Button>
                        </Box>
                      ) : user.status === 'APPROVED' ? (
                        <IconButton
                          size="small"
                          color="error"
                          title="Desactivar usuario"
                          onClick={() => {
                            setSelectedUser(user)
                            setDeactivateConfirmOpen(true)
                          }}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          Sin acciones
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Confirmation for Approval */}
      <ConfirmDialog
        open={approveConfirmOpen}
        title="¿Aprobar Acceso de Usuario?"
        message={`Está a punto de autorizar al usuario "${selectedUser?.fullName}" con rol "${selectedUser?.roleCode}". Esta acción requiere reautenticación.`}
        confirmText="Aprobar Usuario"
        variant="success"
        loading={actionLoading}
        onConfirm={handleApprove}
        onClose={() => setApproveConfirmOpen(false)}
      />

      {/* Confirmation for Rejection */}
      <ConfirmDialog
        open={rejectDialogOpen}
        title="¿Rechazar Solicitud de Usuario?"
        message={`Está a punto de rechazar la solicitud de acceso para "${selectedUser?.fullName}". Esta acción requiere reautenticación.`}
        confirmText="Confirmar Rechazo"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleReject}
        onClose={() => setRejectDialogOpen(false)}
      />

      {/* Confirmation for Deactivation */}
      <ConfirmDialog
        open={deactivateConfirmOpen}
        title="¿Desactivar Usuario?"
        message={`Está a punto de revocar el acceso para "${selectedUser?.fullName}". Se revocarán todas sus sesiones activas.`}
        confirmText="Desactivar Usuario"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeactivate}
        onClose={() => setDeactivateConfirmOpen(false)}
      />

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Crear Nuevo Usuario</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Nombre Completo"
              size="small"
              fullWidth
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              required
            />
            <TextField
              label="Correo Electrónico"
              type="email"
              size="small"
              fullWidth
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
            <TextField
              label="Teléfono"
              size="small"
              fullWidth
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
            <TextField
              label="Contraseña Temporal"
              type="password"
              size="small"
              fullWidth
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              helperText="Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo."
              required
            />
            <TextField
              select
              label="Rol"
              size="small"
              fullWidth
              value={createForm.roleCode}
              onChange={(e) => setCreateForm({ ...createForm, roleCode: e.target.value as User['roleCode'] })}
              required
            >
              <MenuItem value="COMPANY_ADMIN">Administrador de Empresa</MenuItem>
              <MenuItem value="DELEGATE">Usuario Delegado</MenuItem>
              <MenuItem value="COORDINATOR">Coordinador</MenuItem>
              <MenuItem value="EVALUATOR">Técnico Evaluador</MenuItem>
              <MenuItem value="ADMIN">Administrador Central</MenuItem>
              {currentUser?.roleCode === 'UNIVERSAL' && (
                <MenuItem value="UNIVERSAL">Rol Universal</MenuItem>
              )}
            </TextField>

            {['COMPANY_ADMIN', 'DELEGATE'].includes(createForm.roleCode) && (
              <TextField
                select
                label="Empresa Asociada"
                size="small"
                fullWidth
                value={createForm.companyId}
                onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}
                required
              >
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.legalName} ({c.rnc || 'Sin RNC'})
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={actionLoading || !createForm.fullName || !createForm.email || !createForm.password || (['COMPANY_ADMIN', 'DELEGATE'].includes(createForm.roleCode) && !createForm.companyId)}
            sx={{ bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#172554' } }}
          >
            {actionLoading ? 'Creando...' : 'Crear Usuario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
