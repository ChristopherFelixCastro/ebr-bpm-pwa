import type { EstadoEvaluacion, NivelRiesgo } from '../dominio/modelos';
import type { RevisionEvaluacion } from '../dominio/modelos';

export const etiquetasEstado: Record<EstadoEvaluacion, string> = {
  EN_REVISION: 'En revisión',
  DEVUELTA: 'Devuelta',
  REENVIADA: 'Reenviada',
  APROBADA: 'Aprobada',
  CERRADA: 'Cerrada',
};

export const etiquetasRiesgo: Record<NivelRiesgo, string> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
};

export const etiquetasAccionRevision: Record<RevisionEvaluacion['accion'], string> = {
  APROBADA: 'Aprobada',
  DEVUELTA: 'Devuelta',
  CORRECCION_SOLICITADA: 'Corrección solicitada',
  REENVIADA: 'Reenviada',
};

export function formatearFecha(valor: string): string {
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(valor));
}

export function formatearFechaHora(valor: string): string {
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}
