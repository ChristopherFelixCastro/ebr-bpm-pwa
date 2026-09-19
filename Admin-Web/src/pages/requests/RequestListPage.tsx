import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Button,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Tooltip,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { StatusChip } from '../../components/StatusChip';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import type { BPMRequest } from '../../types';

export const RequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, activeCompanyId } = useAuth();
  const { showError } = useNotification();

  const [requests, setRequests] = useState<BPMRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRequests(
        currentRole === 'ADMIN_EMPRESA' || currentRole === 'DELEGADO' ? activeCompanyId || undefined : undefined
      );
      setRequests(data);
    } catch {
      showError('Error al cargar listado de solicitudes BPM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentRole, activeCompanyId]);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.establishmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginated = filteredRequests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <AssignmentIcon sx={{ color: '#1E3A8A', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Bandeja de Solicitudes BPM
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Consulte el estado, documentos adjuntos y trazabilidad de los trámites de evaluación higiénico-sanitaria.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/requests/new')}
          sx={{
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            '&:hover': { bgcolor: '#1E40AF' },
            px: 2.5,
            py: 1,
          }}
        >
          Nueva Solicitud
        </Button>
      </Box>

      {/* CRUD Container */}
      <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
        {/* Filters */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { md: 'center' },
            gap: 2,
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <TextField
            placeholder="Buscar por número de solicitud, empresa, sede o motivo..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: { xs: '100%', md: 450 } }}
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
              Estado:
            </Typography>
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ width: 220 }}
            >
              <MenuItem value="ALL">Todos los Estados</MenuItem>
              <MenuItem value="BORRADOR">Borrador</MenuItem>
              <MenuItem value="PENDIENTE_DE_ASIGNACION">Pendiente de asignación</MenuItem>
              <MenuItem value="ASIGNADA">Asignada</MenuItem>
              <MenuItem value="EN_PROGRESO">En progreso</MenuItem>
              <MenuItem value="APROBADA">Aprobada</MenuItem>
            </TextField>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No. Solicitud</TableCell>
                <TableCell>Empresa / Razón Social</TableCell>
                <TableCell>Establecimiento / Sede</TableCell>
                <TableCell>Motivo de Inspección</TableCell>
                <TableCell align="center">Documentos</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1E3A8A' }} />
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                      Cargando solicitudes BPM...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" sx={{ color: '#0F172A', fontWeight: 600 }}>
                      No se encontraron solicitudes
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                      Cree una nueva solicitud utilizando el botón superior.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: '#0F172A',
                          cursor: 'pointer',
                          '&:hover': { color: '#3B82F6' },
                        }}
                        onClick={() => navigate(`/requests/${req.id}`)}
                      >
                        {req.requestNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        {req.companyName}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0F172A' }}>
                        {req.establishmentName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        {req.establishmentType}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#475569',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {req.reason}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title={`${req.documents?.length || 0} archivos obligatorios cargados`}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#475569' }}>
                          <AttachFileIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {req.documents?.length || 0}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <StatusChip status={req.status} />
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/requests/${req.id}`)}
                            sx={{ color: '#3B82F6' }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {req.status === 'BORRADOR' && (
                          <Tooltip title="Editar y completar borrador">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/requests/edit/${req.id}`)}
                              sx={{ color: '#3B82F6' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ borderTop: '1px solid #E2E8F0' }}
        />
      </Card>
    </Box>
  );
};
