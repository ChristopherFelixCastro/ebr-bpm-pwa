import { Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';

export function NoEncontrada() {
  return (
    <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box><Typography variant="h1" gutterBottom>Página no encontrada</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>La ruta solicitada no existe en el portal analítico.</Typography><Button component={Link} to="/" variant="contained">Ir al panel</Button></Box>
    </Box>
  );
}
