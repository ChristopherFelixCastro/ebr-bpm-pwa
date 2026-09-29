import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { CoreApiError, type CoreInspection, type CoreUser } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { acknowledgeRenewalConflict, addEvidence, compareRenewalConflict, confirmFieldRenewal, downloadFieldPackage, inspectStoredFieldState, openFieldState, previewFieldRenewal, rebaseConflict, removePendingEvidence, reviewFieldConflict, saveResponse, syncFieldState, type WorkPackage } from '../field/model'
import { canonical, sha256Hex, type PermitClaims } from '../offline/permit'
import { enrollOfflineIdentity, lockOfflineVault, offlineDb, openOfflineBinary, saveOfflinePackage, unlockOfflineIdentity } from '../offline/vault'

const pair = generateKeyPairSync('ed25519')
const user: CoreUser = { id: 'field-flow-eval', fullName: 'Evaluadora', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }
const inspection: CoreInspection = { id: 'field-flow-inspection', caseId: 'case-1', assignmentId: 'assignment-1', evaluatorUserId: user.id, status: 'DRAFT', establishmentId: null, establishmentName: 'Planta', establishmentAddress: null, companyName: 'Empresa', version: 1, contentRevision: 1, bpmTemplateVersionId: 'template-1', riskRuleVersionId: 'rule-1', origin: 'COMPANY_REQUEST', priority: 'HIGH', startedAt: null, finalizedAt: null, submittedAt: null, createdAt: '', updatedAt: '' }
const pkg: WorkPackage = { inspection, bpmTemplate: { versionId: 'template-1', items: [{ id: 'criterion-1', parentItemId: null, itemKind: 'CRITERION', displayCode: '1', title: 'Criterio real', sortOrder: 1, isEvaluable: true }, { id: 'instruction-1', parentItemId: null, itemKind: 'GROUP', displayCode: null, title: 'Instrucción', sortOrder: 2, isEvaluable: false }] }, responses: [], riskRule: { versionId: 'rule-1', factors: [], foodCatalog: [] }, factorSelections: [], foodSnapshots: [], evidence: [], generatedAt: new Date().toISOString() }
const envelope = (data: unknown) => ({ data, meta: { correlationId: 'test' } }) as never
afterEach(() => { lockOfflineVault(); vi.restoreAllMocks(); vi.unstubAllEnvs(); core.disconnect() })

it('conserva el PDF sintético y las tres operaciones cuando Storage rechaza ADD_EVIDENCE', async () => {
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const owner = { ...user, id: 'field-storage-error-eval' }
  const localPkg = { ...pkg, inspection: { ...inspection, id: 'field-storage-error-inspection', evaluatorUserId: owner.id, status: 'IN_PROGRESS' as const } }
  await enrollOfflineIdentity(owner, 'clave-local-prueba')
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: owner.id, roleCode: 'EVALUATOR', inspectionId: localPkg.inspection.id, packageHash: await sha256Hex(canonical(localPkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  const api = vi.spyOn(core, 'request').mockResolvedValueOnce(envelope({ package: localPkg, permit }))
  await downloadFieldPackage(owner.id, localPkg.inspection.id)
  const bytes = new Uint8Array(55 * 1024)
  bytes.set(new TextEncoder().encode('%PDF-'))
  const file = { name: 'prueba.pdf', type: 'application/pdf', size: bytes.length, arrayBuffer: async () => bytes.buffer } as File
  const state = await addEvidence(owner.id, localPkg.inspection.id, file, null)
  for (const type of ['FINALIZE', 'SUBMIT'] as const) state.queue.push({ operationId: crypto.randomUUID(), type, payload: {}, status: 'PENDING', attempts: 0, createdAt: new Date().toISOString() })
  await saveOfflinePackage(owner.id, localPkg.inspection.id, state)
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  api.mockRejectedValue(new CoreApiError(503, 'STORAGE_UNAVAILABLE', 'Almacenamiento no disponible.', 'test-storage-correlation'))
  const after = await syncFieldState(owner.id, localPkg.inspection.id)
  expect(after.queue.map((entry) => entry.type)).toEqual(['ADD_EVIDENCE', 'FINALIZE', 'SUBMIT'])
  expect(after.queue.map((entry) => entry.status)).toEqual(['PENDING', 'PENDING', 'PENDING'])
  expect(after.queue[0].lastError).toContain('test-storage-correlation')
  expect(after.queue[0].lastError).toContain('evidencia local sigue pendiente')
  expect(api).toHaveBeenCalledTimes(2)
  expect(api.mock.calls[1][0]).toContain('/evidence')
  expect([...await openOfflineBinary(owner.id, localPkg.inspection.id, after.evidence[0].id)]).toEqual([...bytes])
  expect((await openFieldState(owner.id, localPkg.inspection.id)).queue).toHaveLength(3)
})

it('abre tras recarga offline y reintenta la misma operación idempotente sin perder pendientes', async () => {
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  await enrollOfflineIdentity(user, 'clave-de-campo')
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: user.id, roleCode: 'EVALUATOR', inspectionId: inspection.id, packageHash: await sha256Hex(canonical(pkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  const api = vi.spyOn(core, 'request').mockResolvedValueOnce(envelope({ package: pkg, permit }))
  await downloadFieldPackage(user.id, inspection.id)
  await expect(saveResponse(user.id, inspection.id, 'instruction-1', 'C', '')).rejects.toThrow('instrucciones BPM')
  await saveResponse(user.id, inspection.id, 'criterion-1', 'CP', 'Observación local')
  const sample = new Uint8Array([1, 2, 3])
  const file = { name: 'foto.png', type: 'image/png', size: sample.byteLength, arrayBuffer: async () => sample.buffer } as File
  const withEvidence = await addEvidence(user.id, inspection.id, file, null)
  const binaryId = withEvidence.evidence[0].id
  expect([...await openOfflineBinary(user.id, inspection.id, binaryId)]).toEqual([1, 2, 3])
  const withoutEvidence = await removePendingEvidence(user.id, inspection.id, binaryId)
  expect(withoutEvidence.evidence).toEqual([])
  await expect(openOfflineBinary(user.id, inspection.id, binaryId)).rejects.toThrow('no disponible')
  lockOfflineVault()
  await expect(openFieldState(user.id, inspection.id)).rejects.toThrow('bloqueado')
  await unlockOfflineIdentity(user.id, 'clave-de-campo')
  expect((await openFieldState(user.id, inspection.id)).responses).toMatchObject([{ responseValue: 'CP', observations: 'Observación local' }])
  await expect(openFieldState('otra-cuenta', inspection.id)).rejects.toThrow()
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  api.mockImplementation(async (path) => {
    if (String(path).endsWith('/start')) return envelope({ ...inspection, status: 'IN_PROGRESS', version: 2 })
    if (String(path).endsWith('/offline-operations/batch')) throw new Error('Sin red')
    throw new Error(`Ruta inesperada: ${String(path)}`)
  })
  let state = await syncFieldState(user.id, inspection.id)
  expect(state.queue[0]).toMatchObject({ status: 'PENDING', attempts: 1, baseVersion: 2 })
  const first = { ...state.queue[0] }
  api.mockImplementation(async (path) => {
    if (String(path).endsWith('/offline-operations/batch')) return envelope([{ status: 'APPLIED', currentVersion: 3, resultingVersion: 3 }])
    throw new Error(`Ruta inesperada: ${String(path)}`)
  })
  state = await syncFieldState(user.id, inspection.id)
  expect(state.queue[0]).toMatchObject({ status: 'APPLIED', operationId: first.operationId, baseVersion: first.baseVersion, payloadHash: first.payloadHash })
  expect(state.inspection.version).toBe(3)
  const stored = await inspectStoredFieldState(user.id, inspection.id)
  expect(stored.status).toBe('READY')
  if (stored.status === 'READY') expect(stored.state.responses[0].observations).toBe('Observación local')
  vi.spyOn(Date, 'now').mockReturnValue(now + 61_000)
  await expect(openFieldState(user.id, inspection.id)).rejects.toThrow('venció')
  expect(await inspectStoredFieldState(user.id, inspection.id)).toEqual({ status: 'EXPIRED', pendingCount: 0, hasPending: false })
})

it('conserva un 409 y exige revisión explícita antes de rebasar el cambio local', async () => {
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const second = { ...user, id: 'field-conflict-eval' }
  const localPkg = { ...pkg, inspection: { ...inspection, id: 'field-conflict-inspection', evaluatorUserId: second.id, status: 'IN_PROGRESS' as const, version: 2 } }
  await enrollOfflineIdentity(second, 'clave-conflicto')
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: second.id, roleCode: 'EVALUATOR', inspectionId: localPkg.inspection.id, packageHash: await sha256Hex(canonical(localPkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  const api = vi.spyOn(core, 'request').mockResolvedValueOnce(envelope({ package: localPkg, permit }))
  await downloadFieldPackage(second.id, localPkg.inspection.id)
  await saveResponse(second.id, localPkg.inspection.id, 'criterion-1', 'C', 'Trabajo conservado')
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  api.mockResolvedValueOnce(envelope([{ status: 'CONFLICT', currentVersion: 3, code: 'VERSION_CONFLICT', currentValue: { responseValue: 'IT' } }]))
  const conflicted = await syncFieldState(second.id, localPkg.inspection.id)
  expect(conflicted.queue[0]).toMatchObject({ status: 'CONFLICT', currentValue: { responseValue: 'IT' } })
  const originalId = conflicted.queue[0].operationId
  api.mockResolvedValue(envelope({ ...localPkg, inspection: { ...localPkg.inspection, version: 3 }, responses: [{ bpmItemId: 'criterion-1', responseValue: 'IT', observations: null }] }))
  expect(await reviewFieldConflict(second.id, localPkg.inspection.id, originalId)).toMatchObject({ version: 3, current: { responseValue: 'IT' } })
  const rebased = await rebaseConflict(second.id, localPkg.inspection.id, originalId)
  expect(rebased.queue.map((entry) => entry.status)).toEqual(['RESOLVED', 'PENDING'])
  expect(rebased.queue[1].operationId).not.toBe(originalId)
  expect(rebased.responses[0].observations).toBe('Trabajo conservado')
})

it('no sobrescribe un paquete local existente si no puede descifrarlo', async () => {
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const owner = { ...user, id: 'field-corrupt-eval' }
  const localPkg = { ...pkg, inspection: { ...inspection, id: 'field-corrupt-inspection', evaluatorUserId: owner.id } }
  await enrollOfflineIdentity(owner, 'clave-local')
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: owner.id, roleCode: 'EVALUATOR', inspectionId: localPkg.inspection.id, packageHash: await sha256Hex(canonical(localPkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  vi.spyOn(core, 'request').mockResolvedValue(envelope({ package: localPkg, permit }))
  await downloadFieldPackage(owner.id, localPkg.inspection.id)
  const key = `${owner.id}:${localPkg.inspection.id}`
  const row = await offlineDb.packages.get(key)
  expect(row).toBeDefined()
  const modified = [...row!.content]; modified[0] ^= 1
  await offlineDb.packages.update(key, { content: modified })
  await expect(downloadFieldPackage(owner.id, localPkg.inspection.id)).rejects.toThrow()
  expect((await offlineDb.packages.get(key))?.content).toEqual(modified)
})

for (const expired of [false, true]) it(`compara una versión distinta con pendientes ${expired ? 'y permiso vencido' : 'y permiso vigente'} antes de renovar`, async () => {
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const owner = { ...user, id: `field-renewal-${expired}` }
  const localPkg: WorkPackage = { ...pkg, inspection: { ...inspection, id: `inspection-renewal-${expired}`, evaluatorUserId: owner.id },
    bpmTemplate: { ...pkg.bpmTemplate, items: [...pkg.bpmTemplate.items, { id: 'criterion-2', parentItemId: null, itemKind: 'CRITERION', displayCode: '2', title: 'Otro criterio', sortOrder: 3, isEvaluable: true }] },
    responses: [{ bpmItemId: 'criterion-2', responseValue: 'C', observations: 'Valor anterior' }] }
  await enrollOfflineIdentity(owner, 'clave-renovacion')
  const now = Date.now()
  const makePermit = async (workPackage: WorkPackage, issuedAt: number) => {
    const claims: PermitClaims = { v: 1, userId: owner.id, roleCode: 'EVALUATOR', inspectionId: localPkg.inspection.id,
      packageHash: await sha256Hex(canonical(workPackage)), issuedAt: new Date(issuedAt).toISOString(), expiresAt: new Date(issuedAt + 60_000).toISOString() }
    return { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  }
  const initialPermit = await makePermit(localPkg, now)
  const api = vi.spyOn(core, 'request').mockResolvedValueOnce(envelope({ package: localPkg, permit: initialPermit }))
  await downloadFieldPackage(owner.id, localPkg.inspection.id)
  await saveResponse(owner.id, localPkg.inspection.id, 'criterion-1', 'CP', 'Pendiente local privado')
  const sample = new Uint8Array([9, 8, 7])
  const file = { name: 'evidencia.png', type: 'image/png', size: sample.byteLength, arrayBuffer: async () => sample.buffer } as File
  const before = await addEvidence(owner.id, localPkg.inspection.id, file, null)
  const operationIds = before.queue.map((entry) => entry.operationId)
  const binaryId = before.evidence[0].id
  if (expired) vi.spyOn(Date, 'now').mockReturnValue(now + 61_000)
  const stored = await inspectStoredFieldState(owner.id, localPkg.inspection.id)
  if (expired) {
    expect(stored).toEqual({ status: 'EXPIRED', pendingCount: 2, hasPending: true })
    expect(JSON.stringify(stored)).not.toContain('Pendiente local privado')
    await expect(openFieldState(owner.id, localPkg.inspection.id)).rejects.toThrow('venció')
  } else expect(stored.status).toBe('READY')
  const freshPkg: WorkPackage = { ...localPkg, inspection: { ...localPkg.inspection, status: 'IN_PROGRESS', version: 3 },
    responses: [{ bpmItemId: 'criterion-1', responseValue: 'IT', observations: 'Valor Core' }, { bpmItemId: 'criterion-2', responseValue: 'NA', observations: 'Cambio Core' }] }
  const freshPermit = await makePermit(freshPkg, Date.now())
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  api.mockResolvedValue(envelope({ package: freshPkg, permit: freshPermit }))
  await expect(downloadFieldPackage(owner.id, localPkg.inspection.id)).rejects.toThrow('comparar y renovar')
  const preview = await previewFieldRenewal(owner.id, localPkg.inspection.id)
  expect(preview).toMatchObject({ localVersion: 1, coreVersion: 3, pendingCount: 2, assignmentChanged: false, definitionsChanged: false })
  expect(JSON.stringify(preview)).not.toContain('Pendiente local privado')
  const renewed = await confirmFieldRenewal(owner.id, localPkg.inspection.id, preview)
  expect(renewed.renewalConflict).toEqual({ localVersion: 1, coreVersion: 3 })
  expect(renewed.queue.map((entry) => entry.operationId)).toEqual(operationIds)
  expect(renewed.queue.map((entry) => entry.status)).toEqual(['PENDING', 'PENDING'])
  expect([...await openOfflineBinary(owner.id, localPkg.inspection.id, binaryId)]).toEqual([9, 8, 7])
  expect(compareRenewalConflict(renewed)[0]).toMatchObject({ local: { responseValue: 'CP', observations: 'Pendiente local privado' }, current: { responseValue: 'IT' } })
  expect(compareRenewalConflict(renewed)).toContainEqual(expect.objectContaining({ type: 'CORE_BPM_CHANGE', local: expect.objectContaining({ responseValue: 'C' }), current: expect.objectContaining({ responseValue: 'NA' }) }))
  await expect(syncFieldState(owner.id, localPkg.inspection.id)).rejects.toThrow('confirme la revisión')
  expect(api.mock.calls.every(([route]) => !String(route).includes('offline-operations/batch'))).toBe(true)
  const acknowledged = await acknowledgeRenewalConflict(owner.id, localPkg.inspection.id)
  expect(acknowledged.renewalConflict).toBeUndefined()
  expect(acknowledged.responses).toEqual(expect.arrayContaining([{ bpmItemId: 'criterion-1', responseValue: 'CP', observations: 'Pendiente local privado' }, { bpmItemId: 'criterion-2', responseValue: 'NA', observations: 'Cambio Core' }]))
  expect(acknowledged.queue.map((entry) => entry.operationId)).toEqual(operationIds)
  expect([...await openOfflineBinary(owner.id, localPkg.inspection.id, binaryId)]).toEqual([9, 8, 7])
})
