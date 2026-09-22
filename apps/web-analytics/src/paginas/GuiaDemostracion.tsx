import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

const areas = [
  {
    titulo: 'Resultado calculado y explicable',
    detalle: 'EBR-2026-0017 muestra el porcentaje BPM, los factores, el riesgo total y la frecuencia obtenidos con el motor versionado. El detalle incluye “Cómo se calculó”.',
    ruta: '/evaluaciones/eva-2026-0017',
    accion: 'Abrir resultado',
    icono: <CalculateRoundedIcon />,
  },
  {
    titulo: 'Revisión con corrección limitada',
    detalle: 'La revisión permite aprobar o solicitar correcciones sobre hallazgos seleccionados, con un comentario obligatorio.',
    ruta: '/evaluaciones/eva-2026-0017/revision',
    accion: 'Probar revisión',
    icono: <FactCheckRoundedIcon />,
  },
  {
    titulo: 'Informe oficial protegido',
    detalle: 'Se muestran los metadatos del informe emitido. La descarga permanece deshabilitada hasta recibir una URL temporal autorizada de Core.',
    ruta: '/informes',
    accion: 'Ver informes',
    icono: <DescriptionRoundedIcon />,
  },
  {
    titulo: 'Expediente cerrado e histórico',
    detalle: 'El caso cerrado de Baní conserva el resultado, las versiones usadas, la revisión y la fecha de cierre.',
    ruta: '/historial',
    accion: 'Ver histórico',
    icono: <HistoryRoundedIcon />,
  },
];

export function GuiaDemostracion() {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Chip label="MVP demostrable" color="success" size="small" sx={{ mb: 1.5 }} />
        <Typography variant="h1">Mapa del avance</Typography>
        <Typography color="text.secondary">Accesos rápidos a las partes desarrolladas. Podemos abrir cualquier área según lo que se quiera revisar.</Typography>
      </Box>
      <Alert severity="warning">
        Estas pantallas usan datos de demostración. «Core en vivo» consulta la API real cuando hay servidor, base de datos y usuario institucional; la sincronización de Campo sigue pendiente.
      </Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        {areas.map((area) => (
          <Card key={area.ruta}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main' }}>{area.icono}</Box>
                <Box>
                  <Typography variant="h2">{area.titulo}</Typography>
                </Box>
              </Box>
              <Typography color="text.secondary">{area.detalle}</Typography>
              <Button component={Link} to={area.ruta} endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 'auto', alignSelf: 'flex-start' }}>{area.accion}</Button>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Alert severity="info">
        Estado del avance: Analítica calcula, explica y revisa un escenario de evaluación; Coordinación y Analítica también tienen vistas de lectura conectadas al Core. El flujo completo con PostgreSQL y la PWA de Campo aún requiere integración.
      </Alert>
    </Box>
  );
}
