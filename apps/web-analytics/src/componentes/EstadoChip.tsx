import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import type { EstadoEvaluacion, NivelRiesgo } from '../dominio/modelos';
import { etiquetasEstado, etiquetasRiesgo } from '../utilidades/formato';

const colorEstado: Record<EstadoEvaluacion, ChipProps['color']> = {
  EN_REVISION: 'warning',
  DEVUELTA: 'error',
  REENVIADA: 'info',
  APROBADA: 'success',
  CERRADA: 'default',
};

const colorRiesgo: Record<NivelRiesgo, ChipProps['color']> = {
  BAJO: 'success',
  MEDIO: 'warning',
  ALTO: 'error',
};

export function EstadoChip({ estado }: { estado: EstadoEvaluacion }) {
  return <Chip size="small" label={etiquetasEstado[estado]} color={colorEstado[estado]} variant="outlined" />;
}

export function RiesgoChip({ nivel }: { nivel: NivelRiesgo }) {
  return <Chip size="small" label={`Riesgo ${etiquetasRiesgo[nivel].toLocaleLowerCase('es')}`} color={colorRiesgo[nivel]} />;
}
