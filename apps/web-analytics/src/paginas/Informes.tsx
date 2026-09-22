import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { EvaluacionAnalitica } from '../dominio/modelos';
import { servicioAnalitica } from '../servicios/analitica';
import { Cargando, ErrorVista, Vacio } from '../componentes/EstadoVista';
import { formatearFechaHora } from '../utilidades/formato';

export function Informes() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionAnalitica[]>();
  const [error, setError] = useState('');

  useEffect(() => {
    servicioAnalitica.listarEvaluaciones().then((pagina) => setEvaluaciones(pagina.items.filter((item) => item.informe))).catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudieron cargar los informes.'));
  }, []);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box><Typography variant="h1">Informes oficiales</Typography><Typography color="text.secondary">Documentos emitidos desde una instantánea aprobada e inmutable.</Typography></Box>
      <Alert severity="warning">La descarga permanecerá deshabilitada hasta que Core exponga una URL temporal autorizada desde Storage privado.</Alert>
      {error ? <ErrorVista mensaje={error} /> : !evaluaciones ? <Cargando /> : (
        <Card><TableContainer><Table>
          <TableHead><TableRow><TableCell>Número</TableCell><TableCell>Evaluación</TableCell><TableCell>Empresa</TableCell><TableCell>Emisión</TableCell><TableCell>Versión</TableCell><TableCell align="right">Acción</TableCell></TableRow></TableHead>
          <TableBody>{evaluaciones.map((evaluacion) => <TableRow key={evaluacion.id}>
            <TableCell>{evaluacion.informe?.numero}</TableCell><TableCell>{evaluacion.codigo}</TableCell><TableCell>{evaluacion.empresa.nombreComercial}</TableCell><TableCell>{evaluacion.informe && formatearFechaHora(evaluacion.informe.fechaEmision)}</TableCell><TableCell>{evaluacion.informe?.versionPlantilla}</TableCell><TableCell align="right"><Button component={Link} to={`/evaluaciones/${evaluacion.id}`} size="small">Ver expediente</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>{evaluaciones.length === 0 && <Vacio titulo="Sin informes emitidos" detalle="Los informes aparecerán después de la aprobación y emisión autorizada." />}</Card>
      )}
    </Box>
  );
}
