import { Link } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

const pasos = [
  {
    numero: '1',
    titulo: 'Resultado calculado y explicable',
    detalle: 'Abra EBR-2026-0017 y expanda “Cómo se calculó”. El porcentaje BPM, los seis factores, el riesgo total y la frecuencia provienen del motor versionado.',
    ruta: '/evaluaciones/eva-2026-0017',
    accion: 'Abrir resultado',
    icono: <CalculateRoundedIcon />,
  },
  {
    numero: '2',
    titulo: 'Revisión con corrección limitada',
    detalle: 'Entre a Revisar, elija Devolver o Solicitar corrección y seleccione únicamente los hallazgos que podrá editar el técnico.',
    ruta: '/evaluaciones/eva-2026-0017/revision',
    accion: 'Probar revisión',
    icono: <FactCheckRoundedIcon />,
  },
  {
    numero: '3',
    titulo: 'Informe oficial protegido',
    detalle: 'Muestre los metadatos del informe ya emitido. La descarga está deshabilitada deliberadamente hasta recibir una URL temporal autorizada de Core.',
    ruta: '/informes',
    accion: 'Ver informes',
    icono: <DescriptionRoundedIcon />,
  },
  {
    numero: '4',
    titulo: 'Expediente cerrado e histórico',
    detalle: 'Consulte el caso cerrado de Baní y destaque que conserva el resultado, las versiones usadas, la revisión y la fecha de cierre.',
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
        <Typography variant="h1">Recorrido para la presentación</Typography>
        <Typography color="text.secondary">Un flujo corto para enseñar lo que funciona hoy sin confundir datos semilla con una integración terminada.</Typography>
      </Box>
      <Alert severity="warning">
        Alcance honesto: este recorrido usa datos de demostración. La vista «Core en vivo» ya consulta la API real cuando hay servidor, base de datos y usuario institucional; la sincronización real de campo sigue pendiente.
      </Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        {pasos.map((paso) => (
          <Card key={paso.numero}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main' }}>{paso.icono}</Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">Paso {paso.numero}</Typography>
                  <Typography variant="h2">{paso.titulo}</Typography>
                </Box>
              </Box>
              <Typography color="text.secondary">{paso.detalle}</Typography>
              <Button component={Link} to={paso.ruta} endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 'auto', alignSelf: 'flex-start' }}>{paso.accion}</Button>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Alert severity="info">
        Mensaje sugerido: “Esta vertical ya calcula, explica y revisa una evaluación. También conectamos analítica y coordinación a lecturas reales del Core; el siguiente hito es operar el flujo completo con PostgreSQL y la PWA.”
      </Alert>
    </Box>
  );
}
