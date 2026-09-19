import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import { FilePicker } from '../../components/FilePicker';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusChip } from '../../components/StatusChip';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import type { Company, Establishment, RequestDocument } from '../../types';

export const RequestFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentRole, activeCompanyId } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Available options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);

  // Form states
  const [requestId, setRequestId] = useState<string | undefined>(id);
  const [requestNumber, setRequestNumber] = useState<string>('NUEVA');
  const [status, setStatus] = useState<string>('BORRADOR');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [establishmentType, setEstablishmentType] = useState<string>('Planta Procesadora Industrial');
  const [reason, setReason] = useState<string>('Certificación Inicial de Buenas Prácticas de Manufactura');
  const [observations, setObservations] = useState<string>('');
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const comps = await apiService.getCompanies();
        setCompanies(comps);

        let initialCompId = comps[0]?.id || '';
        if (activeCompanyId && comps.some((c) => c.id === activeCompanyId)) {
          initialCompId = activeCompanyId;
        }
        setSelectedCompanyId(initialCompId);

        const ests = await apiService.getEstablishments(initialCompId);
        setEstablishments(ests);
        if (ests.length > 0) {
          setSelectedEstablishmentId(ests[0].id);
        }

        // If editing existing draft
        if (id) {
          const req = await apiService.getRequestById(id);
          if (req) {
            setRequestId(req.id);
            setRequestNumber(req.requestNumber);
            setStatus(req.status);
            setSelectedCompanyId(req.companyId);
            const reqEsts = await apiService.getEstablishments(req.companyId);
            setEstablishments(reqEsts);
            setSelectedEstablishmentId(req.establishmentId);
            setEstablishmentType(req.establishmentType);
            setReason(req.reason);
            setObservations(req.observations || '');
            setDocuments(req.documents || []);
            setLastSavedTime(req.updatedAt);
          }
        }
      } catch {
        showError('Error al inicializar formulario de solicitud');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, activeCompanyId]);

  const handleCompanyChange = async (newCompId: string) => {
    setSelectedCompanyId(newCompId);
    const ests = await apiService.getEstablishments(newCompId);
    setEstablishments(ests);
    if (ests.length > 0) {
      setSelectedEstablishmentId(ests[0].id);
    } else {
      setSelectedEstablishmentId('');
    }
  };

  const handleDocumentUploaded = (doc: RequestDocument) => {
    setDocuments((prev) => [...prev.filter((d) => d.documentType !== doc.documentType), doc]);
  };

  const handleDocumentRemoved = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSaveDraft = async () => {
    const company = companies.find((c) => c.id === selectedCompanyId);
    const establishment = establishments.find((e) => e.id === selectedEstablishmentId);

    if (!company || !establishment) {
      showError('Seleccione empresa y establecimiento');
      return;
    }

    try {
      setSavingDraft(true);
      const saved = await apiService.saveRequestDraft({
        id: requestId,
        companyId: company.id,
        companyName: company.legalName,
        establishmentId: establishment.id,
        establishmentName: establishment.name,
        establishmentAddress: `${establishment.address}, ${establishment.municipality}, ${establishment.province}`,
        establishmentType,
        reason,
        observations,
        documents,
      });

      setRequestId(saved.id);
      setRequestNumber(saved.requestNumber);
      setStatus(saved.status);
      setLastSavedTime(saved.updatedAt);
      showSuccess(`Borrador guardado exitosamente (${saved.requestNumber})`);
    } catch (err: any) {
      showError(err.message || 'Error al guardar el borrador');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (documents.length === 0) {
      showError('Debe adjuntar al menos un documento obligatorio antes de enviar');
      return;
    }

    try {
      setSubmitting(true);
      const company = companies.find((c) => c.id === selectedCompanyId);
      const establishment = establishments.find((e) => e.id === selectedEstablishmentId);

      if (!company || !establishment) {
        showError('Seleccione empresa y establecimiento');
        return;
      }

      // First ensure draft is saved
      const saved = await apiService.saveRequestDraft({
        id: requestId,
        companyId: company.id,
        companyName: company.legalName,
        establishmentId: establishment.id,
        establishmentName: establishment.name,
        establishmentAddress: `${establishment.address}, ${establishment.municipality}, ${establishment.province}`,
        establishmentType,
        reason,
        observations,
        documents,
      });

      // Submit and change status to PENDIENTE_DE_ASIGNACION
      const submitted = await apiService.submitRequest(saved.id);
      setStatus(submitted.status);
      setConfirmOpen(false);
      showSuccess(`¡Solicitud enviada exitosamente! Nuevo estado: Pendiente de asignación`);
      navigate('/requests');
    } catch (err: any) {
      showError(err.message || 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadySubmitted = status !== 'BORRADOR';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#1E3A8A' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Top action header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/requests')}
          sx={{ color: '#475569', fontWeight: 600 }}
        >
          Volver a Solicitudes
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {lastSavedTime && (
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Último guardado: {new Date(lastSavedTime).toLocaleTimeString()}
            </Typography>
          )}
          <StatusChip status={status} size="medium" />
        </Box>
      </Box>

      {/* Main Form Container */}
      <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
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
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              Radicación de Solicitud de Evaluación BPM
            </Typography>
            <Typography variant="caption" sx={{ color: '#BFDBFE' }}>
              Número de Expediente: <strong>{requestNumber}</strong> • Sujeto a Evaluación Basada en Riesgo (EBR)
            </Typography>
          </Box>
        </Box>

        {isAlreadySubmitted && (
          <Alert severity="info" sx={{ m: 3, borderRadius: 2 }}>
            Esta solicitud ya fue radicada formalmente y se encuentra en estado{' '}
            <strong>PENDIENTE_DE_ASIGNACION</strong>. Los campos quedan bloqueados para proteger la trazabilidad.
          </Alert>
        )}

        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          {/* Section 1: Empresa y Establecimiento */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
            1. Empresa y Establecimiento Objeto de Inspección
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" sx={{ color: '#0F172A', mb: 0.5 }}>
                Empresa Solicitante *
              </Typography>
              <TextField
                select
                fullWidth
                disabled={isAlreadySubmitted || currentRole === 'ADMIN_EMPRESA' || currentRole === 'DELEGADO'}
                value={selectedCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
              >
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.legalName} (RNC: {c.rnc})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" sx={{ color: '#0F172A', mb: 0.5 }}>
                Establecimiento / Sede Física a Inspeccionar *
              </Typography>
              <TextField
                select
                fullWidth
                disabled={isAlreadySubmitted}
                value={selectedEstablishmentId}
                onChange={(e) => setSelectedEstablishmentId(e.target.value)}
              >
                {establishments.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name} — Permiso: {e.permitNo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" sx={{ color: '#0F172A', mb: 0.5 }}>
                Tipo de Establecimiento *
              </Typography>
              <TextField
                select
                fullWidth
                disabled={isAlreadySubmitted}
                value={establishmentType}
                onChange={(e) => setEstablishmentType(e.target.value)}
              >
                <MenuItem value="Planta Procesadora Industrial">Planta Procesadora Industrial</MenuItem>
                <MenuItem value="Centro de Envasado y Fraccionamiento">Centro de Envasado y Fraccionamiento</MenuItem>
                <MenuItem value="Planta Cárnica de Alta Capacidad">Planta Cárnica de Alta Capacidad</MenuItem>
                <MenuItem value="Molino de Granos y Harinas">Molino de Granos y Harinas</MenuItem>
                <MenuItem value="Centro de Distribución Refrigerado">Centro de Distribución Refrigerado</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" sx={{ color: '#0F172A', mb: 0.5 }}>
                Motivo de la Solicitud *
              </Typography>
              <TextField
                select
                fullWidth
                disabled={isAlreadySubmitted}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <MenuItem value="Certificación Inicial de Buenas Prácticas de Manufactura">
                  Certificación Inicial de Buenas Prácticas de Manufactura
                </MenuItem>
                <MenuItem value="Renovación Periódica de Certificación BPM">
                  Renovación Periódica de Certificación BPM
                </MenuItem>
                <MenuItem value="Inspección de Vigilancia Sanitaria y BPM">
                  Inspección de Vigilancia Sanitaria y BPM
                </MenuItem>
                <MenuItem value="Ampliación de Línea de Producción">
                  Ampliación de Línea de Producción
                </MenuItem>
              </TextField>
            </Grid>

            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ color: '#0F172A', mb: 0.5 }}>
                Observaciones y Alcance Específico
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                disabled={isAlreadySubmitted}
                placeholder="Detalle los productos procesados, horarios de operación, contacto en planta para coordinar la inspección..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 4 }} />

          {/* Section 2: Documentación Obligatoria */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              2. Documentación Técnica Obligatoria
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
              Cargue los documentos acreditativos en formato PDF o imagen (máx. 5 MB por archivo). Cada archivo se valida inmediatamente.
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FilePicker
                label="Memoria Técnica de Procesos y Fichas"
                documentType="Memoria Técnica"
                required
                helperText="Descripción del proceso productivo, equipos y flujograma"
                existingDocument={documents.find((d) => d.documentType === 'Memoria Técnica')}
                onFileUploaded={handleDocumentUploaded}
                onFileRemoved={handleDocumentRemoved}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FilePicker
                label="Plano Arquitectónico o Diagrama de Flujo"
                documentType="Plano del Establecimiento"
                required
                helperText="Distribución de áreas limpias, sucias y líneas de personal"
                existingDocument={documents.find((d) => d.documentType === 'Plano del Establecimiento')}
                onFileUploaded={handleDocumentUploaded}
                onFileRemoved={handleDocumentRemoved}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FilePicker
                label="Certificados Médicos y de Manipuladores"
                documentType="Certificados de Manipulación"
                required={false}
                helperText="Certificados de salud ocupacional del personal de planta"
                existingDocument={documents.find((d) => d.documentType === 'Certificados de Manipulación')}
                onFileUploaded={handleDocumentUploaded}
                onFileRemoved={handleDocumentRemoved}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FilePicker
                label="Manual BPM / Plan HACCP (Opcional)"
                documentType="Manual BPM/HACCP"
                required={false}
                helperText="Procedimientos POES y plan preventivo"
                existingDocument={documents.find((d) => d.documentType === 'Manual BPM/HACCP')}
                onFileUploaded={handleDocumentUploaded}
                onFileRemoved={handleDocumentRemoved}
              />
            </Grid>
          </Grid>

          {/* Action Buttons: Principal and Secondary strictly following color rules */}
          {!isAlreadySubmitted && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pt: 3,
                borderTop: '1px solid #E2E8F0',
              }}
            >
              {/* Botón Secundario: Fondo #FFFFFF, borde #E2E8F0, texto #475569 */}
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
                disabled={savingDraft}
                sx={{
                  bgcolor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  color: '#475569',
                  '&:hover': { bgcolor: '#F1F5F9' },
                }}
              >
                {savingDraft ? 'Guardando...' : 'Guardar Borrador'}
              </Button>

              {/* Botón Principal: Fondo #1E3A8A con texto #FFFFFF */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
                sx={{
                  bgcolor: '#1E3A8A',
                  color: '#FFFFFF',
                  '&:hover': { bgcolor: '#1E40AF' },
                  px: 3,
                  py: 1.1,
                }}
              >
                Enviar Solicitud
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog before submitting request */}
      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar Envío de Solicitud BPM?"
        message={`Al radicar formalmente esta solicitud, su estado pasará a "PENDIENTE_DE_ASIGNACION" y se transferirá a la bandeja del Coordinador (Arismendy). Verifique que los documentos adjuntos correspondan a la planta seleccionada.`}
        confirmText="Confirmar y Enviar"
        variant="info"
        loading={submitting}
        onConfirm={handleConfirmSubmit}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
};
