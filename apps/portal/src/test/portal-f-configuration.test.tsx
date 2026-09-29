import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { visibleSections } from '../access/capabilities'

const account = (roleCode: CoreUser['roleCode']): CoreUser => ({ id: `${roleCode}-1`, fullName: roleCode, roleCode, status: 'APPROVED', companyId: null, authTime: Date.now() })
const envelope = (data: unknown) => ({ data, meta: { correlationId: 'test' } }) as never
const at = (path: string) => window.history.replaceState({}, '', path)
const stamp = '2026-09-01T12:00:00.000Z'
const valid = { valid: true, errors: [], warnings: [], summary: { errorCount: 0, warningCount: 0 } }
const version = (id: string, versionNumber: number, status: 'DRAFT' | 'PUBLISHED' | 'RETIRED', revision = 1) => ({ id, resourceId: 'tpl-1', versionNumber, status, publicationNote: null, effectiveFrom: status === 'DRAFT' ? null : stamp, effectiveTo: null, publishedAt: status === 'DRAFT' ? null : stamp, publishedByUserId: null, retiredAt: null, retiredByUserId: null, version: revision, createdAt: stamp, updatedAt: stamp, itemCount: 7 })

const template = { id: 'tpl-1', code: 'BPM_OFICIAL', name: 'Plantilla oficial', description: null, isDefault: false, version: 3, versionCount: 2, createdAt: stamp, updatedAt: stamp }
const item = (id: string, parentId: string | null, itemKind: string, title: string, sortOrder: number, extra: Record<string, unknown> = {}) => ({ id, versionId: 'ver-2', parentId, itemKind, sourceCode: null, displayCode: null, title, description: null, sortOrder, isEvaluable: itemKind === 'CRITERION', defaultCriticality: null, sourceReference: null, sourceRowNumber: null, sourceParentCodeRaw: null, version: 1, guidanceItems: [], ...extra })
// Lista plana desordenada: sortOrder se repite entre padres distintos, por lo que ordenar globalmente sería incorrecto.
const flatItems = [
  item('c-b', 'g-1', 'CRITERION', 'Criterio B', 2, { defaultCriticality: 'MAYOR' }),
  item('s-2', null, 'SECTION', 'Sección Dos', 2),
  item('c-a', 'g-1', 'CRITERION', 'Criterio A', 1, { guidanceItems: [{ id: 'gd-1', versionId: 'ver-2', criterionItemId: 'c-a', text: 'Verificar registros de limpieza', sortOrder: 0, criticality: 'CRITICA', sourceReference: null, sourceRowNumber: null, version: 1 }] }),
  item('g-1', 'ss-1', 'GROUP', 'Grupo uno', 1),
  item('c-c', 's-2', 'CRITERION', 'Criterio C', 1),
  item('ss-1', 's-1', 'SUBSECTION', 'Subsección uno', 1),
  item('s-1', null, 'SECTION', 'Sección Uno', 1),
]
const bpmPreview = { version: version('ver-2', 2, 'DRAFT', 7), validation: valid, items: flatItems }

const catalog = { id: 'cat-1', code: 'TIPOS', name: 'Tipos de establecimiento', description: 'Original', supportsHierarchy: false, version: 4, versionCount: 0, createdAt: stamp, updatedAt: stamp }
const riskSet = { id: 'set-1', code: 'EBR', name: 'Reglas EBR', isDefault: true, version: 2, versionCount: 1, createdAt: stamp, updatedAt: stamp }
const factor = { id: 'f-1', versionId: 'rv-1', code: 'VOLUME', name: 'Volumen', weight: 0.17, sortOrder: 1, version: 1, options: [{ id: 'o-1', factorId: 'f-1', code: 'LOW', label: 'Bajo volumen', score: 1, sortOrder: 1, version: 5 }] }
const riskPreview = {
  version: { ...version('rv-1', 1, 'DRAFT', 1), resourceId: 'set-1' }, validation: { valid: false, errors: [{ code: 'RISK_INVALID_FACTORS', path: 'factors', message: 'Se requieren exactamente los seis factores oficiales.' }], warnings: [], summary: { errorCount: 1, warningCount: 0 } },
  factors: [factor],
  foodCategories: [{ id: 'fc-1', versionId: 'rv-1', code: 'LACTEOS', name: 'Lácteos', sortOrder: 1, sourceFile: null, sourceSheet: null, sourceRowNumber: null, version: 1, subcategories: [{ id: 'fs-1', categoryId: 'fc-1', name: 'Quesos frescos', microbiologicalRisk: 'HIGH', riskScore: 3, sortOrder: 1, sourceFile: null, sourceSheet: null, sourceRowNumber: null, version: 1 }] }],
  frequencyRanges: [{ id: 'fr-1', versionId: 'rv-1', lowerBound: 1, upperBound: 2, lowerInclusive: true, upperInclusive: false, frequency: 'ANNUAL', label: 'Bajo', sortOrder: 1, version: 1 }, { id: 'fr-2', versionId: 'rv-1', lowerBound: 2, upperBound: null, lowerInclusive: true, upperInclusive: false, frequency: 'QUARTERLY', label: 'Alto', sortOrder: 2, version: 1 }],
}

type Handler = (path: string, init?: RequestInit) => unknown
let override: Handler | null = null
const requests = () => vi.mocked(core.request).mock.calls.map(([path, init]) => ({ path: String(path), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined }))

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); core.disconnect(); override = null
  vi.spyOn(core, 'request').mockImplementation(async (path, init) => {
    const route = String(path)
    const custom = override?.(route, init)
    if (custom !== undefined) return envelope(custom)
    if (route === '/health/ready') return envelope({ status: 'ready' })
    if (route === '/v1/admin/bpm-templates') return envelope([template])
    if (route === '/v1/admin/bpm-templates/tpl-1') return envelope(template)
    if (route === '/v1/admin/bpm-templates/tpl-1/versions') return envelope([version('ver-2', 2, 'DRAFT', 7), version('ver-1', 1, 'PUBLISHED', 2)])
    if (route === '/v1/admin/bpm-templates/tpl-1/versions/ver-2/preview') return envelope(bpmPreview)
    if (route.endsWith('/validate')) return envelope(valid)
    if (route === '/v1/admin/catalogs/cat-1') return envelope(catalog)
    if (route === '/v1/admin/catalogs/cat-1/versions') return envelope([])
    if (route === '/v1/admin/risk-rule-sets/set-1') return envelope(riskSet)
    if (route === '/v1/admin/risk-rule-sets/set-1/versions/rv-1/preview') return envelope(riskPreview)
    return envelope([])
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); core.disconnect() })

it('habilita las tres áreas para ADMIN, UNIVERSAL y COORDINATOR y bloquea la URL directa a otros roles', async () => {
  for (const role of ['ADMIN', 'UNIVERSAL', 'COORDINATOR'] as const) expect(visibleSections(account(role)).find((section) => section.name === 'Configuración')?.pages.map((page) => page.id)).toEqual(expect.arrayContaining(['catalogs', 'templates', 'rules']))
  for (const role of ['COMPANY_ADMIN', 'DELEGATE', 'EVALUATOR'] as const) expect(visibleSections(account(role)).some((section) => section.name === 'Configuración')).toBe(false)
  for (const [role, path] of [['EVALUATOR', '/configuracion/reglas-riesgo'], ['COMPANY_ADMIN', '/configuracion/plantillas-bpm/tpl-1/versiones/ver-2'], ['DELEGATE', '/configuracion/catalogos/cat-1']] as const) {
    vi.spyOn(core, 'restoreSession').mockResolvedValue(account(role))
    at(path)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
    expect(requests().some((request) => request.path.startsWith('/v1/admin/'))).toBe(false)
    cleanup(); core.disconnect(); vi.mocked(core.request).mockClear()
  }
})

it('muestra a COORDINATOR solo consulta, vista previa y validación, y a ADMIN los controles de edición', async () => {
  const restore = vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COORDINATOR'))
  at('/configuracion/plantillas-bpm/tpl-1')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Plantilla oficial' })).toBeInTheDocument()
  expect(screen.getByText(/solo se aplica a inspecciones nuevas/)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Abrir' })).toHaveLength(2)
  for (const name of ['Nueva versión vacía', 'Designar predeterminada', 'Editar']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Clonar/ })).not.toBeInTheDocument()
  cleanup(); core.disconnect()

  at('/configuracion/plantillas-bpm/tpl-1/versiones/ver-2')
  render(<App />)
  expect(await screen.findByRole('tree', { name: 'Estructura BPM' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Validar' })).toBeInTheDocument()
  for (const name of ['Publicar', 'Retirar', 'Agregar sección', 'Editar', 'Eliminar', 'Mover', 'Agregar hijo', 'Agregar instrucción', 'Editar instrucción']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Validar' }))
  await waitFor(() => expect(requests().some((request) => request.path === '/v1/admin/bpm-templates/tpl-1/versions/ver-2/validate' && request.method === 'GET')).toBe(true))
  expect(requests().every((request) => request.method === 'GET')).toBe(true)
  cleanup(); core.disconnect()

  restore.mockResolvedValue(account('ADMIN'))
  at('/configuracion/plantillas-bpm/tpl-1')
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Nueva versión vacía' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Designar predeterminada' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Clonar versión 1' })).toBeInTheDocument()
  cleanup(); core.disconnect()

  at('/configuracion/plantillas-bpm/tpl-1/versiones/ver-2')
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Publicar' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar sección' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Agregar instrucción' })).toHaveLength(3)
  expect(screen.getByRole('button', { name: 'Editar instrucción' })).toBeInTheDocument()
})

it('dibuja la jerarquía BPM por padre y sortOrder desde una lista plana desordenada', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COORDINATOR'))
  at('/configuracion/plantillas-bpm/tpl-1/versiones/ver-2')
  render(<App />)
  const tree = await screen.findByRole('tree', { name: 'Estructura BPM' })
  const nodes = within(tree).getAllByRole('treeitem')
  const title = (node: HTMLElement) => ['Sección Uno', 'Subsección uno', 'Grupo uno', 'Criterio A', 'Criterio B', 'Sección Dos', 'Criterio C'].find((text) => within(node).queryAllByText(text)[0]?.closest('[role="treeitem"]') === node)
  expect(nodes.map(title)).toEqual(['Sección Uno', 'Subsección uno', 'Grupo uno', 'Criterio A', 'Criterio B', 'Sección Dos', 'Criterio C'])
  expect(nodes.map((node) => node.getAttribute('aria-level'))).toEqual(['1', '2', '3', '4', '4', '1', '2'])
  expect(within(nodes[0]).getAllByText('Sección').length).toBeGreaterThan(0)
  expect(within(nodes[4]).getByText('Criticidad mayor')).toBeInTheDocument()
  expect(within(nodes[3]).getByText('Verificar registros de limpieza')).toBeInTheDocument()
  expect(within(nodes[3]).getByText(/no son preguntas/)).toBeInTheDocument()
  expect(within(nodes[3]).getByText('Criticidad crítica')).toBeInTheDocument()
  expect(screen.getByText('Borrador')).toBeInTheDocument()
  expect(screen.queryByText('DRAFT')).not.toBeInTheDocument()
})

it('publica mediante reautenticación y envía la versión esperada por Core', async () => {
  const admin = account('ADMIN')
  vi.spyOn(core, 'restoreSession').mockResolvedValue(admin)
  const reauthenticate = vi.spyOn(core, 'reauthenticate').mockResolvedValue(admin)
  let attempts = 0
  override = (path, init) => {
    if (path === '/v1/admin/bpm-templates/tpl-1/versions/ver-2/publish' && init?.method === 'POST') {
      attempts += 1
      if (attempts === 1) throw new CoreApiError(401, 'REAUTHENTICATION_REQUIRED', 'Confirme su identidad.')
      return { ...bpmPreview.version, status: 'PUBLISHED', version: 8 }
    }
    return undefined
  }
  at('/configuracion/plantillas-bpm/tpl-1/versiones/ver-2')
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Publicar' }))
  const dialog = await screen.findByRole('dialog', { name: 'Publicar versión 2' })
  fireEvent.change(within(dialog).getByLabelText(/Vigente desde/), { target: { value: '2026-10-01T08:30' } })
  fireEvent.change(within(dialog).getByLabelText('Nota de publicación'), { target: { value: 'Ajuste anual' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Publicar' }))
  expect(await screen.findByRole('dialog', { name: 'Confirmar identidad' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-segura' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(attempts).toBe(2))
  expect(reauthenticate).toHaveBeenCalledWith('clave-segura')
  const published = requests().filter((request) => request.path.endsWith('/publish'))
  expect(published).toHaveLength(2)
  for (const request of published) expect(request.body).toEqual({ version: 7, effectiveFrom: '2026-10-01T12:30:00.000Z', publicationNote: 'Ajuste anual' })
})

it('ante 409 STALE_VERSION avisa con botón de recarga y conserva lo escrito', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('UNIVERSAL'))
  override = (_path, init) => {
    if (init?.method === 'PATCH') throw new CoreApiError(409, 'STALE_VERSION', 'Versión desactualizada.')
    return undefined
  }
  at('/configuracion/catalogos/cat-1')
  render(<App />)
  const name = await screen.findByLabelText('Nombre del catálogo')
  fireEvent.change(name, { target: { value: 'Nombre corregido' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
  expect(await screen.findByText(/cambió en el servidor/)).toBeInTheDocument()
  expect(screen.getByLabelText('Nombre del catálogo')).toHaveValue('Nombre corregido')
  expect(requests().find((request) => request.method === 'PATCH')).toMatchObject({ path: '/v1/admin/catalogs/cat-1', body: { version: 4, name: 'Nombre corregido' } })
  expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
  cleanup(); core.disconnect(); vi.mocked(core.request).mockClear()

  // Opción de riesgo en un borrador: el diálogo sigue abierto con la entrada del usuario y la URL usa el id de la opción.
  at('/configuracion/reglas-riesgo/set-1/versiones/rv-1')
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar opción Bajo volumen' }))
  const dialog = await screen.findByRole('dialog', { name: 'Editar opción de Volumen' })
  fireEvent.change(within(dialog).getByLabelText(/Descripción de la opción/), { target: { value: 'Volumen reducido' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
  expect(await within(dialog).findByText(/cambió en el servidor/)).toBeInTheDocument()
  expect(within(dialog).getByLabelText(/Descripción de la opción/)).toHaveValue('Volumen reducido')
  expect(requests().find((request) => request.method === 'PATCH')).toMatchObject({ path: '/v1/admin/risk-rule-sets/set-1/versions/rv-1/factors/f-1/options/o-1', body: { version: 5, label: 'Volumen reducido' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Recargar' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar opción de Volumen' })).not.toBeInTheDocument())
  expect(requests().filter((request) => request.path.endsWith('/rv-1/preview'))).toHaveLength(2)
})

it('presenta factores, alimentos y rangos de riesgo con etiquetas humanas y la validación de Core', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COORDINATOR'))
  at('/configuracion/reglas-riesgo/set-1/versiones/rv-1')
  render(<App />)
  expect(await screen.findByText('Volumen de producción')).toBeInTheDocument()
  expect(screen.getByText('Se requieren exactamente los seis factores oficiales.')).toBeInTheDocument()
  expect(screen.getByText('Quesos frescos')).toBeInTheDocument()
  expect(screen.getAllByText('Alto', { selector: 'td' })).toHaveLength(2)
  expect(screen.getByText('Anual')).toBeInTheDocument()
  expect(screen.getByText('Trimestral')).toBeInTheDocument()
  expect(screen.getByText('Desde 2 sin límite superior')).toBeInTheDocument()
  expect(screen.queryByText('ANNUAL')).not.toBeInTheDocument()
  for (const name of ['Agregar factor', 'Agregar opción', 'Agregar categoría', 'Agregar rango', 'Publicar']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
})
