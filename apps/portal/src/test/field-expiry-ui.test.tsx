import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CoreInspection, CoreUser } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { downloadFieldPackage, saveResponse, type WorkPackage } from '../field/model'
import { canonical, sha256Hex, type PermitClaims } from '../offline/permit'
import { enrollOfflineIdentity, lockOfflineVault } from '../offline/vault'
import { FieldInspectionPage } from '../pages/field/FieldInspectionPage'

// Valor estable, como el estado real de SessionProvider: un objeto nuevo por render recrearía reload() en cada render.
const session = vi.hoisted(() => ({ user: null, offlineUser: { id: 'expiry-ui-eval', fullName: 'Evaluadora', roleCode: 'EVALUATOR' } }))
vi.mock('../session/SessionContext', () => ({ useSession: () => session }))
afterEach(() => { cleanup(); lockOfflineVault(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

it('oculta respuestas, criterios y evidencias al vencer el permiso aunque existan pendientes', async () => {
  const pair = generateKeyPairSync('ed25519')
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const owner: CoreUser = { id: 'expiry-ui-eval', fullName: 'Evaluadora', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }
  const inspection: CoreInspection = { id: 'expiry-ui-inspection', caseId: 'case', assignmentId: 'assignment', evaluatorUserId: owner.id,
    status: 'DRAFT', establishmentId: null, establishmentName: 'Establecimiento sanitario privado', establishmentAddress: null,
    companyName: 'Empresa privada', version: 1, contentRevision: 1, bpmTemplateVersionId: 'template', riskRuleVersionId: 'rule',
    origin: 'COMPANY_REQUEST', priority: 'HIGH', startedAt: null, finalizedAt: null, submittedAt: null, createdAt: '', updatedAt: '' }
  const pkg: WorkPackage = { inspection, bpmTemplate: { versionId: 'template', items: [{ id: 'criterion', parentItemId: null,
    itemKind: 'CRITERION', displayCode: '1', title: 'Criterio sanitario privado', sortOrder: 1, isEvaluable: true }] }, responses: [],
    riskRule: { versionId: 'rule', factors: [], foodCatalog: [] }, factorSelections: [], foodSnapshots: [], evidence: [], generatedAt: '' }
  await enrollOfflineIdentity(owner, 'clave')
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: owner.id, roleCode: 'EVALUATOR', inspectionId: inspection.id,
    packageHash: await sha256Hex(canonical(pkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  vi.spyOn(core, 'request').mockResolvedValueOnce({ data: { package: pkg, permit }, meta: { correlationId: 'test' } } as never)
  await downloadFieldPackage(owner.id, inspection.id)
  await saveResponse(owner.id, inspection.id, 'criterion', 'CP', 'Observación sanitaria privada')
  vi.spyOn(Date, 'now').mockReturnValue(now + 61_000)

  render(<MemoryRouter initialEntries={[`/campo/inspecciones/${inspection.id}`]}><Routes>
    <Route path="/campo/inspecciones/:id" element={<FieldInspectionPage />} />
  </Routes></MemoryRouter>)
  expect(await screen.findByText(/Hay 1 operaciones pendientes/)).toBeInTheDocument()
  expect(screen.queryByText(/Criterio sanitario privado/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Observación sanitaria privada/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Establecimiento sanitario privado/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Respuestas BPM/)).not.toBeInTheDocument()
})
