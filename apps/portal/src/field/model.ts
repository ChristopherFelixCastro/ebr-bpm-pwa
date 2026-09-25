import { CoreApiError, type CoreInspection } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { OfflinePackageMissingError, deleteOfflineBinary, openOfflineBinary, openOfflinePackage, saveOfflineBinary, saveOfflinePackage } from '../offline/vault'
import { canonical, sha256Hex, verifyPermit, type SignedPermit } from '../offline/permit'

export type BpmValue = 'C' | 'CP' | 'IT' | 'NA'
export type WorkPackage = {
  inspection: CoreInspection
  bpmTemplate: { versionId: string; items: Array<{ id: string; parentItemId: string | null; itemKind: string; displayCode: string | null; title: string; sortOrder: number; isEvaluable: boolean; guidanceItems?: Array<{ id: string; text: string }> }> }
  responses: Array<{ bpmItemId: string; responseValue: BpmValue; observations: string | null }>
  riskRule: { versionId: string; factors: Array<{ id: string; code: string; name: string; options: Array<{ id: string; code: string; label: string }> }>; foodCatalog: Array<{ id: string; name: string; subcategories: Array<{ id: string; name: string; riskScore: number | null }> }> }
  factorSelections: Array<{ riskFactorId: string; optionId: string }>
  foodSnapshots: Array<{ foodRiskSubcategoryId: string }>
  evidence: Array<{ id: string; fileName: string; sizeBytes: number; status: string; deletedAt: string | null }>
  generatedAt: string
}
export type FieldOperationType = 'UPSERT_BPM_RESPONSE' | 'UPSERT_RISK_FACTOR_SELECTION' | 'ADD_FOOD_SNAPSHOT' | 'SAVE_LOCATION' | 'ADD_EVIDENCE' | 'FINALIZE' | 'SUBMIT'
export type FieldOperation = { operationId: string; type: FieldOperationType; payload: Record<string, unknown>; status: 'PENDING' | 'SENDING' | 'APPLIED' | 'CONFLICT' | 'REJECTED' | 'RESOLVED'; attempts: number; createdAt: string; baseVersion?: number; payloadHash?: string; lastError?: string; currentValue?: unknown }
export type LocalEvidence = { id: string; operationId: string; fileName: string; mimeType: string; sizeBytes: number; bpmItemId: string | null; status: 'PENDING' | 'CONFIRMED' | 'CONFLICT' | 'REJECTED'; lastError?: string }
export type FieldState = {
  signedPackage: WorkPackage; permit: SignedPermit | null; inspection: CoreInspection; responses: WorkPackage['responses'];
  factorSelections: WorkPackage['factorSelections']; foodSnapshots: WorkPackage['foodSnapshots'];
  evidence: LocalEvidence[]; queue: FieldOperation[]; localFinalized: boolean; downloadedAt: string
  renewalConflict?: { localVersion: number; coreVersion: number }
}
export type StoredFieldState = { status: 'READY'; state: FieldState } | { status: 'EXPIRED'; pendingCount: number; hasPending: boolean }
export type FieldRenewalPreview = {
  localVersion: number; coreVersion: number; coreStatus: CoreInspection['status']; pendingCount: number
  assignmentChanged: boolean; definitionsChanged: boolean
}
const path = (id: string) => encodeURIComponent(id)
const editable = (state: FieldState) => ['DRAFT', 'IN_PROGRESS'].includes(state.inspection.status) && !state.localFinalized && !state.renewalConflict
const pending = (state: FieldState) => state.queue.some((entry) => entry.status !== 'APPLIED' && entry.status !== 'RESOLVED') || state.evidence.some((entry) => entry.status !== 'CONFIRMED')
const pendingCount = (state: FieldState) => state.queue.filter((entry) => entry.status !== 'APPLIED' && entry.status !== 'RESOLVED').length

async function readStoredFieldState(userId: string, id: string): Promise<FieldState> {
  const state = await openOfflinePackage<FieldState>(userId, id)
  if (!state.signedPackage || !state.permit) throw new Error('Este paquete anterior no tiene permiso firmado. Reconéctese para descargarlo de nuevo.')
  await verifyPermit(state.permit, state.signedPackage, userId, id, Date.now(), true)
  if (state.inspection.id !== id) throw new Error('Inspección local inválida.')
  return state
}
async function fetchAuthorizedPackage(userId: string, id: string) {
  const response = (await core.request<{ package: WorkPackage; permit: SignedPermit }>(`/v1/inspections/${path(id)}/offline-package`, { method: 'POST', body: '{}' })).data
  await verifyPermit(response.permit, response.package, userId, id)
  return response
}

export async function openFieldState(userId: string, id: string): Promise<FieldState> {
  const state = await readStoredFieldState(userId, id)
  await verifyPermit(state.permit!, state.signedPackage, userId, id)
  return state
}
export async function inspectStoredFieldState(userId: string, id: string): Promise<StoredFieldState> {
  const state = await readStoredFieldState(userId, id)
  const now = Date.now()
  if (now >= Date.parse(state.permit!.claims.expiresAt) || now < Date.parse(state.permit!.claims.issuedAt) - 5 * 60_000)
    return { status: 'EXPIRED', pendingCount: pendingCount(state), hasPending: pending(state) }
  return { status: 'READY', state }
}
export async function downloadFieldPackage(userId: string, id: string): Promise<FieldState> {
  const response = await fetchAuthorizedPackage(userId, id)
  let prior: FieldState | undefined
  try { prior = await readStoredFieldState(userId, id) }
  catch (error) { if (!(error instanceof OfflinePackageMissingError)) throw error }
  if (prior && pending(prior)) {
    if (prior.inspection.version !== response.package.inspection.version ||
      prior.signedPackage.bpmTemplate.versionId !== response.package.bpmTemplate.versionId ||
      prior.signedPackage.riskRule.versionId !== response.package.riskRule.versionId)
      throw new Error('Core cambió esta inspección. Los pendientes se conservan; abra la inspección para comparar y renovar.')
    prior.signedPackage = response.package; prior.permit = response.permit
    await saveOfflinePackage(userId, id, prior)
    return prior
  }
  const pkg = response.package
  const state: FieldState = {
    signedPackage: pkg, permit: response.permit, inspection: pkg.inspection, responses: pkg.responses,
    factorSelections: pkg.factorSelections, foodSnapshots: pkg.foodSnapshots, evidence: [], queue: [],
    localFinalized: false, downloadedAt: new Date().toISOString(),
  }
  await saveOfflinePackage(userId, id, state)
  return state
}
const renewalPreview = (prior: FieldState, fresh: WorkPackage): FieldRenewalPreview => ({
  localVersion: prior.inspection.version, coreVersion: fresh.inspection.version, coreStatus: fresh.inspection.status,
  pendingCount: pendingCount(prior), assignmentChanged: prior.inspection.assignmentId !== fresh.inspection.assignmentId,
  definitionsChanged: prior.signedPackage.bpmTemplate.versionId !== fresh.bpmTemplate.versionId ||
    prior.signedPackage.riskRule.versionId !== fresh.riskRule.versionId,
})
export async function previewFieldRenewal(userId: string, id: string): Promise<FieldRenewalPreview> {
  if (!navigator.onLine || !core.authenticated) throw new Error('Conéctese e inicie sesión para comparar con Core.')
  const prior = await readStoredFieldState(userId, id)
  const fresh = await fetchAuthorizedPackage(userId, id)
  return renewalPreview(prior, fresh.package)
}
export async function confirmFieldRenewal(userId: string, id: string, preview: FieldRenewalPreview): Promise<FieldState> {
  if (!navigator.onLine || !core.authenticated) throw new Error('Conéctese e inicie sesión para renovar.')
  const prior = await readStoredFieldState(userId, id)
  const fresh = await fetchAuthorizedPackage(userId, id)
  const current = renewalPreview(prior, fresh.package)
  if (JSON.stringify(current) !== JSON.stringify(preview)) throw new Error('Core cambió desde la comparación. Compare de nuevo antes de renovar.')
  if (current.assignmentChanged || current.definitionsChanged || !['DRAFT', 'IN_PROGRESS'].includes(current.coreStatus))
    throw new Error('La asignación, definición o estado cambió. Los pendientes permanecen cifrados; requiere revisión antes de renovar.')
  if (pending(prior)) {
    prior.signedPackage = fresh.package
    prior.permit = fresh.permit
    prior.inspection = fresh.package.inspection
    if (current.localVersion !== current.coreVersion)
      prior.renewalConflict = { localVersion: current.localVersion, coreVersion: current.coreVersion }
    await saveOfflinePackage(userId, id, prior)
    return prior
  }
  const pkg = fresh.package
  const state: FieldState = {
    signedPackage: pkg, permit: fresh.permit, inspection: pkg.inspection, responses: pkg.responses,
    factorSelections: pkg.factorSelections, foodSnapshots: pkg.foodSnapshots, evidence: [], queue: [],
    localFinalized: false, downloadedAt: new Date().toISOString(),
  }
  await saveOfflinePackage(userId, id, state)
  return state
}
export function compareRenewalConflict(state: FieldState) {
  if (!state.renewalConflict) return []
  const fresh = state.signedPackage
  const outstanding = state.queue.filter((op) => op.status !== 'APPLIED' && op.status !== 'RESOLVED')
  const changes: Array<{ operationId: string; type: string; status: string; local: unknown; current: unknown }> = outstanding.map((op) => {
    let current: unknown = null
    if (op.type === 'UPSERT_BPM_RESPONSE') current = fresh.responses.find((entry) => entry.bpmItemId === op.payload.bpmItemId) ?? null
    if (op.type === 'UPSERT_RISK_FACTOR_SELECTION') current = fresh.factorSelections.find((entry) => entry.riskFactorId === op.payload.factorId) ?? null
    if (op.type === 'ADD_FOOD_SNAPSHOT') current = fresh.foodSnapshots.find((entry) => entry.foodRiskSubcategoryId === op.payload.foodRiskSubcategoryId) ?? null
    if (op.type === 'ADD_EVIDENCE') current = fresh.evidence.map((entry) => ({ fileName: entry.fileName, status: entry.status }))
    if (op.type === 'FINALIZE' || op.type === 'SUBMIT') current = fresh.inspection.status
    const local = op.type === 'ADD_EVIDENCE' ? state.evidence.find((entry) => entry.operationId === op.operationId)?.fileName ?? null : op.payload
    return { operationId: op.operationId, type: op.type, status: op.status, local, current }
  })
  const pendingResponses = new Set(outstanding.filter((op) => op.type === 'UPSERT_BPM_RESPONSE').map((op) => op.payload.bpmItemId))
  for (const itemId of new Set([...state.responses.map((entry) => entry.bpmItemId), ...fresh.responses.map((entry) => entry.bpmItemId)])) {
    if (pendingResponses.has(itemId)) continue
    const local = state.responses.find((entry) => entry.bpmItemId === itemId) ?? null
    const current = fresh.responses.find((entry) => entry.bpmItemId === itemId) ?? null
    if (JSON.stringify(local) !== JSON.stringify(current)) changes.push({ operationId: `core-bpm-${itemId}`, type: 'CORE_BPM_CHANGE', status: 'CORE_CHANGED', local, current })
  }
  const pendingFactors = new Set(outstanding.filter((op) => op.type === 'UPSERT_RISK_FACTOR_SELECTION').map((op) => op.payload.factorId))
  for (const factorId of new Set([...state.factorSelections.map((entry) => entry.riskFactorId), ...fresh.factorSelections.map((entry) => entry.riskFactorId)])) {
    if (pendingFactors.has(factorId)) continue
    const local = state.factorSelections.find((entry) => entry.riskFactorId === factorId) ?? null
    const current = fresh.factorSelections.find((entry) => entry.riskFactorId === factorId) ?? null
    if (JSON.stringify(local) !== JSON.stringify(current)) changes.push({ operationId: `core-factor-${factorId}`, type: 'CORE_FACTOR_CHANGE', status: 'CORE_CHANGED', local, current })
  }
  const pendingFoodIds = new Set(outstanding.filter((op) => op.type === 'ADD_FOOD_SNAPSHOT').map((op) => op.payload.foodRiskSubcategoryId))
  const oldFood = state.foodSnapshots.filter((entry) => !pendingFoodIds.has(entry.foodRiskSubcategoryId))
  const currentFood = fresh.foodSnapshots.filter((entry) => !pendingFoodIds.has(entry.foodRiskSubcategoryId))
  if (JSON.stringify(oldFood) !== JSON.stringify(currentFood)) changes.push({ operationId: 'core-food', type: 'CORE_FOOD_CHANGE', status: 'CORE_CHANGED', local: oldFood, current: currentFood })
  return changes
}
export async function acknowledgeRenewalConflict(userId: string, id: string): Promise<FieldState> {
  const state = await openFieldState(userId, id)
  if (!state.renewalConflict) throw new Error('No hay renovación pendiente de revisión.')
  const outstanding = state.queue.filter((op) => op.status !== 'APPLIED' && op.status !== 'RESOLVED')
  const responseIds = new Set(outstanding.filter((op) => op.type === 'UPSERT_BPM_RESPONSE').map((op) => op.payload.bpmItemId))
  const factorIds = new Set(outstanding.filter((op) => op.type === 'UPSERT_RISK_FACTOR_SELECTION').map((op) => op.payload.factorId))
  const foodIds = new Set(outstanding.filter((op) => op.type === 'ADD_FOOD_SNAPSHOT').map((op) => op.payload.foodRiskSubcategoryId))
  state.responses = [...state.signedPackage.responses.filter((entry) => !responseIds.has(entry.bpmItemId)), ...state.responses.filter((entry) => responseIds.has(entry.bpmItemId))]
  state.factorSelections = [...state.signedPackage.factorSelections.filter((entry) => !factorIds.has(entry.riskFactorId)), ...state.factorSelections.filter((entry) => factorIds.has(entry.riskFactorId))]
  state.foodSnapshots = [...state.signedPackage.foodSnapshots, ...state.foodSnapshots.filter((entry) => foodIds.has(entry.foodRiskSubcategoryId) && !state.signedPackage.foodSnapshots.some((current) => current.foodRiskSubcategoryId === entry.foodRiskSubcategoryId))]
  delete state.renewalConflict
  await saveOfflinePackage(userId, id, state)
  return state
}
const enqueue = (state: FieldState, type: FieldOperationType, payload: Record<string, unknown>) => {
  state.queue.push({ operationId: crypto.randomUUID(), type, payload, status: 'PENDING', attempts: 0, createdAt: new Date().toISOString() })
}
export async function updateFieldState(userId: string, id: string, update: (state: FieldState) => void): Promise<FieldState> {
  const state = await openFieldState(userId, id)
  if (!editable(state)) throw new Error('Esta inspección no admite cambios locales.')
  update(state)
  await saveOfflinePackage(userId, id, state)
  return state
}
export const saveResponse = (userId: string, id: string, itemId: string, responseValue: BpmValue, observations: string) => updateFieldState(userId, id, (state) => {
  const item = state.signedPackage.bpmTemplate.items.find((entry) => entry.id === itemId)
  if (!item || item.itemKind !== 'CRITERION' || !item.isEvaluable) throw new Error('Las instrucciones BPM no se responden.')
  state.responses = [...state.responses.filter((entry) => entry.bpmItemId !== itemId), { bpmItemId: itemId, responseValue, observations }]
  enqueue(state, 'UPSERT_BPM_RESPONSE', { bpmItemId: itemId, responseValue, observations })
})
export const selectFactor = (userId: string, id: string, factorId: string, optionId: string) => updateFieldState(userId, id, (state) => {
  const factor = state.signedPackage.riskRule.factors.find((entry) => entry.id === factorId)
  if (!factor?.options.some((option) => option.id === optionId)) throw new Error('Opción de factor no disponible.')
  state.factorSelections = [...state.factorSelections.filter((entry) => entry.riskFactorId !== factorId), { riskFactorId: factorId, optionId }]
  enqueue(state, 'UPSERT_RISK_FACTOR_SELECTION', { factorId, optionId })
})
export const addFood = (userId: string, id: string, subcategoryId: string) => updateFieldState(userId, id, (state) => {
  if (!state.signedPackage.riskRule.foodCatalog.some((category) => category.subcategories.some((sub) => sub.id === subcategoryId))) throw new Error('Producto no disponible.')
  if (state.foodSnapshots.some((entry) => entry.foodRiskSubcategoryId === subcategoryId)) return
  state.foodSnapshots.push({ foodRiskSubcategoryId: subcategoryId })
  enqueue(state, 'ADD_FOOD_SNAPSHOT', { foodRiskSubcategoryId: subcategoryId })
})
export const saveLocation = (userId: string, id: string, location: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string }) => updateFieldState(userId, id, (state) => {
  enqueue(state, 'SAVE_LOCATION', location)
})
const validFiles = new Map([['image/jpeg', /\.jpe?g$/i], ['image/png', /\.png$/i], ['image/webp', /\.webp$/i], ['application/pdf', /\.pdf$/i], ['video/mp4', /\.mp4$/i], ['video/webm', /\.webm$/i]])
export async function addEvidence(userId: string, id: string, file: File, bpmItemId: string | null): Promise<FieldState> {
  const state = await openFieldState(userId, id)
  if (!editable(state)) throw new Error('Esta inspección no admite evidencias nuevas.')
  if (!file.size || file.size > 5 * 1024 * 1024 || !validFiles.get(file.type)?.test(file.name)) throw new Error('Use JPEG, PNG, WebP, PDF, MP4 o WebM de hasta 5 MB.')
  const activeServer = state.signedPackage.evidence.filter((entry) => !entry.deletedAt && entry.status !== 'ARCHIVED').length
  if (activeServer + state.evidence.length >= 10) throw new Error('Límite de diez evidencias activas.')
  const operationId = crypto.randomUUID(), binaryId = crypto.randomUUID()
  await saveOfflineBinary(userId, id, binaryId, new Uint8Array(await file.arrayBuffer()))
  state.evidence.push({ id: binaryId, operationId, fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 300), mimeType: file.type, sizeBytes: file.size, bpmItemId, status: 'PENDING' })
  enqueue(state, 'ADD_EVIDENCE', { binaryId })
  state.queue[state.queue.length - 1].operationId = operationId
  await saveOfflinePackage(userId, id, state)
  return state
}
export async function removePendingEvidence(userId: string, id: string, binaryId: string): Promise<FieldState> {
  const state = await openFieldState(userId, id)
  if (!editable(state)) throw new Error('Esta inspección no admite cambios locales.')
  const evidence = state.evidence.find((entry) => entry.id === binaryId)
  const operation = state.queue.find((entry) => entry.operationId === evidence?.operationId)
  if (!evidence || evidence.status !== 'PENDING' || !operation || operation.type !== 'ADD_EVIDENCE' || operation.attempts !== 0)
    throw new Error('Solo puede quitar una evidencia local que aún no se ha intentado enviar.')
  state.evidence = state.evidence.filter((entry) => entry.id !== binaryId)
  state.queue = state.queue.filter((entry) => entry.operationId !== operation.operationId)
  await saveOfflinePackage(userId, id, state)
  await deleteOfflineBinary(userId, id, binaryId)
  return state
}
export async function finalizeLocal(userId: string, id: string): Promise<FieldState> {
  const state = await openFieldState(userId, id)
  if (!editable(state)) throw new Error('Esta inspección no puede finalizarse localmente.')
  const criteria = state.signedPackage.bpmTemplate.items.filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable)
  if (criteria.some((item) => !state.responses.some((response) => response.bpmItemId === item.id))) throw new Error('Faltan respuestas BPM.')
  if (state.signedPackage.riskRule.factors.length !== 6 || state.signedPackage.riskRule.factors.some((factor) => !state.factorSelections.some((selection) => selection.riskFactorId === factor.id))) throw new Error('Complete los seis factores de riesgo.')
  if (!state.foodSnapshots.some((entry) => state.signedPackage.riskRule.foodCatalog.some((category) => category.subcategories.some((sub) => sub.id === entry.foodRiskSubcategoryId && sub.riskScore !== null)))) throw new Error('Seleccione al menos un producto aplicable; NA se excluye del cálculo.')
  enqueue(state, 'FINALIZE', {}); enqueue(state, 'SUBMIT', {})
  state.localFinalized = true
  await saveOfflinePackage(userId, id, state)
  return state
}

export async function syncFieldState(userId: string, id: string): Promise<FieldState> {
  if (!navigator.onLine || !core.authenticated) throw new Error('Conéctese e inicie sesión para sincronizar.')
  const state = await openFieldState(userId, id)
  if (state.renewalConflict) throw new Error('Compare la versión de Core y confirme la revisión antes de sincronizar.')
  const base = `/v1/inspections/${path(id)}`
  const recoverTransition = async (expectedStatus: CoreInspection['status'], prior: CoreInspection): Promise<CoreInspection> => {
    const fresh = (await core.request<CoreInspection>(base, { cache: 'no-store' })).data
    if (fresh.status !== expectedStatus || fresh.assignmentId !== prior.assignmentId ||
      fresh.version !== prior.version + 1 || fresh.contentRevision !== prior.contentRevision)
      throw new Error('Core cambió la inspección. Conserve los pendientes y revise el conflicto.')
    return fresh
  }
  for (const op of state.queue) {
    if (op.status === 'APPLIED' || op.status === 'RESOLVED') continue
    if (op.status === 'CONFLICT' || op.status === 'REJECTED') break
    try {
      if (state.inspection.status === 'DRAFT') {
        const prior = state.inspection
        try { state.inspection = (await core.request<CoreInspection>(`${base}/start`, { method: 'POST', body: JSON.stringify({ version: prior.version }) })).data }
        catch (error) {
          if (!(error instanceof CoreApiError) || error.status !== 409) throw error
          state.inspection = await recoverTransition('IN_PROGRESS', prior)
        }
        await saveOfflinePackage(userId, id, state)
      }
      op.baseVersion ??= state.inspection.version
      op.status = 'SENDING'; op.attempts += 1
      await saveOfflinePackage(userId, id, state)
      if (op.type === 'FINALIZE' || op.type === 'SUBMIT') {
        const prior = state.inspection
        const target = op.type === 'FINALIZE' ? 'PENDING_SUBMISSION' : 'SUBMITTED'
        try { state.inspection = (await core.request<{ inspection: CoreInspection }>(`${base}/${op.type === 'FINALIZE' ? 'finalize' : 'submit'}`, { method: 'POST', body: JSON.stringify({ version: op.baseVersion }) })).data.inspection }
        catch (error) {
          if (!(error instanceof CoreApiError) || error.status !== 409) throw error
          state.inspection = await recoverTransition(target, prior)
        }
      } else if (op.type === 'ADD_EVIDENCE') {
        const evidence = state.evidence.find((entry) => entry.id === op.payload.binaryId)
        if (!evidence) throw new Error('Evidencia local ausente.')
        const bytes = await openOfflineBinary(userId, id, evidence.id)
        const material = { baseVersion: op.baseVersion, contentSha256: await sha256Hex(bytes as BufferSource), fileName: evidence.fileName, mimeType: evidence.mimeType, operationType: 'ADD_EVIDENCE', sizeBytes: evidence.sizeBytes, ...(evidence.bpmItemId ? { bpmItemId: evidence.bpmItemId } : {}) }
        op.payloadHash ??= await sha256Hex(canonical(material))
        await saveOfflinePackage(userId, id, state)
        const form = new FormData()
        form.set('file', new Blob([bytes as BlobPart], { type: evidence.mimeType }), evidence.fileName)
        form.set('baseVersion', String(op.baseVersion)); form.set('operationId', op.operationId); form.set('payloadHash', op.payloadHash)
        if (evidence.bpmItemId) form.set('bpmItemId', evidence.bpmItemId)
        const result = await core.request<{ version: number }>(`${base}/evidence`, { method: 'POST', body: form })
        state.inspection.version = result.data.version; evidence.status = 'CONFIRMED'
      } else if (op.type === 'SAVE_LOCATION') {
        const material = { ...op.payload, baseVersion: op.baseVersion }
        op.payloadHash ??= await sha256Hex(canonical(material))
        await saveOfflinePackage(userId, id, state)
        const result = await core.request<{ version: number }>(`${base}/location`, { method: 'POST', body: JSON.stringify({ operationId: op.operationId, ...material, payloadHash: op.payloadHash }) })
        state.inspection.version = result.data.version
      } else {
        op.payloadHash ??= await sha256Hex(canonical(op.payload))
        await saveOfflinePackage(userId, id, state)
        const result = await core.request<Array<{ status: 'APPLIED' | 'CONFLICT' | 'REJECTED'; resultingVersion?: number; currentVersion: number; code?: string; currentValue?: unknown }>>(`${base}/offline-operations/batch`, { method: 'POST', body: JSON.stringify({ operations: [{ operationId: op.operationId, operationType: op.type, baseVersion: op.baseVersion, payload: op.payload, payloadHash: op.payloadHash, createdAt: op.createdAt }] }) })
        const applied = result.data[0]
        if (applied.status !== 'APPLIED') { op.status = applied.status; op.lastError = applied.code; op.currentValue = applied.currentValue; await saveOfflinePackage(userId, id, state); break }
        state.inspection.version = applied.resultingVersion ?? applied.currentVersion
      }
      op.status = 'APPLIED'
      await saveOfflinePackage(userId, id, state)
    } catch (error) {
      const api = error instanceof CoreApiError ? error : null
      op.status = api?.status === 409 ? 'CONFLICT' : api && [400, 403, 413, 422].includes(api.status) ? 'REJECTED' : 'PENDING'
      op.lastError = api?.code === 'STORAGE_UNAVAILABLE'
        ? `El almacenamiento privado no está disponible. La evidencia local sigue pendiente; reintente más tarde.${api.correlationId ? ` Referencia: ${api.correlationId}` : ''}`
        : api?.code === 'EVIDENCE_PERSISTENCE_FAILED'
          ? `La evidencia no se registró. Conserve el archivo local y reporte la referencia.${api.correlationId ? ` Referencia: ${api.correlationId}` : ''}`
          : api?.code ?? (error instanceof Error ? error.message : 'NETWORK_ERROR')
      const evidence = state.evidence.find((entry) => entry.operationId === op.operationId)
      if (evidence && (op.status === 'CONFLICT' || op.status === 'REJECTED')) { evidence.status = op.status; evidence.lastError = op.lastError }
      await saveOfflinePackage(userId, id, state)
      break
    }
  }
  return state
}

export async function rebaseConflict(userId: string, id: string, operationId: string): Promise<FieldState> {
  if (!navigator.onLine || !core.authenticated) throw new Error('Conéctese con Core para revisar el conflicto.')
  const state = await openFieldState(userId, id)
  const index = state.queue.findIndex((entry) => entry.operationId === operationId && entry.status === 'CONFLICT')
  if (index < 0) throw new Error('No hay un conflicto pendiente para esta operación.')
  const fresh = (await core.request<WorkPackage>(`/v1/inspections/${path(id)}/work-package`, { cache: 'no-store' })).data
  if (!['DRAFT', 'IN_PROGRESS'].includes(fresh.inspection.status) || fresh.inspection.assignmentId !== state.inspection.assignmentId ||
    fresh.bpmTemplate.versionId !== state.signedPackage.bpmTemplate.versionId || fresh.riskRule.versionId !== state.signedPackage.riskRule.versionId)
    throw new Error('La inspección, asignación o definición cambió. Conserve el pendiente y solicite revisión.')
  const old = state.queue[index]
  old.status = 'RESOLVED'
  const retry: FieldOperation = { operationId: crypto.randomUUID(), type: old.type, payload: old.payload, status: 'PENDING', attempts: 0, createdAt: new Date().toISOString() }
  state.queue.splice(index + 1, 0, retry)
  const evidence = state.evidence.find((entry) => entry.operationId === old.operationId)
  if (evidence) { evidence.operationId = retry.operationId; evidence.status = 'PENDING'; evidence.lastError = undefined }
  state.inspection = fresh.inspection
  await saveOfflinePackage(userId, id, state)
  return state
}

export async function reviewFieldConflict(userId: string, id: string, operationId: string) {
  const state = await openFieldState(userId, id)
  const op = state.queue.find((entry) => entry.operationId === operationId && entry.status === 'CONFLICT')
  if (!op) throw new Error('Conflicto no disponible.')
  const fresh = (await core.request<WorkPackage>(`/v1/inspections/${path(id)}/work-package`, { cache: 'no-store' })).data
  let current: unknown = null
  if (op.type === 'UPSERT_BPM_RESPONSE') current = fresh.responses.find((entry) => entry.bpmItemId === op.payload.bpmItemId) ?? null
  if (op.type === 'UPSERT_RISK_FACTOR_SELECTION') current = fresh.factorSelections.find((entry) => entry.riskFactorId === op.payload.factorId) ?? null
  if (op.type === 'ADD_FOOD_SNAPSHOT') current = fresh.foodSnapshots.find((entry) => entry.foodRiskSubcategoryId === op.payload.foodRiskSubcategoryId) ?? null
  if (op.type === 'ADD_EVIDENCE') current = fresh.evidence.map((entry) => ({ fileName: entry.fileName, status: entry.status }))
  return { version: fresh.inspection.version, status: fresh.inspection.status, current, local: op.payload }
}
