export type PermitClaims = {
  v: 1; userId: string; roleCode: 'EVALUATOR' | 'UNIVERSAL'; inspectionId: string;
  packageHash: string; issuedAt: string; expiresAt: string;
}
export type SignedPermit = { claims: PermitClaims; signature: string }

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
}

export async function sha256Hex(value: string | BufferSource): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyPermit(permit: SignedPermit, pkg: unknown, userId: string, inspectionId: string, now = Date.now(), allowExpired = false): Promise<void> {
  const claims = permit?.claims
  if (!claims || claims.v !== 1 || claims.userId !== userId || claims.inspectionId !== inspectionId ||
    !['EVALUATOR', 'UNIVERSAL'].includes(claims.roleCode)) throw new Error('Permiso local inválido para esta cuenta o inspección.')
  const issued = Date.parse(claims.issuedAt), expiry = Date.parse(claims.expiresAt)
  if (!Number.isFinite(issued) || !Number.isFinite(expiry) || expiry <= issued || expiry - issued > 72 * 60 * 60 * 1000)
    throw new Error('Vigencia del permiso local inválida.')
  const publicBase64 = import.meta.env.VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64
  if (!publicBase64) throw new Error('Falta la clave pública del permiso offline.')
  const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
  let valid = false
  try {
    const key = await crypto.subtle.importKey('spki', fromBase64(publicBase64), 'Ed25519', false, ['verify'])
    valid = await crypto.subtle.verify('Ed25519', key, fromBase64(permit.signature), new TextEncoder().encode(canonical(claims)))
  } catch { /* Firma malformada o clave incorrecta. */ }
  if (!valid || await sha256Hex(canonical(pkg)) !== claims.packageHash) throw new Error('El paquete o su permiso fue alterado.')
  if (!allowExpired && (now < issued - 5 * 60_000 || now >= expiry)) throw new Error('El permiso local venció o el reloj requiere validación con Core.')
}
