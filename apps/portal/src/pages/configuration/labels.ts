import type { BpmItemKind, CatalogEntryType, Criticality, Frequency, MicrobiologicalRisk, RiskFactorCode, VersionStatus } from '../../api/configuration'

// Etiquetas humanas: los códigos de Core nunca se muestran como único texto.
export const statusLabels: Record<VersionStatus, string> = { DRAFT: 'Borrador', PUBLISHED: 'Publicada', RETIRED: 'Retirada' }
export const statusColors: Record<VersionStatus, 'warning' | 'success' | 'default'> = { DRAFT: 'warning', PUBLISHED: 'success', RETIRED: 'default' }
export const frequencyLabels: Record<Frequency, string> = { ANNUAL: 'Anual', SEMIANNUAL: 'Semestral', QUARTERLY: 'Trimestral' }
export const criticalityLabels: Record<Criticality, string> = { CRITICA: 'Crítica', MAYOR: 'Mayor', MENOR: 'Menor' }
export const itemKindLabels: Record<BpmItemKind, string> = { SECTION: 'Sección', SUBSECTION: 'Subsección', GROUP: 'Grupo', CRITERION: 'Criterio' }
export const entryTypeLabels: Record<CatalogEntryType, string> = { NODE: 'Nodo', LEAF: 'Hoja' }
export const microbiologicalRiskLabels: Record<MicrobiologicalRisk, string> = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' }
export const factorLabels: Record<RiskFactorCode, string> = {
  VOLUME: 'Volumen de producción', HACCP: 'Sistema HACCP', BPM: 'Cumplimiento BPM',
  INABIE: 'Suplidor INABIE', REJECTIONS: 'Rechazos y reclamaciones', SAMPLING: 'Plan de muestreo',
}
export const factorCodes = Object.keys(factorLabels) as RiskFactorCode[]
export const optionScores = [1, 1.67, 2.33, 3] as const

export const dateTime = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('es-DO', { timeZone: 'America/Santo_Domingo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'

// Las vigencias se capturan en hora de República Dominicana (UTC-4, sin horario de verano).
export const dominicanDateTimeInput = (value = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value).replace(' ', 'T')
export const dominicanInputToIso = (value: string) => new Date(`${value}:00-04:00`).toISOString()
