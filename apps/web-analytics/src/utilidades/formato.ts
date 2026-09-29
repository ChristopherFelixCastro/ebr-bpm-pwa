import type { AnalyticsLifecycleStatus, RiskLevel } from '@ebr-bpm/core-client';

export const etiquetasEstado: Record<AnalyticsLifecycleStatus, string> = {
  DRAFT: 'Borrador', IN_PROGRESS: 'En ejecución', PENDING_SUBMISSION: 'Pendiente de envío', SUBMITTED: 'Enviada',
  READY_FOR_REVIEW: 'Lista para revisión', PENDING_REVIEW: 'En revisión', RETURNED_FOR_CORRECTION: 'Devuelta',
  RESUBMITTED: 'Reenviada', APPROVED: 'Aprobada', CLOSED: 'Cerrada',
};
export const etiquetasRiesgo: Record<RiskLevel, string> = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' };
export const formatearFecha = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(new Date(value)) : '—';
export const formatearFechaHora = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const numero = (value: string | number | null | undefined, digits = 2) => value === null || value === undefined ? '—' : new Intl.NumberFormat('es-DO', { maximumFractionDigits: digits }).format(Number(value));
