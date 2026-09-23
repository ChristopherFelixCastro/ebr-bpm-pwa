import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import type { AnalyticsSummary, RiskLevel } from '@ebr-bpm/core-client';
import { servicioAnalitica } from '../servicios/analitica';
import { TarjetaMetrica } from '../componentes/TarjetaMetrica';
import { Cargando, ErrorVista } from '../componentes/EstadoVista';
import { useAutenticacion } from '../contexto/Autenticacion';
import { etiquetasRiesgo } from '../utilidades/formato';

export function PanelAnalitico() {
  const [summary, setSummary] = useState<AnalyticsSummary>(); const [error, setError] = useState('');
  const { canOperate } = useAutenticacion();
  useEffect(() => { servicioAnalitica.obtenerResumen().then(setSummary).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el panel.')); }, []);
  if (error) return <ErrorVista mensaje={error} />; if (!summary) return <Cargando mensaje="Preparando el panel analítico…" />;
  const totalRisk = Math.max(1, Object.values(summary.byRisk).reduce((total, count) => total + count, 0));
  return <Box sx={{ display: 'grid', gap: 3 }}>
    <Box><Typography variant="h1">Panel analítico</Typography><Typography color="text.secondary">Resumen calculado desde inspecciones, revisiones, informes y cierres del Core.</Typography></Box>
    {!canOperate && <Alert severity="info">Su sesión ADMIN es de consulta. Las acciones operativas están disponibles para COORDINATOR y UNIVERSAL.</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
      <TarjetaMetrica etiqueta="Listas o pendientes de revisión" valor={summary.readyForReview + summary.pendingReview} detalle="Envíos reales del Core" icono={<FactCheckRoundedIcon />} />
      <TarjetaMetrica etiqueta="Devueltas" valor={summary.returnedForCorrection} detalle="Esperan corrección del evaluador" icono={<AssignmentReturnRoundedIcon />} />
      <TarjetaMetrica etiqueta="Informes oficiales" valor={summary.officialReports} detalle="PDF oficiales en Storage privado" icono={<DescriptionRoundedIcon />} />
      <TarjetaMetrica etiqueta="Expedientes cerrados" valor={summary.closed} detalle="Cierres atómicos registrados" icono={<InventoryRoundedIcon />} />
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.35fr .65fr' }, gap: 2 }}><Card><CardContent><Typography variant="h2">Distribución por riesgo</Typography><Box sx={{ display: 'grid', gap: 2, mt: 3 }}>{(['LOW', 'MEDIUM', 'HIGH'] as RiskLevel[]).map((level) => <Box key={level}><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .75 }}><Typography variant="body2">{etiquetasRiesgo[level]}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{summary.byRisk[level]}</Typography></Box><LinearProgress variant="determinate" value={summary.byRisk[level] / totalRisk * 100} color={level === 'LOW' ? 'success' : level === 'MEDIUM' ? 'warning' : 'error'} sx={{ height: 9, borderRadius: 9 }} /></Box>)}</Box></CardContent></Card><Card><CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}><Typography variant="h2">Cola institucional</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Abra el historial paginado para consultar resultados y, si su rol lo permite, operar su ciclo institucional.</Typography><Button component={Link} to="/evaluaciones" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 'auto', alignSelf: 'flex-start' }}>Ver evaluaciones</Button></CardContent></Card></Box>
  </Box>;
}
