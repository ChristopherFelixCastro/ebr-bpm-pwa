import Dexie, { type Table } from 'dexie'
import type { CoreUser } from '@ebr-bpm/core-client'

export type OfflineIdentity = { id: string; fullName: string; roleCode: 'EVALUATOR' }
type IdentityRecord = OfflineIdentity & { salt: number[]; proofIv: number[]; proof: number[]; offlineUntil: number }
type PackageRecord = { key: string; ownerUserId: string; packageId: string; iv: number[]; content: number[] }

class PortalOfflineDb extends Dexie {
  identities!: Table<IdentityRecord, string>
  packages!: Table<PackageRecord, string>
  constructor() {
    super('ebr-bpm-portal-offline')
    this.version(1).stores({ identities: 'id', packages: 'key,ownerUserId' })
  }
}

export const offlineDb = new PortalOfflineDb()
const unlocked = new Map<string, CryptoKey>()
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const OFFLINE_LEASE_MS = 72 * 60 * 60 * 1000

const bytes = (value: number[]) => new Uint8Array(value)
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

export function lockOfflineVault() { unlocked.clear() }

export async function enrollOfflineIdentity(user: CoreUser, password: string): Promise<void> {
  if (user.roleCode !== 'EVALUATOR' || user.status !== 'APPROVED') return
  lockOfflineVault()
  const existing = await offlineDb.identities.get(user.id)
  if (existing) {
    const key = await verifyIdentity(existing, password)
    unlocked.set(user.id, key)
    await offlineDb.identities.update(user.id, { fullName: user.fullName, offlineUntil: Date.now() + OFFLINE_LEASE_MS })
    return
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(password, salt)
  const proof = await encrypt(key, { id: user.id, roleCode: 'EVALUATOR' }, `identity:${user.id}`)
  await offlineDb.identities.put({ id: user.id, fullName: user.fullName, roleCode: 'EVALUATOR', salt: [...salt], proofIv: proof.iv, proof: proof.content, offlineUntil: Date.now() + OFFLINE_LEASE_MS })
  unlocked.set(user.id, key)
}

export async function availableOfflineIdentities(): Promise<OfflineIdentity[]> {
  return (await offlineDb.identities.toArray()).map(({ id, fullName, roleCode }) => ({ id, fullName, roleCode }))
}

export async function unlockOfflineIdentity(userId: string, password: string): Promise<OfflineIdentity> {
  lockOfflineVault()
  const record = await offlineDb.identities.get(userId)
  if (!record || record.roleCode !== 'EVALUATOR') throw new Error('No hay acceso local para esta cuenta.')
  if (!record.offlineUntil || record.offlineUntil < Date.now()) throw new Error('El acceso local venció. Conéctese para renovar la validación con Core.')
  const key = await verifyIdentity(record, password)
  unlocked.set(userId, key)
  return { id: record.id, fullName: record.fullName, roleCode: 'EVALUATOR' }
}

async function verifyIdentity(record: IdentityRecord, password: string): Promise<CryptoKey> {
  try {
    const key = await deriveKey(password, bytes(record.salt))
    const proof = await decrypt<{ id: string; roleCode: string }>(key, record.proofIv, record.proof, `identity:${record.id}`)
    if (proof.id !== record.id || proof.roleCode !== 'EVALUATOR') throw new Error()
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
  if (!item || item.ownerUserId !== ownerUserId) throw new Error('Paquete no disponible para esta cuenta.')
  return decrypt<T>(key, item.iv, item.content, `package:${ownerUserId}:${packageId}`)
}
