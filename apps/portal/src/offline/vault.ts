import Dexie, { type Table } from 'dexie'
import type { CoreUser } from '@ebr-bpm/core-client'

export type OfflineIdentity = { id: string; fullName: string; roleCode: 'EVALUATOR' | 'UNIVERSAL' }
type IdentityRecord = OfflineIdentity & { salt: number[]; proofIv: number[]; proof: number[]; offlineUntil?: number }
type PackageRecord = { key: string; ownerUserId: string; packageId: string; iv: number[]; content: number[] }
type BinaryRecord = { key: string; ownerUserId: string; packageId: string; binaryId: string; iv: Uint8Array; content: Uint8Array }

class PortalOfflineDb extends Dexie {
  identities!: Table<IdentityRecord, string>
  packages!: Table<PackageRecord, string>
  binaries!: Table<BinaryRecord, string>
  constructor() {
    super('ebr-bpm-portal-offline')
    this.version(1).stores({ identities: 'id', packages: 'key,ownerUserId' })
    this.version(2).stores({ identities: 'id', packages: 'key,ownerUserId', binaries: 'key,ownerUserId,packageId' })
  }
}

export const offlineDb = new PortalOfflineDb()
export class OfflinePackageMissingError extends Error { constructor() { super('Paquete no disponible para esta cuenta.') } }
const unlocked = new Map<string, CryptoKey>()
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const bytes = (value: number[] | Uint8Array) => new Uint8Array(value)
const deriveKey = async (password: string, salt: Uint8Array) => {
  const base = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
const encrypt = async (key: CryptoKey, value: unknown, additionalData: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const content = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(additionalData) },
    key,
    encoder.encode(JSON.stringify(value)),
  )
  return { iv: [...iv], content: [...new Uint8Array(content)] }
}
const decrypt = async <T,>(key: CryptoKey, iv: number[], content: number[], additionalData: string): Promise<T> => {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(iv), additionalData: encoder.encode(additionalData) },
    key,
    bytes(content),
  )
  return JSON.parse(decoder.decode(plain)) as T
}
const encryptBytes = async (key: CryptoKey, value: Uint8Array, aad: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const content = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(aad) }, key, value as BufferSource)
  return { iv, content: new Uint8Array(content) }
}
const decryptBytes = async (key: CryptoKey, iv: Uint8Array, content: Uint8Array, aad: string) =>
  new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv), additionalData: encoder.encode(aad) }, key, bytes(content)))

export function lockOfflineVault() { unlocked.clear() }

export async function enrollOfflineIdentity(user: CoreUser, password: string): Promise<void> {
  if (!['EVALUATOR', 'UNIVERSAL'].includes(user.roleCode) || user.status !== 'APPROVED') return
  lockOfflineVault()
  const existing = await offlineDb.identities.get(user.id)
  if (existing) {
    const key = await verifyIdentity(existing, password)
    unlocked.set(user.id, key)
    await offlineDb.identities.update(user.id, { fullName: user.fullName })
    return
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(password, salt)
  const proof = await encrypt(key, { id: user.id, roleCode: user.roleCode }, `identity:${user.id}`)
  await offlineDb.identities.put({ id: user.id, fullName: user.fullName, roleCode: user.roleCode as OfflineIdentity['roleCode'], salt: [...salt], proofIv: proof.iv, proof: proof.content })
  unlocked.set(user.id, key)
}

export async function availableOfflineIdentities(): Promise<OfflineIdentity[]> {
  return (await offlineDb.identities.toArray()).map(({ id, fullName, roleCode }) => ({ id, fullName, roleCode }))
}

export async function unlockOfflineIdentity(userId: string, password: string): Promise<OfflineIdentity> {
  lockOfflineVault()
  const record = await offlineDb.identities.get(userId)
  if (!record || !['EVALUATOR', 'UNIVERSAL'].includes(record.roleCode)) throw new Error('No hay acceso local para esta cuenta.')
  const key = await verifyIdentity(record, password)
  unlocked.set(userId, key)
  return { id: record.id, fullName: record.fullName, roleCode: record.roleCode }
}

async function verifyIdentity(record: IdentityRecord, password: string): Promise<CryptoKey> {
  try {
    const key = await deriveKey(password, bytes(record.salt))
    const proof = await decrypt<{ id: string; roleCode: string }>(key, record.proofIv, record.proof, `identity:${record.id}`)
    if (proof.id !== record.id || proof.roleCode !== record.roleCode) throw new Error()
    return key
  } catch { throw new Error('No se pudo desbloquear el trabajo local de esta cuenta.') }
}

export async function saveOfflinePackage(ownerUserId: string, packageId: string, content: unknown): Promise<void> {
  const key = unlocked.get(ownerUserId)
  if (!key) throw new Error('Desbloquee primero el trabajo local de esta cuenta.')
  const cipher = await encrypt(key, content, `package:${ownerUserId}:${packageId}`)
  await offlineDb.packages.put({ key: `${ownerUserId}:${packageId}`, ownerUserId, packageId, iv: cipher.iv, content: cipher.content })
}

export async function listOfflinePackages(ownerUserId: string): Promise<string[]> {
  if (!unlocked.has(ownerUserId)) throw new Error('El trabajo local está bloqueado.')
  return (await offlineDb.packages.where('ownerUserId').equals(ownerUserId).toArray()).map((item) => item.packageId)
}

export async function openOfflinePackage<T>(ownerUserId: string, packageId: string): Promise<T> {
  const key = unlocked.get(ownerUserId)
  if (!key) throw new Error('El trabajo local está bloqueado.')
  const item = await offlineDb.packages.get(`${ownerUserId}:${packageId}`)
  if (!item || item.ownerUserId !== ownerUserId) throw new OfflinePackageMissingError()
  return decrypt<T>(key, item.iv, item.content, `package:${ownerUserId}:${packageId}`)
}

const binaryAad = (ownerUserId: string, packageId: string, binaryId: string) => `binary:${ownerUserId}:${packageId}:${binaryId}`
export async function saveOfflineBinary(ownerUserId: string, packageId: string, binaryId: string, value: Uint8Array): Promise<void> {
  const key = unlocked.get(ownerUserId)
  if (!key) throw new Error('El trabajo local está bloqueado.')
  const cipher = await encryptBytes(key, value, binaryAad(ownerUserId, packageId, binaryId))
  await offlineDb.binaries.put({ key: `${ownerUserId}:${packageId}:${binaryId}`, ownerUserId, packageId, binaryId, ...cipher })
}
export async function openOfflineBinary(ownerUserId: string, packageId: string, binaryId: string): Promise<Uint8Array> {
  const key = unlocked.get(ownerUserId)
  if (!key) throw new Error('El trabajo local está bloqueado.')
  const row = await offlineDb.binaries.get(`${ownerUserId}:${packageId}:${binaryId}`)
  if (!row || row.ownerUserId !== ownerUserId) throw new Error('Evidencia no disponible para esta cuenta.')
  return decryptBytes(key, row.iv, row.content, binaryAad(ownerUserId, packageId, binaryId))
}
export async function deleteOfflineBinary(ownerUserId: string, packageId: string, binaryId: string): Promise<void> {
  if (!unlocked.has(ownerUserId)) throw new Error('El trabajo local está bloqueado.')
  await offlineDb.binaries.delete(`${ownerUserId}:${packageId}:${binaryId}`)
}

// El Core debe haber autenticado la contraseña nueva antes de llamar esta operación.
// El cifrado viejo permanece intacto si cualquier lectura, descifrado o escritura falla.
export async function rekeyOfflineIdentity(user: CoreUser, oldPassword: string, newPassword: string): Promise<void> {
  const identity = await offlineDb.identities.get(user.id)
  if (!identity || identity.roleCode !== user.roleCode) throw new Error('No hay identidad local compatible.')
  const oldKey = await verifyIdentity(identity, oldPassword)
  const packages = await offlineDb.packages.where('ownerUserId').equals(user.id).toArray()
  const binaries = await offlineDb.binaries.where('ownerUserId').equals(user.id).toArray()
  const salt = crypto.getRandomValues(new Uint8Array(16)), newKey = await deriveKey(newPassword, salt)
  const reencryptedPackages = [] as PackageRecord[]
  for (const row of packages) {
    const aad = `package:${user.id}:${row.packageId}`
    const plain = await decrypt<unknown>(oldKey, row.iv, row.content, aad)
    reencryptedPackages.push({ ...row, ...await encrypt(newKey, plain, aad) })
  }
  const reencryptedBinaries = [] as BinaryRecord[]
  for (const row of binaries) {
    const aad = binaryAad(user.id, row.packageId, row.binaryId)
    const plain = await decryptBytes(oldKey, row.iv, row.content, aad)
    reencryptedBinaries.push({ ...row, ...await encryptBytes(newKey, plain, aad) })
  }
  const proof = await encrypt(newKey, { id: user.id, roleCode: user.roleCode }, `identity:${user.id}`)
  await offlineDb.transaction('rw', offlineDb.identities, offlineDb.packages, offlineDb.binaries, async () => {
    await offlineDb.packages.bulkPut(reencryptedPackages)
    await offlineDb.binaries.bulkPut(reencryptedBinaries)
    await offlineDb.identities.put({ ...identity, fullName: user.fullName, salt: [...salt], proofIv: proof.iv, proof: proof.content })
  })
  unlocked.set(user.id, newKey)
}
