import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Propiedades {
  etiqueta: string;
  valor: string | number;
  detalle: string;
  icono: ReactNode;
}

export function TarjetaMetrica({ etiqueta, valor, detalle, icono }: Propiedades) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2, color: 'primary.dark', bgcolor: 'rgba(8, 145, 178, 0.12)' }}>
          {icono}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
          <Typography sx={{ fontSize: '1.85rem', fontWeight: 760, lineHeight: 1.2 }}>{valor}</Typography>
          <Typography variant="caption" color="text.secondary">{detalle}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
