import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import type { EvaluacionAnalitica, SolicitudRevision } from '../dominio/modelos';
import { servicioAnalitica } from '../servicios/analitica';
import { Cargando, ErrorVista } from '../componentes/EstadoVista';

export function Revision() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [evaluacion, setEvaluacion] = useState<EvaluacionAnalitica>();
  const [accion, setAccion] = useState<SolicitudRevision['accion']>('APROBAR');
  const [comentario, setComentario] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    servicioAnalitica.obtenerEvaluacion(id).then(setEvaluacion).catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo cargar la evaluación.'));
  }, [id]);

  const itemsCorregibles = useMemo(() => evaluacion?.items.filter((item) => item.corregible) ?? [], [evaluacion]);

  function alternar(idItem: string) {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(idItem)) siguiente.delete(idItem); else siguiente.add(idItem);
      return siguiente;
    });
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      await servicioAnalitica.revisarEvaluacion(id, { accion, comentario, itemsSenalados: [...seleccionados] });
      navegar(`/evaluaciones/${id}`);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo registrar la revisión.');
    } finally {
      setGuardando(false);
    }
  }

  if (!evaluacion && error) return <ErrorVista mensaje={error} />;
  if (!evaluacion) return <Cargando />;

  const requiereItems = accion !== 'APROBAR';

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Button component={Link} to={`/evaluaciones/${id}`} startIcon={<ArrowBackRoundedIcon />}>Volver al resultado</Button>
        <Typography variant="h1" sx={{ mt: 1 }}>Revisión de {evaluacion.codigo}</Typography>
        <Typography color="text.secondary">Registre una decisión trazable. Una devolución solo habilita los ítems seleccionados.</Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="h2" gutterBottom>Decisión</Typography>
          <RadioGroup row value={accion} onChange={(evento) => { setAccion(evento.target.value as SolicitudRevision['accion']); if (evento.target.value === 'APROBAR') setSeleccionados(new Set()); }}>
            <FormControlLabel value="APROBAR" control={<Radio />} label="Aprobar" />
            <FormControlLabel value="DEVOLVER" control={<Radio />} label="Devolver" />
            <FormControlLabel value="SOLICITAR_CORRECCION" control={<Radio />} label="Solicitar corrección" />
          </RadioGroup>
          <TextField fullWidth multiline minRows={3} label="Comentario obligatorio" value={comentario} onChange={(evento) => setComentario(evento.target.value)} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
      {requiereItems && (
        <Card>
          <CardContent>
            <Typography variant="h2" gutterBottom>Ítems que podrá corregir el técnico</Typography>
            <Typography color="text.secondary" paragraph>Seleccione únicamente los hallazgos incluidos en esta solicitud.</Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {itemsCorregibles.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.5, border: '1px solid #d9e3e6', borderRadius: 2 }}>
                  <Checkbox checked={seleccionados.has(item.id)} onChange={() => alternar(item.id)} inputProps={{ 'aria-label': `Seleccionar ${item.codigo}` }} />
                  <Box>
                    <Typography fontWeight={700}>{item.codigo} · {item.descripcion}</Typography>
                    <Typography variant="body2" color="text.secondary">Respuesta: {item.respuesta} · Criticidad: {item.criticidad ?? 'No indicada'}</Typography>
                    {item.observacion && <Typography variant="body2">{item.observacion}</Typography>}
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<SaveRoundedIcon />} disabled={guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Registrar decisión'}</Button>
      </Box>
    </Box>
  );
}
