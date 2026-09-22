import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { EstadoEvaluacion, EvaluacionAnalitica, FiltrosEvaluaciones, NivelRiesgo } from '../dominio/modelos';
import { servicioAnalitica } from '../servicios/analitica';
import { EstadoChip, RiesgoChip } from '../componentes/EstadoChip';
import { Cargando, ErrorVista, Vacio } from '../componentes/EstadoVista';
import { etiquetasEstado, formatearFecha } from '../utilidades/formato';

export function Evaluaciones() {
  const [filtros, setFiltros] = useState<FiltrosEvaluaciones>({});
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionAnalitica[]>();
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const resultado = await servicioAnalitica.listarEvaluaciones(filtros);
      setEvaluaciones(resultado.items);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudieron cargar las evaluaciones.');
    }
  }, [filtros]);

  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="h1">Evaluaciones</Typography>
        <Typography color="text.secondary">Consulte resultados y abra los expedientes disponibles para revisión.</Typography>
      </Box>
      <Card>
        <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Empresa, establecimiento o código"
            value={filtros.busqueda ?? ''}
            onChange={(evento) => setFiltros((actual) => ({ ...actual, busqueda: evento.target.value }))}
            InputProps={{ endAdornment: <SearchRoundedIcon color="action" /> }}
          />
          <FormControl>
            <InputLabel>Estado</InputLabel>
            <Select label="Estado" value={filtros.estado ?? ''} onChange={(evento) => setFiltros((actual) => ({ ...actual, estado: evento.target.value as EstadoEvaluacion | '' }))}>
              <MenuItem value="">Todos</MenuItem>
              {(Object.keys(etiquetasEstado) as EstadoEvaluacion[]).map((estado) => <MenuItem key={estado} value={estado}>{etiquetasEstado[estado]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Nivel de riesgo</InputLabel>
            <Select label="Nivel de riesgo" value={filtros.nivelRiesgo ?? ''} onChange={(evento) => setFiltros((actual) => ({ ...actual, nivelRiesgo: evento.target.value as NivelRiesgo | '' }))}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="BAJO">Bajo</MenuItem>
              <MenuItem value="MEDIO">Medio</MenuItem>
              <MenuItem value="ALTO">Alto</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>
      {error ? <ErrorVista mensaje={error} /> : !evaluaciones ? <Cargando /> : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Evaluación</TableCell>
                  <TableCell>Empresa y establecimiento</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evaluaciones.map((evaluacion) => (
                  <TableRow key={evaluacion.id} hover>
                    <TableCell><Typography fontWeight={700}>{evaluacion.codigo}</Typography><Typography variant="caption" color="text.secondary">{evaluacion.tecnico}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2">{evaluacion.empresa.razonSocial}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {evaluacion.empresa.nombreComercial} · {evaluacion.establecimiento}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatearFecha(evaluacion.fechaInspeccion)}</TableCell>
                    <TableCell><EstadoChip estado={evaluacion.estado} /></TableCell>
                    <TableCell>{evaluacion.resultado.status === 'CALCULADO' ? <RiesgoChip nivel={evaluacion.resultado.riskLevel} /> : 'No calculable'}</TableCell>
                    <TableCell align="right"><Button component={Link} to={`/evaluaciones/${evaluacion.id}`} size="small">Abrir</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {evaluaciones.length === 0 && <Vacio titulo="Sin resultados" detalle="Ajuste los filtros para encontrar evaluaciones." />}
        </Card>
      )}
    </Box>
  );
}
