import React, { useState, useEffect } from 'react';
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
  Paper,
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
  Alert,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { StatusChip } from '../../components/StatusChip';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import type { User } from '../../types';

export const UserManagementPage: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0: Pendientes de Validación, 1: Todos
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [letterDialogOpen, setLetterDialogOpen] = useState(false);

  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers();
      setUsers(data);
    } catch {
      showError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (currentRole !== 'ADMINISTRADOR' && currentRole !== 'UNIVERSAL') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Acceso Restringido (403)
          </Typography>
          <Typography variant="body2">
            La gestión y aprobación de usuarios es exclusiva del Administrador Central. Puede cambiar de rol en la barra superior para probar esta función.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const pendingUsers = users.filter((u) => u.status === 'PENDIENTE_VALIDACION');
  const filteredUsers = (tabValue === 0 ? pendingUsers : users).filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.identityNumber.includes(searchTerm) ||
      (u.companyName && u.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApprove = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await apiService.approveUser(selectedUser.id, currentUser?.fullName || 'Administrador Central');
      showSuccess(`El usuario "${selectedUser.fullName}" ha sido aprobado exitosamente`);
      setApproveConfirmOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      showError(err.message || 'Error al aprobar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      showError('Debe ingresar un motivo para el rechazo de la solicitud');
      return;
    }
    try {
      setActionLoading(true);
      await apiService.rejectUser(
        selectedUser.id,
        rejectionReason,
        currentUser?.fullName || 'Administrador Central'
      );
      showSuccess(`La solicitud de "${selectedUser.fullName}" ha sido rechazada`);
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      showError(err.message || 'Error al rechazar usuario');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box>
      {/* Header section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <AdminPanelSettingsIcon sx={{ color: '#1E3A8A', fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
            Gestión y Aprobación de Usuarios
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#475569' }}>
          Valide las solicitudes de acceso corporativo, inspeccione las cartas de autorización y gestione los roles del sistema EBR/BPM.
        </Typography>
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
                  <span>Bandeja de Validación</span>
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
            placeholder="Buscar por nombre, correo, cédula o empresa..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: { xs: '100%', sm: 340 } }}
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
                <TableCell>Usuario / Identificación</TableCell>
                <TableCell>Empresa Asociada</TableCell>
                <TableCell>Rol Solicitado</TableCell>
                <TableCell>Carta Poder / Adjunto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones de Validación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1E3A8A' }} />
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                      Cargando registros de usuarios...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" sx={{ color: '#0F172A', fontWeight: 600 }}>
                      No se encontraron usuarios
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                      {tabValue === 0
                        ? 'No hay registros pendientes de validación en este momento.'
                        : 'No hay usuarios que coincidan con la búsqueda.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
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
                            {user.email} • Céd: {user.identityNumber}
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
                        label={user.role}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: user.role === 'ADMINISTRADOR' ? '#EFF6FF' : '#F1F5F9',
                          color: user.role === 'ADMINISTRADOR' ? '#1E3A8A' : '#334155',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {user.authorizationLetterName ? (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdfIcon sx={{ color: '#DC2626' }} />}
                          onClick={() => {
                            setSelectedUser(user);
                            setLetterDialogOpen(true);
                          }}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.78rem',
                            py: 0.3,
                            px: 1,
                            borderColor: '#CBD5E1',
                          }}
                        >
                          Ver Carta
                        </Button>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          No requerida
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusChip status={user.status} />
                    </TableCell>

                    <TableCell align="right">
                      {user.status === 'PENDIENTE_VALIDACION' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                            onClick={() => {
                              setSelectedUser(user);
                              setApproveConfirmOpen(true);
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
                              setSelectedUser(user);
                              setRejectDialogOpen(true);
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
                      ) : (
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          {user.reviewedBy ? `Validado por ${user.reviewedBy}` : 'Activo'}
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

      {/* Preview Dialog for Authorization Letter */}
      <Dialog
        open={letterDialogOpen}
        onClose={() => setLetterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PictureAsPdfIcon sx={{ color: '#DC2626', fontSize: 30 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Carta de Autorización / Designación
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Documento acreditativo de representación jurídica
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              bgcolor: '#F8FAFC',
              borderColor: '#CBD5E1',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 60, color: '#DC2626', mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
              {selectedUser?.authorizationLetterName || 'Documento_Poder_Corporativo.pdf'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              Tipo: application/pdf • Tamaño: 2.4 MB • Integridad validada (Hash SHA-256)
            </Typography>

            <Alert severity="info" sx={{ textAlign: 'left', mb: 2, fontSize: '0.85rem', borderRadius: 2 }}>
              <strong>Certificación de Validación:</strong> El documento fue cargado directamente con firma del Representante Legal para la empresa <strong>{selectedUser?.companyName}</strong>.
            </Alert>

            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                showSuccess('Descargando copia autorizada para inspección...');
              }}
              sx={{ borderColor: '#1E3A8A', color: '#1E3A8A' }}
            >
              Descargar Copia Verificada
            </Button>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLetterDialogOpen(false)} variant="outlined" color="secondary">
            Cerrar Visor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation for Approval */}
      <ConfirmDialog
        open={approveConfirmOpen}
        title="¿Aprobar Acceso de Usuario?"
        message={`Está a punto de autorizar al usuario "${selectedUser?.fullName}" como "${selectedUser?.role}" para la empresa "${selectedUser?.companyName}". Se habilitará su acceso a la plataforma.`}
        confirmText="Aprobar y Notificar"
        variant="success"
        loading={actionLoading}
        onConfirm={handleApprove}
        onClose={() => setApproveConfirmOpen(false)}
      />

      {/* Dialog for Rejection Reason */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#991B1B' }}>
          Rechazar Solicitud de Usuario
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            Indique la razón del rechazo para registrarla en la auditoría inmutable del sistema:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Ej. La carta de autorización no cuenta con sello notarial vigente..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRejectDialogOpen(false)} variant="outlined" color="secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            disabled={actionLoading || !rejectionReason.trim()}
            sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}
          >
            {actionLoading ? 'Procesando...' : 'Confirmar Rechazo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
