import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import type { EvaluacionAnalitica } from '../dominio/modelos';
import { servicioAnalitica } from '../servicios/analitica';
import { EstadoChip, RiesgoChip } from '../componentes/EstadoChip';
import { Cargando, ErrorVista, Vacio } from '../componentes/EstadoVista';
import { formatearFecha, formatearFechaHora } from '../utilidades/formato';

export function Historial() {
  const [busqueda, setBusqueda] = useState('');
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionAnalitica[]>();
  const [error, setError] = useState('');

  useEffect(() => {
    servicioAnalitica.listarEvaluaciones({ busqueda }).then((pagina) => setEvaluaciones(pagina.items.filter((item) => item.estado === 'CERRADA'))).catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo consultar el histórico.'));
  }, [busqueda]);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box><Typography variant="h1">Consulta histórica</Typography><Typography color="text.secondary">Expedientes cerrados con el resultado y las versiones aplicadas en su fecha.</Typography></Box>
      <Card><CardContent><TextField fullWidth label="Buscar por empresa, establecimiento o evaluación" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} /></CardContent></Card>
      {error ? <ErrorVista mensaje={error} /> : !evaluaciones ? <Cargando /> : evaluaciones.length === 0 ? <Vacio titulo="Sin expedientes cerrados" detalle="No hay expedientes que coincidan con la búsqueda." /> : evaluaciones.map((evaluacion) => (
        <Card key={evaluacion.id}>
          <CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr auto' }, gap: 2, alignItems: 'center' }}>
            <Box><Typography variant="h3">{evaluacion.codigo}</Typography><Typography>{evaluacion.empresa.nombreComercial} · {evaluacion.establecimiento}</Typography><Typography variant="caption" color="text.secondary">Inspección: {formatearFecha(evaluacion.fechaInspeccion)} · Cierre: {evaluacion.fechaCierre ? formatearFechaHora(evaluacion.fechaCierre) : 'Sin fecha'}</Typography></Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><EstadoChip estado={evaluacion.estado} />{evaluacion.resultado.status === 'CALCULADO' && <RiesgoChip nivel={evaluacion.resultado.riskLevel} />}</Box>
            <Button component={Link} to={`/evaluaciones/${evaluacion.id}`}>Consultar</Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
