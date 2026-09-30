import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CoreInspection, CoreUser } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { downloadFieldPackage, openFieldState, type WorkPackage } from '../field/model'
import { canonical, sha256Hex, type PermitClaims } from '../offline/permit'
import { enrollOfflineIdentity, lockOfflineVault } from '../offline/vault'
import { FieldInspectionPage } from '../pages/field/FieldInspectionPage'

const session = vi.hoisted(() => ({
  user: { id: 'eval-corrections', fullName: 'Evaluador Prueba', roleCode: 'EVALUATOR', status: 'APPROVED' },
  offlineUser: null,
  unlockVaultOnline: vi.fn(),
}))
vi.mock('../session/SessionContext', () => ({ useSession: () => session }))

const pair = generateKeyPairSync('ed25519')
const user: CoreUser = { id: 'eval-corrections', fullName: 'Evaluador Prueba', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }

const inspection: CoreInspection = {
  id: 'insp-corrections',
  caseId: 'case-corrections',
  assignmentId: 'assign-corrections',
  evaluatorUserId: user.id,
  status: 'IN_PROGRESS',
  establishmentId: null,
  establishmentName: 'Establecimiento Modelo',
  establishmentAddress: null,
  companyName: 'Compañía Modelo',
  version: 1,
  contentRevision: 1,
  bpmTemplateVersionId: 'tpl-1',
  riskRuleVersionId: 'rule-1',
  origin: 'COMPANY_REQUEST',
  priority: 'HIGH',
  startedAt: null,
  finalizedAt: null,
  submittedAt: null,
  createdAt: '',
  updatedAt: '',
}

const bpmItems = [
  { id: 'crit-1', parentItemId: null, itemKind: 'CRITERION', displayCode: '1.1', title: 'Higiene del personal', sortOrder: 1, isEvaluable: true },
  { id: 'crit-2', parentItemId: null, itemKind: 'CRITERION', displayCode: '1.2', title: 'Control de plagas', sortOrder: 2, isEvaluable: true },
]

const foodCatalog = [
  {
    id: 'cat-bebidas',
    name: 'Bebidas',
    subcategories: [
      { id: 'sub-agua-na', name: 'Agua de pozo', riskScore: null },
      { id: 'sub-agua-pura', name: 'Agua purificada', riskScore: 2 },
    ],
  },
  {
    id: 'cat-lacteos',
    name: 'Lácteos',
    subcategories: [
      { id: 'sub-queso', name: 'Queso fresco', riskScore: 3 },
    ],
  },
]

const factors = [
  { id: 'f-1', code: 'F1', name: 'Factor 1', options: [{ id: 'opt-1', code: 'A', label: 'Opción 1' }] },
  { id: 'f-2', code: 'F2', name: 'Factor 2', options: [{ id: 'opt-2', code: 'B', label: 'Opción 2' }] },
  { id: 'f-3', code: 'F3', name: 'Factor 3', options: [{ id: 'opt-3', code: 'C', label: 'Opción 3' }] },
  { id: 'f-4', code: 'F4', name: 'Factor 4', options: [{ id: 'opt-4', code: 'D', label: 'Opción 4' }] },
  { id: 'f-5', code: 'F5', name: 'Factor 5', options: [{ id: 'opt-5', code: 'E', label: 'Opción 5' }] },
  { id: 'f-6', code: 'F6', name: 'Factor 6', options: [{ id: 'opt-6', code: 'F', label: 'Opción 6' }] },
]

const basePkg: WorkPackage = {
  inspection,
  bpmTemplate: { versionId: 'tpl-1', items: bpmItems },
  responses: [],
  riskRule: { versionId: 'rule-1', factors, foodCatalog },
  factorSelections: factors.map((f) => ({ riskFactorId: f.id, optionId: f.options[0].id })),
  foodSnapshots: [],
  evidence: [],
  generatedAt: new Date().toISOString(),
}

async function prepareInspection(pkgOverride: Partial<WorkPackage> = {}) {
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  await enrollOfflineIdentity(user, 'clave-prueba')
  const currentPkg: WorkPackage = { ...basePkg, ...pkgOverride }
  const now = Date.now()
  const claims: PermitClaims = {
    v: 1,
    userId: user.id,
    roleCode: 'EVALUATOR',
    inspectionId: inspection.id,
    packageHash: await sha256Hex(canonical(currentPkg)),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 3_600_000).toISOString(),
  }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  vi.spyOn(core, 'request').mockImplementation(async (path) => {
    if (String(path).endsWith('/offline-package')) {
      return { data: { package: currentPkg, permit }, meta: { correlationId: 'test' } } as never
    }
    return { data: currentPkg.inspection, meta: { correlationId: 'test' } } as never
  })
  await downloadFieldPackage(user.id, inspection.id)
}

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={[`/campo/inspecciones/${inspection.id}`]}>
      <Routes>
        <Route path="/campo/inspecciones/:id" element={<FieldInspectionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Correcciones del formulario de inspección del evaluador', () => {
  afterEach(() => {
    cleanup()
    lockOfflineVault()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('1. Renderiza cuatro botones visibles por criterio y guarda la opción seleccionada', async () => {
    await prepareInspection()
    renderComponent()

    await screen.findByText('Respuestas BPM')
    expect(screen.getByText('1.1 Higiene del personal')).toBeInTheDocument()

    // Comprobar los 4 botones de respuesta con su texto visible exacto
    const cumplirBtns = screen.getAllByRole('button', { name: 'C · Cumple' })
    const cumplirParcialBtns = screen.getAllByRole('button', { name: 'CP · Cumple parcialmente' })
    const incumpleBtns = screen.getAllByRole('button', { name: 'IT · Incumple' })
    const noAplicaBtns = screen.getAllByRole('button', { name: 'N/A · No aplica' })

    expect(cumplirBtns).toHaveLength(2)
    expect(cumplirParcialBtns).toHaveLength(2)
    expect(incumpleBtns).toHaveLength(2)
    expect(noAplicaBtns).toHaveLength(2)

    // Pulsar "C · Cumple" en el primer criterio
    fireEvent.click(cumplirBtns[0])

    await waitFor(async () => {
      const stored = await openFieldState(user.id, inspection.id)
      expect(stored.responses).toContainEqual(expect.objectContaining({ bpmItemId: 'crit-1', responseValue: 'C' }))
    })

    // Cambiar a "CP · Cumple parcialmente"
    fireEvent.click(cumplirParcialBtns[0])

    await waitFor(async () => {
      const stored = await openFieldState(user.id, inspection.id)
      expect(stored.responses).toContainEqual(expect.objectContaining({ bpmItemId: 'crit-1', responseValue: 'CP' }))
    })
  })

  it('2. Selector de productos: categoría primero, luego subcategoría; muestra ambos en la lista', async () => {
    await prepareInspection()
    renderComponent()

    await screen.findByText('Productos de riesgo')

    // El selector de subcategoría debe estar inicialmente deshabilitado
    const subcatInput = screen.getByRole('combobox', { name: 'Subcategoría de producto' })
    expect(subcatInput).toBeDisabled()

    // El botón Agregar debe estar inicialmente deshabilitado
    const addBtn = screen.getByRole('button', { name: 'Agregar' })
    expect(addBtn).toBeDisabled()

    // Seleccionar categoría Bebidas
    const catInput = screen.getByRole('combobox', { name: 'Categoría de producto' })
    fireEvent.focus(catInput)
    fireEvent.change(catInput, { target: { value: 'Bebidas' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Bebidas' }))

    // Ahora el selector de subcategoría debe estar habilitado
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Subcategoría de producto' })).not.toBeDisabled()
    })

    const enabledSubcatInput = screen.getByRole('combobox', { name: 'Subcategoría de producto' })
    // Seleccionar subcategoría "Agua purificada"
    fireEvent.focus(enabledSubcatInput)
    fireEvent.change(enabledSubcatInput, { target: { value: 'purificada' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Agua purificada' }))

    // El botón Agregar ahora está habilitado
    expect(addBtn).not.toBeDisabled()
    fireEvent.click(addBtn)

    // La lista de agregados debe mostrar tanto la categoría como la subcategoría
    await waitFor(() => {
      expect(screen.getByText('Bebidas: Agua purificada')).toBeInTheDocument()
    })

    // Cambiar la categoría elegida a Lácteos limpia la subcategoría seleccionada y actualiza sus opciones
    fireEvent.click(screen.getByRole('button', { name: 'Abrir categorías' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Lácteos' }))

    // La subcategoría seleccionada se limpia
    expect(screen.getByRole('combobox', { name: 'Subcategoría de producto' })).toHaveValue('')

    // Y el producto agregado anteriormente sigue intacto en la lista con categoría y subcategoría
    expect(screen.getByText('Bebidas: Agua purificada')).toBeInTheDocument()
  })

  it('3. Guía rápidamente a los criterios faltantes con contador y botón "Ir al criterio"', async () => {
    // Inspección donde falta crit-2
    await prepareInspection({
      responses: [{ bpmItemId: 'crit-1', responseValue: 'C', observations: 'Bien' }],
      foodSnapshots: [{ foodRiskSubcategoryId: 'sub-agua-pura' }],
    })
    renderComponent()

    await screen.findByText('Respuestas BPM')

    // Intentar finalizar
    const finalizeBtn = screen.getByRole('button', { name: 'Finalizar inspección' })
    fireEvent.click(finalizeBtn)

    // Debe mostrar la alerta con la cantidad de faltantes y el criterio pendiente
    await screen.findByText(/Faltan respuestas BPM \(1 criterio pendiente\):/)
    expect(screen.getByText(/1\.2 · Control de plagas/)).toBeInTheDocument()

    // El botón "Ir al criterio" debe existir
    const goToCriterionBtn = screen.getByRole('button', { name: 'Ir al criterio' })
    expect(goToCriterionBtn).toBeInTheDocument()

    // Al pulsar "Ir al criterio", hace scroll y enfoca
    const scrollMock = vi.fn()
    const targetElement = document.getElementById('criterio-crit-2')
    if (targetElement) targetElement.scrollIntoView = scrollMock

    fireEvent.click(goToCriterionBtn)
    expect(scrollMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })

    // Contestar crit-2
    const crit2Cumple = screen.getAllByRole('button', { name: 'C · Cumple' })[1]
    fireEvent.click(crit2Cumple)

    // La alerta de criterios pendientes debe desaparecer
    await waitFor(() => {
      expect(screen.queryByText(/Faltan respuestas BPM/)).not.toBeInTheDocument()
    })
  })
})
