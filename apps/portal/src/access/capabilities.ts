import type { CoreRole, CoreUser } from '@ebr-bpm/core-client'

export type Section = 'Inicio' | 'Directorio empresarial' | 'Solicitudes' | 'Operación sanitaria' | 'Inspecciones de campo' | 'Evaluación y cierre' | 'Configuración'
export type Capability = {
  id: string
  label: string
  path: string
  section: Section
  roles: readonly CoreRole[]
  ready: boolean
}

const all = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN', 'DELEGATE', 'COORDINATOR', 'EVALUATOR'] as const
const central = ['ADMIN', 'UNIVERSAL'] as const
const coordination = ['ADMIN', 'UNIVERSAL', 'COORDINATOR'] as const
const companyRequests = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN', 'DELEGATE', 'COORDINATOR'] as const

// ready=false impide presentar como funcional un flujo que aún vive en los portales de referencia.
// El rol nunca reemplaza la comprobación de empresa, asignación, estado y versión que hace Core.
export const capabilities: readonly Capability[] = [
  { id: 'home', label: 'Inicio', path: '/inicio', section: 'Inicio', roles: all, ready: true },
  { id: 'companies', label: 'Empresas', path: '/directorio/empresas', section: 'Directorio empresarial', roles: ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN'], ready: true },
  { id: 'establishments', label: 'Establecimientos', path: '/directorio/establecimientos', section: 'Directorio empresarial', roles: all, ready: true },
  { id: 'contacts', label: 'Contactos', path: '/directorio/contactos', section: 'Directorio empresarial', roles: all, ready: true },
  { id: 'requests', label: 'Solicitudes BPM', path: '/solicitudes', section: 'Solicitudes', roles: companyRequests, ready: true },
  { id: 'document-review', label: 'Documentos pendientes', path: '/solicitudes/documentos-pendientes', section: 'Solicitudes', roles: coordination, ready: true },
  { id: 'cases', label: 'Casos', path: '/operacion/casos', section: 'Operación sanitaria', roles: coordination, ready: true },
  { id: 'programs', label: 'Programas institucionales', path: '/operacion/programas', section: 'Operación sanitaria', roles: coordination, ready: true },
  { id: 'alerts', label: 'Alertas sanitarias', path: '/operacion/alertas', section: 'Operación sanitaria', roles: coordination, ready: true },
  { id: 'complaints', label: 'Denuncias', path: '/operacion/denuncias', section: 'Operación sanitaria', roles: coordination, ready: true },
  { id: 'assignments', label: 'Asignaciones', path: '/operacion/asignaciones', section: 'Operación sanitaria', roles: coordination, ready: true },
  { id: 'scheduling', label: 'Agenda', path: '/operacion/agenda', section: 'Operación sanitaria', roles: coordination, ready: true },
  { id: 'field', label: 'Mis inspecciones', path: '/campo/asignadas', section: 'Inspecciones de campo', roles: ['EVALUATOR', 'UNIVERSAL'], ready: true },
  { id: 'corrections', label: 'Correcciones', path: '/campo/correcciones', section: 'Inspecciones de campo', roles: ['EVALUATOR'], ready: false },
  { id: 'analytics', label: 'Evaluaciones', path: '/evaluaciones', section: 'Evaluación y cierre', roles: coordination, ready: false },
  { id: 'reports', label: 'Informes', path: '/informes', section: 'Evaluación y cierre', roles: coordination, ready: false },
  { id: 'history', label: 'Histórico', path: '/historico', section: 'Evaluación y cierre', roles: coordination, ready: false },
  { id: 'users', label: 'Usuarios', path: '/configuracion/usuarios', section: 'Configuración', roles: central, ready: false },
  { id: 'catalogs', label: 'Catálogos', path: '/configuracion/catalogos', section: 'Configuración', roles: central, ready: false },
  { id: 'templates', label: 'Plantillas BPM', path: '/configuracion/plantillas-bpm', section: 'Configuración', roles: central, ready: false },
  { id: 'rules', label: 'Reglas de riesgo', path: '/configuracion/reglas-riesgo', section: 'Configuración', roles: central, ready: false },
]

export const sections: readonly Section[] = ['Inicio', 'Directorio empresarial', 'Solicitudes', 'Operación sanitaria', 'Inspecciones de campo', 'Evaluación y cierre', 'Configuración']

export const hasCapability = (user: CoreUser | null, capability: Capability) =>
  user?.status === 'APPROVED' && capability.roles.includes(user.roleCode)

export const visibleSections = (user: CoreUser | null) => sections
  .map((name) => ({ name, pages: capabilities.filter((item) => item.section === name && item.ready && hasCapability(user, item)) }))
  .filter((section) => section.pages.length > 0)

export const homeFor = (_role: CoreRole) => '/inicio'
