import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Paper,
  CircularProgress,
  List,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { StatusChip } from '../../components/StatusChip';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { apiService } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import type { BPMRequest } from '../../types';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [request, setRequest] = useState<BPMRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequest = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiService.getRequestById(id);
      if (!data) {
        showError('Solicitud no encontrada');
        navigate('/requests');
        return;
      }
      setRequest(data);
    } catch {
      showError('Error al cargar detalle de solicitud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleSubmitDraft = async () => {
    if (!request) return;
    try {
      setSubmitting(true);
      const updated = await apiService.submitRequest(request.id);
      setRequest(updated);
      setSubmitConfirmOpen(false);
      showSuccess('¡Solicitud enviada a Coordinación! Estado: Pendiente de asignación');
    } catch (err: any) {
      showError(err.message || 'Error al enviar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#1E3A8A' }} />
      </Box>
    );
  }

  if (!request) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Box>
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/requests')}
        sx={{ mb: 2, color: '#475569', fontWeight: 600 }}
      >
        Volver a la Bandeja de Solicitudes
      </Button>

      {/* Header Banner */}
      <Card sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AssignmentIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                Solicitud: {request.requestNumber}
              </Typography>
              <Typography variant="caption" sx={{ color: '#BFDBFE' }}>
                Radicada el {new Date(request.createdAt).toLocaleDateString()} a las {new Date(request.createdAt).toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StatusChip status={request.status} size="medium" />

            {request.status === 'BORRADOR' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/requests/edit/${request.id}`)}
                  sx={{ bgcolor: '#FFFFFF', color: '#1E3A8A', borderColor: '#FFFFFF' }}
                >
                  Editar
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SendIcon />}
                  onClick={() => setSubmitConfirmOpen(true)}
                  sx={{ bgcolor: '#059669', color: '#FFFFFF', '&:hover': { bgcolor: '#047857' } }}
                >
                  Enviar Ahora
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column: Request Details */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
                Datos de la Solicitud y Establecimiento
              </Typography>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Empresa Solicitante
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                    {request.companyName}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Establecimiento / Sede Física
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                    {request.establishmentName}
                  </Typography>
                </Grid>

                <Grid size={12}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Dirección de Inspección
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0F172A' }}>
                    {request.establishmentAddress}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Tipo de Establecimiento
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0F172A' }}>
                    {request.establishmentType}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Motivo del Trámite
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0F172A' }}>
                    {request.reason}
                  </Typography>
                </Grid>

                <Grid size={12}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                    Observaciones y Alcance Registrado
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', fontStyle: request.observations ? 'normal' : 'italic' }}>
                    {request.observations || 'Sin observaciones registradas.'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Workflow Status Progression */}
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
                Trazabilidad del Flujo de Trabajo (EBR / BPM)
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircleIcon sx={{ color: '#166534' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                      1. Creación de Solicitud (Portal Web Admin - Iván)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Completada el {new Date(request.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {request.status !== 'BORRADOR' ? (
                    <CheckCircleIcon sx={{ color: '#166534' }} />
                  ) : (
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #CBD5E1' }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: request.status !== 'BORRADOR' ? 700 : 500, color: '#0F172A' }}>
                      2. Radicación Formal (Pendiente de asignación)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      {request.submittedAt ? `Radicada el ${new Date(request.submittedAt).toLocaleDateString()}` : 'En espera de confirmación de envío'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {['ASIGNADA', 'EN_PROGRESO', 'EN_REVISION', 'APROBADA'].includes(request.status) ? (
                    <CheckCircleIcon sx={{ color: '#166534' }} />
                  ) : (
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #CBD5E1' }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 500 }}>
                      3. Asignación y Programación de Técnico (Coordinador - Arismendy)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Asignación de fecha y técnico evaluador
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {['APROBADA', 'EN_REVISION'].includes(request.status) ? (
                    <CheckCircleIcon sx={{ color: '#166534' }} />
                  ) : (
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #CBD5E1' }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 500 }}>
                      4. Ejecución en Campo y Evaluación BPM (PWA Móvil - Josué)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Uploaded Documents */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                Documentos Adjuntos ({request.documents?.length || 0})
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
                Archivos técnicos certificados para auditoría sanitaria
              </Typography>

              {request.documents && request.documents.length > 0 ? (
                <List disablePadding>
                  {request.documents.map((doc) => (
                    <Paper
                      key={doc.id}
                      variant="outlined"
                      sx={{
                        p: 1.8,
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: '#F8FAFC',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                        <PictureAsPdfIcon sx={{ color: '#DC2626', fontSize: 28, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {doc.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                            {doc.documentType} • {formatBytes(doc.sizeBytes)}
                          </Typography>
                        </Box>
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => showSuccess(`Descargando copia verificada de "${doc.name}"`)}
                        sx={{ fontSize: '0.72rem', py: 0.3, px: 1, borderColor: '#CBD5E1', color: '#1E3A8A' }}
                      >
                        Descargar
                      </Button>
                    </Paper>
                  ))}
                </List>
              ) : (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  No se han adjuntado documentos obligatorios a este borrador.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog for Submission */}
      <ConfirmDialog
        open={submitConfirmOpen}
        title="¿Confirmar Envío a Coordinación?"
        message="La solicitud pasará al estado PENDIENTE_DE_ASIGNACION y ya no podrá ser modificada directamente."
        confirmText="Confirmar y Radicar"
        variant="info"
        loading={submitting}
        onConfirm={handleSubmitDraft}
        onClose={() => setSubmitConfirmOpen(false)}
      />
    </Box>
  );
};
