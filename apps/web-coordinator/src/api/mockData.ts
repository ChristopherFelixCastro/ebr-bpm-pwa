import type {
  CoordinatorCase,
  Evaluator,
  Inspection,
} from './types'

export const MOCK_CASES: CoordinatorCase[] = [
  {
    id: 'CAS-001',
    origin: 'SOLICITUD_EMPRESA',
    companyName: 'Industrias Quisqueya',
    establishmentName: 'Planta Principal',
    establishmentAddress: 'Santo Domingo',
    priority: 'Media',
    status: 'RECIBIDO',
    createdAt: '2026-09-18T09:00:00',
    updatedAt: '2026-09-20T09:15:00',
  },
  {
    id: 'CAS-002',
    origin: 'ALERTA_LAPCH',
    companyName: 'Laboratorios Caribe',
    establishmentName: 'Laboratorio Central',
    establishmentAddress: 'Santo Domingo',
    priority: 'Urgente',
    status: 'EN_ANALISIS',
    createdAt: '2026-09-19T08:30:00',
    updatedAt: '2026-09-20T10:30:00',
  },
  {
    id: 'CAS-003',
    origin: 'DENUNCIA',
    companyName: 'Alimentos Nacionales',
    establishmentName: 'Centro de Producción',
    establishmentAddress: 'Santiago',
    priority: 'Alta',
    status: 'PROCEDE_EVALUACION',
    createdAt: '2026-09-17T11:00:00',
    updatedAt: '2026-09-19T15:45:00',
  },
  {
    id: 'CAS-004',
    origin: 'PROGRAMACION_INSTITUCIONAL',
    companyName: 'Productos del Este',
    establishmentName: 'Planta San Pedro',
    establishmentAddress: 'San Pedro de Macorís',
    priority: 'Media',
    status: 'PROGRAMADO',
    createdAt: '2026-09-15T10:00:00',
    updatedAt: '2026-09-20T08:40:00',
  },
  {
    id: 'CAS-005',
    origin: 'DENUNCIA',
    companyName: 'Distribuidora Central',
    establishmentName: 'Almacén Central',
    establishmentAddress: 'Santo Domingo',
    priority: 'Baja',
    status: 'NO_PROCEDE',
    createdAt: '2026-09-14T13:00:00',
    updatedAt: '2026-09-18T11:00:00',
  },
  {
    id: 'CAS-006',
    origin: 'SOLICITUD_EMPRESA',
    companyName: 'Manufacturas Nacionales',
    establishmentName: 'Planta Industrial Norte',
    establishmentAddress: 'Santiago',
    priority: 'Alta',
    status: 'PROCEDE_EVALUACION',
    createdAt: '2026-09-18T13:30:00',
    updatedAt: '2026-09-20T12:00:00',
  },
]

export const MOCK_EVALUATORS: Evaluator[] = [
  {
    id: 'TEC-001',
    fullName: 'Ana Pérez',
    available: true,
  },
  {
    id: 'TEC-002',
    fullName: 'Carlos Gómez',
    available: true,
  },
  {
    id: 'TEC-003',
    fullName: 'María Rodríguez',
    available: false,
  },
]

export const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: 'INS-001',
    caseId: 'CAS-004',
    establishmentName: 'Planta San Pedro',
    establishmentAddress: 'San Pedro de Macorís',
    status: 'ASIGNADA',
    assignedEvaluatorId: 'TEC-001',
    scheduledAt: '2026-09-22T09:00:00',
    scheduledEndAt: '2026-09-22T11:00:00',
    templateVersionId: 'bpm-2024-10',
    conflictAcknowledged: false,
    createdAt: '2026-09-20T08:00:00',
    updatedAt: '2026-09-20T08:40:00',
  },
]