import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import type { ResumenPanel } from '../dominio/modelos';
import { servicioAnalitica } from '../servicios/analitica';
import { TarjetaMetrica } from '../componentes/TarjetaMetrica';
import { Cargando, ErrorVista } from '../componentes/EstadoVista';

export function PanelAnalitico() {
  const [resumen, setResumen] = useState<ResumenPanel>();
  const [error, setError] = useState('');

  useEffect(() => {
    servicioAnalitica.obtenerResumen().then(setResumen).catch((causa: unknown) => setError(causa instanceof Error ? causa.message : 'No se pudo cargar el panel.'));
  }, []);

  if (error) return <ErrorVista mensaje={error} />;
  if (!resumen) return <Cargando mensaje="Preparando el panel analítico…" />;

  const totalRiesgo = Object.values(resumen.porNivel).reduce((total, cantidad) => total + cantidad, 0) || 1;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="h1">Panel analítico</Typography>
        <Typography color="text.secondary">Seguimiento de resultados, revisiones, informes y cierres.</Typography>
      </Box>
      <Alert severity="info">Los registros visibles son datos de demostración. La capa de servicio está preparada para sustituirse por la API Core sin cambiar las páginas.</Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
        <TarjetaMetrica etiqueta="Pendientes de revisión" valor={resumen.pendientesRevision} detalle="Evaluaciones enviadas o reenviadas" icono={<FactCheckRoundedIcon />} />
        <TarjetaMetrica etiqueta="Devoluciones pendientes" valor={resumen.devolucionesPendientes} detalle="Esperan corrección del técnico" icono={<AssignmentReturnRoundedIcon />} />
        <TarjetaMetrica etiqueta="Informes emitidos" valor={resumen.informesEmitidos} detalle="Documentos oficiales disponibles" icono={<DescriptionRoundedIcon />} />
        <TarjetaMetrica etiqueta="Cierres recientes" valor={resumen.cierresRecientes} detalle="Expedientes inmutables" icono={<InventoryRoundedIcon />} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.35fr .65fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h2" gutterBottom>Distribución por nivel de riesgo</Typography>
            <Box sx={{ display: 'grid', gap: 2, mt: 3 }}>
              {(['BAJO', 'MEDIO', 'ALTO'] as const).map((nivel) => (
                <Box key={nivel}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2">{nivel[0]}{nivel.slice(1).toLocaleLowerCase('es')}</Typography>
                    <Typography variant="body2" fontWeight={700}>{resumen.porNivel[nivel]}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(resumen.porNivel[nivel] / totalRiesgo) * 100} color={nivel === 'BAJO' ? 'success' : nivel === 'MEDIO' ? 'warning' : 'error'} sx={{ height: 9, borderRadius: 9 }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h2" gutterBottom>Siguiente acción</Typography>
            <Typography color="text.secondary">Revise primero las evaluaciones enviadas. Cada decisión exige comentario y queda registrada.</Typography>
            <Button component={Link} to="/evaluaciones" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 'auto', alignSelf: 'flex-start' }}>
              Ver evaluaciones
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
