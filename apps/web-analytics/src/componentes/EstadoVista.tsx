import { Alert, Box, CircularProgress, Typography } from '@mui/material';

export function Cargando({ mensaje = 'Cargando información…' }: { mensaje?: string }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', gap: 2, minHeight: 260 }}>
      <CircularProgress size={34} />
      <Typography color="text.secondary">{mensaje}</Typography>
    </Box>
  );
}

export function ErrorVista({ mensaje }: { mensaje: string }) {
  return <Alert severity="error">{mensaje}</Alert>;
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <Box sx={{ py: 7, px: 2, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom>{titulo}</Typography>
      <Typography color="text.secondary">{detalle}</Typography>
    </Box>
  );
}
