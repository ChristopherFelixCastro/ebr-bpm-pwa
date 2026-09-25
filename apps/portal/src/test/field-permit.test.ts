import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { canonical, sha256Hex, verifyPermit, type PermitClaims } from '../offline/permit'

afterEach(() => vi.unstubAllEnvs())

it('verifica firma Ed25519, usuario, contenido y límite de 72 horas sin confiar en offlineUntil', async () => {
  const pair = generateKeyPairSync('ed25519')
  vi.stubEnv('VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64', pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'))
  const pkg = { inspection: { id: 'i-1', version: 3 }, bpmTemplate: { items: [{ title: 'Criterio' }] } }
  const now = Date.now()
  const claims: PermitClaims = { v: 1, userId: 'eval-1', roleCode: 'EVALUATOR', inspectionId: 'i-1', packageHash: await sha256Hex(canonical(pkg)), issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 72 * 60 * 60 * 1000).toISOString() }
  const permit = { claims, signature: sign(null, Buffer.from(canonical(claims)), pair.privateKey).toString('base64') }
  await expect(verifyPermit(permit, pkg, 'eval-1', 'i-1', now)).resolves.toBeUndefined()
  await expect(verifyPermit(permit, pkg, 'eval-2', 'i-1', now)).rejects.toThrow()
  await expect(verifyPermit(permit, { ...pkg, inspection: { id: 'i-1', version: 4 } }, 'eval-1', 'i-1', now)).rejects.toThrow('alterado')
  await expect(verifyPermit({ ...permit, claims: { ...claims, expiresAt: new Date(now + 73 * 60 * 60 * 1000).toISOString() } }, pkg, 'eval-1', 'i-1', now)).rejects.toThrow()
  await expect(verifyPermit(permit, pkg, 'eval-1', 'i-1', now + 72 * 60 * 60 * 1000)).rejects.toThrow('venció')
})
