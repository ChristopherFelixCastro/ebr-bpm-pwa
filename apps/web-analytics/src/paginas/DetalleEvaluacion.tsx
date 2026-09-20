import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Divider, Typography } from '@mui/material';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import type { EvaluacionAnalitica } from '../dominio/modelos';
import { servicioAnalitica } from '../servicios/analitica';
import { Cargando, ErrorVista } from '../componentes/EstadoVista';
import { DetalleResultado } from '../componentes/DetalleResultado';
import { EstadoChip } from '../componentes/EstadoChip';
import { etiquetasAccionRevision, formatearFecha, formatearFechaHora } from '../utilidades/formato';

export function DetalleEvaluacion() {
  const { id = '' } = useParams();
  const [evaluacion, setEvaluacion] = useState<EvaluacionAnalitica>();
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    servicioAnalitica.obtenerEvaluacion(id).then(setEvaluacion).catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo cargar la evaluación.'));
  }, [id]);

  if (error && !evaluacion) return <ErrorVista mensaje={error} />;
  if (!evaluacion) return <Cargando />;

  const revisable = ['EN_REVISION', 'REENVIADA'].includes(evaluacion.estado);

  async function emitirInforme() {
    setProcesando(true);
    setError('');
    try {
      const actualizada = await servicioAnalitica.emitirInforme(evaluacion!.id);
      setEvaluacion(actualizada);
      setMensaje('El informe de demostración fue emitido desde el resultado aprobado.');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo emitir el informe.');
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarExpediente() {
    setProcesando(true);
    setError('');
    try {
      const actualizada = await servicioAnalitica.cerrarExpediente(evaluacion!.id);
      setEvaluacion(actualizada);
      setMensaje('El expediente de demostración quedó cerrado e inmutable.');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cerrar el expediente.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Button component={Link} to="/evaluaciones" startIcon={<ArrowBackRoundedIcon />}>Volver</Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h1">{evaluacion.codigo}</Typography>
          <Typography color="text.secondary">{evaluacion.empresa.razonSocial} · {evaluacion.establecimiento}</Typography>
        </Box>
        <EstadoChip estado={evaluacion.estado} />
        {revisable && <Button component={Link} to={`/evaluaciones/${evaluacion.id}/revision`} variant="contained" startIcon={<RateReviewRoundedIcon />}>Revisar</Button>}
        {evaluacion.estado === 'APROBADA' && !evaluacion.informe && <Button variant="contained" disabled={procesando} startIcon={<DescriptionRoundedIcon />} onClick={() => void emitirInforme()}>Emitir informe</Button>}
        {evaluacion.estado === 'APROBADA' && evaluacion.informe?.estado === 'OFICIAL' && <Button variant="contained" color="secondary" disabled={procesando} startIcon={<InventoryRoundedIcon />} onClick={() => void cerrarExpediente()}>Cerrar expediente</Button>}
      </Box>
      {mensaje && <Alert severity="success" onClose={() => setMensaje('')}>{mensaje}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Box><Typography variant="caption" color="text.secondary">Fecha de inspección</Typography><Typography fontWeight={650}>{formatearFecha(evaluacion.fechaInspeccion)}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Técnico evaluador</Typography><Typography fontWeight={650}>{evaluacion.tecnico}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">RNC</Typography><Typography fontWeight={650}>{evaluacion.empresa.rnc}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Dirección</Typography><Typography fontWeight={650}>{evaluacion.direccion}</Typography></Box>
        </CardContent>
      </Card>
      <DetalleResultado resultado={evaluacion.resultado} />
      <Card>
        <CardContent>
          <Typography variant="h2" gutterBottom>Historial de revisión</Typography>
          {evaluacion.revisiones.length === 0 ? <Typography color="text.secondary">Todavía no se han registrado decisiones de revisión.</Typography> : evaluacion.revisiones.map((revision, indice) => (
            <Box key={revision.id} sx={{ py: 1.5 }}>
              {indice > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography fontWeight={700}>{etiquetasAccionRevision[revision.accion]}</Typography>
              <Typography variant="body2">{revision.comentario}</Typography>
              <Typography variant="caption" color="text.secondary">{revision.revisor} · {formatearFechaHora(revision.fecha)}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
