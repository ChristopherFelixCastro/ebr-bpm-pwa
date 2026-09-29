import { Chip, type ChipProps } from '@mui/material';
import type { AnalyticsLifecycleStatus, RiskLevel } from '@ebr-bpm/core-client';
import { etiquetasEstado, etiquetasRiesgo } from '../utilidades/formato';

const colorEstado: Record<AnalyticsLifecycleStatus, ChipProps['color']> = {
  DRAFT: 'default', IN_PROGRESS: 'info', PENDING_SUBMISSION: 'warning', SUBMITTED: 'warning', READY_FOR_REVIEW: 'warning',
  PENDING_REVIEW: 'warning', RETURNED_FOR_CORRECTION: 'error', RESUBMITTED: 'info', APPROVED: 'success', CLOSED: 'default',
};
const colorRiesgo: Record<RiskLevel, ChipProps['color']> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'error' };
export const EstadoChip = ({ estado }: { estado: AnalyticsLifecycleStatus }) => <Chip size="small" label={etiquetasEstado[estado]} color={colorEstado[estado]} variant="outlined" />;
export const RiesgoChip = ({ nivel }: { nivel: RiskLevel }) => <Chip size="small" label={`Riesgo ${etiquetasRiesgo[nivel].toLowerCase()}`} color={colorRiesgo[nivel]} />;
