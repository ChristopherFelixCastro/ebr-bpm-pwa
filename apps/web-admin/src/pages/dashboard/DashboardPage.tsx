import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { StatusChip } from '../../components/StatusChip';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import type { BPMRequest, EvaluationRecord, Company } from '../../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, activeCompanyId } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<BPMRequest[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const targetCompId =
          currentRole === 'ADMIN_EMPRESA' || currentRole === 'DELEGADO'
            ? activeCompanyId || 'comp-1'
            : undefined;

        const [reqs, evals, comps] = await Promise.all([
          apiService.getRequests(targetCompId),
          apiService.getEvaluations(targetCompId),
          apiService.getCompanies(),
        ]);

        setRequests(reqs);
        setEvaluations(evals);

        if (targetCompId) {
          const matched = comps.find((c) => c.id === targetCompId);
          setCompany(matched || comps[0]);
        } else {
          setCompany(comps[0]);
        }
      } catch {
        showError('Error al cargar datos del panel');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [currentRole, activeCompanyId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#1E3A8A' }} />
      </Box>
    );
  }

  const totalRequests = requests.length;
  const draftRequests = requests.filter((r) => r.status === 'BORRADOR').length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDIENTE_DE_ASIGNACION').length;
  const approvedEvaluations = evaluations.filter((e) => e.status === 'APROBADA').length;

  return (
    <Box>
      {/* Top Welcome Banner */}
      <Box
        sx={{
          p: 3.5,
          mb: 3.5,
          borderRadius: 2.5,
          bgcolor: '#1E3A8A', // Barra/Banner Fondo #1E3A8A institucional
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
          boxShadow: '0 4px 12px rgba(30, 58, 138, 0.15)',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
              Tablero de Control: {currentRole === 'ADMINISTRADOR' ? 'Portal Central EBR/BPM' : company?.legalName || 'Empresa'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#BFDBFE' }}>
            {currentRole === 'ADMINISTRADOR'
              ? 'Supervisión general de solicitudes, empresas y validaciones de identidad.'
              : `RNC: ${company?.rnc} • Gestión de solicitudes higiénico-sanitarias y Buenas Prácticas.`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/requests/new')}
            sx={{
              bgcolor: '#FFFFFF',
              color: '#1E3A8A',
              fontWeight: 700,
              '&:hover': { bgcolor: '#F1F5F9' },
              px: 2.5,
            }}
          >
            Radicar Solicitud BPM
          </Button>

          {currentRole !== 'ADMINISTRADOR' && company && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/companies/${company.id}`)}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.4)',
                color: '#FFFFFF',
                fontWeight: 600,
                '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              Mis Establecimientos
            </Button>
          )}
        </Box>
      </Box>

      {/* KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Metric 1 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Solicitudes
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#EFF6FF', color: '#1E3A8A' }}>
                  <AssignmentIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {totalRequests}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                Trámites radicados en plataforma
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Metric 2 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Borradores Activos
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F1F5F9', color: '#64748B' }}>
                  <HourglassEmptyIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#64748B' }}>
                {draftRequests}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                Pendientes de envío final
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Metric 3 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Pendiente Asignación
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#FEF3C7', color: '#D97706' }}>
                  <HourglassEmptyIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706' }}>
                {pendingRequests}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                En cola de Coordinador
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Metric 4 */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Evaluaciones Concluidas
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#DCFCE7', color: '#15803D' }}>
                  <CheckCircleIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803D' }}>
                {approvedEvaluations}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                Con informe oficial disponible
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Grid: Solicitudes Recientes & Evaluaciones Anteriores */}
      <Grid container spacing={3}>
        {/* Table 1: Historial de Solicitudes Radicadas */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Box
              sx={{
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Historial de Solicitudes BPM Radicadas
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569' }}>
                  Estado de trámites y asignaciones vigentes
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={() => navigate('/requests')}
              >
                Ver Todas
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>No. Solicitud</TableCell>
                    <TableCell>Establecimiento</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.slice(0, 5).map((req) => (
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
                        <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 600 }}>
                          {req.establishmentName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          {req.companyName}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 160 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#475569',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {req.reason}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <StatusChip status={req.status} />
                      </TableCell>

                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/requests/${req.id}`)}
                          sx={{ color: '#3B82F6' }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Table 2: Evaluaciones Anteriores e Historial de Informes */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Box
              sx={{
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Evaluaciones Anteriores y Calificaciones
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569' }}>
                  Resultados del motor de riesgo y actas oficiales
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2 }}>
              {evaluations.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 3 }}>
                  No se registran evaluaciones cerradas para esta empresa.
                </Typography>
              ) : (
                evaluations.map((ev) => (
                  <Paper
                    key={ev.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 1.5,
                      borderRadius: 2,
                      bgcolor: '#F8FAFC',
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {ev.establishmentName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Inspección: {ev.inspectionDate} • Evaluador: {ev.evaluatorName}
                        </Typography>
                      </Box>

                      <Chip
                        label={`${ev.scorePercentage}% BPM`}
                        size="small"
                        sx={{
                          bgcolor: ev.scorePercentage >= 85 ? '#DCFCE7' : '#FEF3C7',
                          color: ev.scorePercentage >= 85 ? '#15803D' : '#B45309',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>

                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1.5 }}>
                      {ev.summaryFindings}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={`Riesgo: ${ev.riskLevel}`}
                          size="small"
                          sx={{
                            fontSize: '0.68rem',
                            height: 20,
                            bgcolor: ev.riskLevel === 'BAJO' ? '#EFF6FF' : '#FEF3C7',
                            color: ev.riskLevel === 'BAJO' ? '#1E3A8A' : '#B45309',
                          }}
                        />
                        <Chip
                          label={`Puntaje EBR: ${ev.riskScore}`}
                          size="small"
                          sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#F1F5F9', color: '#475569' }}
                        />
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon sx={{ color: '#DC2626', fontSize: 16 }} />}
                        onClick={() => showSuccess('Descargando Informe Oficial de Evaluación BPM...')}
                        sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderColor: '#CBD5E1', color: '#1E3A8A' }}
                      >
                        Informe PDF
                      </Button>
                    </Box>
                  </Paper>
                ))
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
