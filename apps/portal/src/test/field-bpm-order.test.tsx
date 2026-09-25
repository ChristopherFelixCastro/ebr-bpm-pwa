import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CoreInspection, CoreUser } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { orderBpmItems } from '../field/bpmOrder'
import { downloadFieldPackage, type WorkPackage } from '../field/model'
import { canonical, sha256Hex, type PermitClaims } from '../offline/permit'
import { enrollOfflineIdentity, lockOfflineVault } from '../offline/vault'
import { FieldInspectionPage } from '../pages/field/FieldInspectionPage'

const session = vi.hoisted(() => ({ user: null, offlineUser: { id: 'order-eval', fullName: 'Evaluadora', roleCode: 'EVALUATOR' } }))
vi.mock('../session/SessionContext', () => ({ useSession: () => session }))
afterEach(() => { cleanup(); lockOfflineVault(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

type Item = WorkPackage['bpmTemplate']['items'][number]
const item = (id: string, parentItemId: string | null, itemKind: string, displayCode: string, sortOrder: number, extra: Partial<Item> = {}): Item =>
  ({ id, parentItemId, itemKind, displayCode, title: `Título ${displayCode}`, sortOrder, isEvaluable: itemKind === 'CRITERION', ...extra })
// Flat, per-parent sortOrder, as Core sent it before the fix: levels interleave when sorted globally.
const scrambled: Item[] = [
  item('c21', 's2', 'CRITERION', '2.1', 0), item('c1111', 'g111', 'CRITERION', '1.1.1.1', 0, { criticality: 'MAYOR', guidanceItems: [{ id: 'g1', text: 'Verifique drenajes.', criticality: 'CRITICA' }, { id: 'g2', text: 'Observe rejillas.' }] }),
  item('ss11', 's1', 'SUBSECTION', '1.1', 0), item('g111', 'ss11', 'GROUP', '1.1.1', 0), item('s1', null, 'SECTION', '1', 0),
  item('c12', 's1', 'CRITERION', '1.2', 1), item('s2', null, 'SECTION', '2', 1), item('c112', 'ss11', 'CRITERION', '1.1.2', 1),
]
const readingOrder = ['1', '1.1', '1.1.1', '1.1.1.1', '1.1.2', '1.2', '2', '2.1']

it('ordena el paquete en profundidad con la profundidad de cada nivel', () => {
  const ordered = orderBpmItems(scrambled)
  expect(ordered.map(({ item: entry }) => entry.displayCode)).toEqual(readingOrder)
  expect(ordered.map(({ depth }) => depth)).toEqual([1, 2, 3, 4, 3, 2, 1, 2])
})

it('muestra la ficha de campo en orden jerárquico y la criticidad como información separada', async () => {
  const pair = generateKeyPairSync('ed25519')
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const owner: CoreUser = { id: 'order-eval', fullName: 'Evaluadora', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }
  const inspection: CoreInspection = { id: 'order-inspection', caseId: 'case', assignmentId: 'assignment', evaluatorUserId: owner.id,
    status: 'IN_PROGRESS', establishmentId: null, establishmentName: 'Planta', establishmentAddress: null, companyName: 'Empresa', version: 1, contentRevision: 1,
    bpmTemplateVersionId: 'template', riskRuleVersionId: 'rule', origin: 'COMPANY_REQUEST', priority: 'HIGH', startedAt: null, finalizedAt: null, submittedAt: null, createdAt: '', updatedAt: '' }
  const pkg: WorkPackage = { inspection, bpmTemplate: { versionId: 'template', items: scrambled }, responses: [],
    riskRule: { versionId: 'rule', factors: [], foodCatalog: [] }, factorSelections: [], foodSnapshots: [], evidence: [], generatedAt: '' }
  await enrollOfflineIdentity(owner, 'clave')
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: owner.id, roleCode: 'EVALUATOR', inspectionId: inspection.id,
    packageHash: await sha256Hex(canonical(pkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3_600_000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  vi.spyOn(core, 'request').mockResolvedValueOnce({ data: { package: pkg, permit }, meta: { correlationId: 'test' } } as never)
  await downloadFieldPackage(owner.id, inspection.id)

  render(<MemoryRouter initialEntries={[`/campo/inspecciones/${inspection.id}`]}><Routes>
    <Route path="/campo/inspecciones/:id" element={<FieldInspectionPage />} />
  </Routes></MemoryRouter>)
  await screen.findByText('Respuestas BPM')
  const headings = screen.getAllByText(/^[\d.]+ Título /).map((node) => node.textContent?.split(' ')[0])
  expect(headings).toEqual(readingOrder)
  expect(screen.getByText('Criticidad mayor')).toBeInTheDocument()
  expect(screen.getByText('Criticidad crítica')).toBeInTheDocument()
  expect(screen.getByText('Instrucción: Observe rejillas.')).toBeInTheDocument()
  expect(screen.getAllByRole('combobox', { name: 'Respuesta' })).toHaveLength(4)
})
