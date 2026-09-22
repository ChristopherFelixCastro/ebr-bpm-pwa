import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CoreApiError,
  CoreClient,
  type CoreCalculation,
  type CoreInspection,
  type CoreReport,
  type CoreReview,
  type CoreUser,
  type CoreWorkPackage,
} from '@ebr-bpm/core-client';

const initialUrl = import.meta.env.VITE_CORE_API_URL || 'http://127.0.0.1:3000';

function fecha(value?: string | null) {
  return value ? new Date(value).toLocaleString('es-DO') : '—';
}

export function CoreEnVivo() {
  const [url, setUrl] = useState(initialUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [client, setClient] = useState<CoreClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<CoreUser | null>(null);
  const [inspections, setInspections] = useState<CoreInspection[]>([]);
  const [selected, setSelected] = useState<CoreInspection | null>(null);
  const [workPackage, setWorkPackage] = useState<CoreWorkPackage | null>(null);
  const [calculation, setCalculation] = useState<CoreCalculation | null>(null);
  const [reviews, setReviews] = useState<CoreReview[]>([]);
  const [reports, setReports] = useState<CoreReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkConnection() {
    setBusy(true);
    setError(null);
    setConnected(false);
    try {
      const next = new CoreClient(url);
      await next.health();
      setClient(next);
      setConnected(true);
    } catch (cause) {
      setClient(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar al Core.');
    } finally {
      setBusy(false);
    }
  }

  async function loadInspections(activeClient: CoreClient) {
    const result = await activeClient.inspections();
    setInspections(result.data);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const currentUser = await client.login(email, password);
      setPassword('');
      setUser(currentUser);
      await loadInspections(client);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el Core.');
    } finally {
      setBusy(false);
    }
  }

  async function selectInspection(inspection: CoreInspection) {
    if (!client) return;
    setBusy(true);
    setError(null);
    setSelected(inspection);
    setWorkPackage(null);
    setCalculation(null);
    setReviews([]);
    setReports([]);
    try {
      const [packageResult, calculationResult, reviewResult, reportResult] = await Promise.all([
        client.workPackage(inspection.id),
        client.calculation(inspection.id).catch((cause: unknown) => {
          if (cause instanceof CoreApiError && cause.status === 404) return null;
          throw cause;
        }),
        client.reviews(inspection.id),
        client.reports(inspection.id),
      ]);
      setWorkPackage(packageResult.data);
      setCalculation(calculationResult?.data ?? null);
      setReviews(reviewResult.data);
      setReports(reportResult.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la inspección.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={750} gutterBottom>Inspecciones del Core</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Consulta directa a la API publicada por Christopher: inspecciones, plantilla BPM,
        respuestas, cálculo vigente, revisiones e informes. El recorrido MVP mantiene
        sus datos semilla para enseñar una evaluación completa.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}><CardContent>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
          <TextField label="URL de la API Core" value={url} onChange={(event) => setUrl(event.target.value)}
            fullWidth size="small" disabled={busy || Boolean(user)} />
          <Button variant="outlined" onClick={checkConnection} disabled={busy || Boolean(user)}
            sx={{ whiteSpace: 'nowrap', minWidth: 190, flexShrink: 0 }}>Comprobar conexión</Button>
          <Chip label={connected ? 'Core disponible' : 'Core sin conectar'}
            color={connected ? 'success' : 'default'} sx={{ flexShrink: 0 }} />
        </Stack>
        {connected && !user && (
          <Box component="form" onSubmit={signIn} sx={{ mt: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Correo institucional" type="email" autoComplete="username" required
                size="small" value={email} onChange={(event) => setEmail(event.target.value)} />
              <TextField label="Contraseña" type="password" autoComplete="current-password" required
                size="small" value={password} onChange={(event) => setPassword(event.target.value)} />
              <Button type="submit" variant="contained" disabled={busy}>Ingresar al Core</Button>
            </Stack>
          </Box>
        )}
        {user && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Chip label={user.role} color="primary" size="small" />
            <Typography variant="body2">Sesión en memoria para esta pestaña</Typography>
            <Button onClick={() => client && loadInspections(client).catch((cause: unknown) =>
              setError(cause instanceof Error ? cause.message : 'No se pudo actualizar.'))}>Actualizar</Button>
            <Button onClick={() => {
              client?.disconnect();
              setUser(null);
              setInspections([]);
              setSelected(null);
            }}>Desconectar</Button>
          </Stack>
        )}
        {busy && <CircularProgress size={22} sx={{ mt: 2 }} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </CardContent></Card>

      {user && (
        <Stack spacing={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="h6">Inspecciones ({inspections.length})</Typography>
            {inspections.length === 0 && <Typography>Sin inspecciones visibles para este rol.</Typography>}
            {inspections.map((inspection) => (
              <Box key={inspection.id} sx={{ py: 1.5, borderTop: '1px solid #e2e8f0' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Chip label={inspection.status} size="small" />
                  <Typography variant="body2">{inspection.origin} · {fecha(inspection.createdAt)}</Typography>
                  <Button size="small" onClick={() => selectInspection(inspection)} disabled={busy}>Ver expediente</Button>
                </Stack>
                <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>
                  Inspección {inspection.id} · Caso {inspection.caseId}
                </Typography>
              </Box>
            ))}
          </CardContent></Card>

          {selected && workPackage && (
            <Card variant="outlined"><CardContent>
              <Typography variant="h6">Expediente {selected.id}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Estado {selected.status} · Versión {selected.version} · Plantilla {selected.bpmTemplateVersionId}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <Chip label={`${workPackage.responses.length} respuestas BPM`} />
                <Chip label={`${workPackage.bpmTemplate.items.filter((item) => item.isEvaluable).length} criterios evaluables`} />
                <Chip label={`${reviews.length} revisiones`} />
                <Chip label={`${reports.length} informes`} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={700}>Cálculo vigente</Typography>
              {calculation ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <Chip color="primary" label={`BPM ${calculation.bpmPercentage}%`} />
                  <Chip label={`Riesgo total ${calculation.totalRiskScore}`} />
                  <Chip label={`Frecuencia ${calculation.frequency}`} />
                  <Typography variant="body2">Calculado {fecha(calculation.calculatedAt)}</Typography>
                </Stack>
              ) : <Typography color="text.secondary" sx={{ mb: 2 }}>Aún no hay cálculo vigente.</Typography>}
              <Typography variant="subtitle1" fontWeight={700}>Revisiones</Typography>
              {reviews.length === 0 && <Typography color="text.secondary">Aún no hay ciclos de revisión.</Typography>}
              {reviews.map((review) => (
                <Typography key={review.id} variant="body2">
                  Ciclo {review.cycleNumber}: {review.status} · {fecha(review.createdAt)}
                </Typography>
              ))}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2 }}>Informes</Typography>
              {reports.length === 0 && <Typography color="text.secondary">Aún no hay informes.</Typography>}
              {reports.map((report) => (
                <Typography key={report.id} variant="body2">
                  {report.fileName} · {report.status} · {fecha(report.officialAt ?? report.generatedAt)}
                </Typography>
              ))}
            </CardContent></Card>
          )}
        </Stack>
      )}
    </Box>
  );
}
