import { createHash, createPrivateKey, sign } from 'node:crypto';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';
import { InspectionError, type Actor, workPackage } from './service.js';

export type PermitClaims = {
  v: 1; userId: string; roleCode: 'EVALUATOR' | 'UNIVERSAL'; inspectionId: string;
  packageHash: string; issuedAt: string; expiresAt: string;
};

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}

export async function issueOfflinePackage(id: string, actor: Actor) {
  if (actor.role !== 'EVALUATOR' && actor.role !== 'UNIVERSAL') throw new InspectionError('FORBIDDEN');
  const account = await query<{status: string; roleCode: string}>(
    'SELECT u.status::text,r.code::text AS "roleCode" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1', [actor.userId],
  );
  if (account.rows[0]?.status !== 'APPROVED' || account.rows[0]?.roleCode !== actor.role) throw new InspectionError('FORBIDDEN');
  const pkg = JSON.parse(JSON.stringify(await workPackage(id, actor))) as Awaited<ReturnType<typeof workPackage>>;
  if (pkg.inspection.status !== 'DRAFT' && pkg.inspection.status !== 'IN_PROGRESS') throw new InspectionError('CONFLICT');
  if (!env.OFFLINE_PERMIT_PRIVATE_KEY_BASE64) throw new InspectionError('OFFLINE_PERMIT_UNAVAILABLE');
  let privateKey;
  try { privateKey = createPrivateKey({ key: Buffer.from(env.OFFLINE_PERMIT_PRIVATE_KEY_BASE64, 'base64'), format: 'der', type: 'pkcs8' }); }
  catch { throw new InspectionError('OFFLINE_PERMIT_UNAVAILABLE'); }
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new InspectionError('OFFLINE_PERMIT_UNAVAILABLE');
  const now = Date.now();
  const claims: PermitClaims = {
    v: 1, userId: actor.userId, roleCode: actor.role, inspectionId: id,
    packageHash: createHash('sha256').update(canonical(pkg)).digest('hex'),
    issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
  };
  const signature = sign(null, Buffer.from(canonical(claims)), privateKey).toString('base64');
  return { package: pkg, permit: { claims, signature } };
}
