import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { writeAuthAudit } from '../../core/audit/auth-audit.service.js';
import { writeDomainAudit } from '../../core/audit/domain-audit.service.js';
import { authenticate } from '../../core/auth/authenticate.js';
import { requireTrustedOrigin } from '../../core/auth/csrf.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { hashPassword, verifyPassword } from '../../core/auth/password.js';
import { newPasswordSchema } from '../../core/auth/password-policy.js';
import { roleCodes, type RoleCode } from '../../core/auth/roles.js';
import { issueOpaqueRefreshToken, parseOpaqueRefreshToken } from '../../core/auth/tokens.js';
import { query, withTransaction } from '../../db/client.js';
import { insertLetter, LetterError, storeLetter } from '../users/authorization-letters.js';

const router = Router();
const credentials = z.object({ email: z.string().email().transform((x) => x.trim().toLowerCase()), password: z.string().min(1).max(1024) }).strict();
const passwordBody = z.object({ password: z.string().min(1).max(1024) }).strict();
const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().trim().min(1).max(40).optional(),
  password: newPasswordSchema,
  roleCode: z.enum(['COMPANY_ADMIN', 'DELEGATE']),
  companyId: z.string().uuid().optional(),
}).strict();
const forgotPasswordSchema = z.object({
  email: z.string().email().max(320).transform((x) => x.trim().toLowerCase()),
}).strict();

const success = (res: Response, data: unknown) => res.json({ data, meta: { correlationId: res.locals.correlationId } });
const error = (req: Request, res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message }, meta: { correlationId: req.context.correlationId } });
const cookieValue = (req: Request, name: string) => req.headers.cookie?.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1);
const refreshCookie = (res: Response, value: string) => res.cookie('refresh_token', value, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/v1/auth', maxAge: 30 * 24 * 60 * 60 * 1000 });
const validRole = (value: string): value is RoleCode => (roleCodes as readonly string[]).includes(value);
type UserRow = { id: string; password_hash: string; role: string; status: string };
type CurrentUserRow = { id: string; fullName: string; roleCode: string; status: string; companyId: string | null };

const userProjection = `SELECT u.id,u.full_name AS "fullName",u.email,u.phone,u.status::text,u.version,r.code AS "roleCode",
  m.company_id AS "companyId",c.legal_name AS "companyName",u.created_at AS "createdAt",u.updated_at AS "updatedAt"
  FROM users u JOIN roles r ON r.id=u.role_id
  LEFT JOIN user_company_memberships m ON m.user_id=u.id AND m.effective_to IS NULL
  LEFT JOIN companies c ON c.id=m.company_id`;

router.post('/login', async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return error(req, res, 400, 'VALIDATION_ERROR', 'La solicitud no es válida.');
  const result = await query<UserRow>('SELECT u.id,u.password_hash,u.status,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email_normalized=$1', [parsed.data.email]);
  const user = result.rows[0];
  const passwordOk = user ? await verifyPassword(user.password_hash, parsed.data.password) : false;
  if (!user || !passwordOk || user.status !== 'APPROVED' || !validRole(user.role)) {
    await writeAuthAudit({ action: 'AUTH_LOGIN_FAILED', outcome: 'FAILURE', correlationId: req.context.correlationId });
    return error(req, res, 401, 'UNAUTHENTICATED', 'Credenciales inválidas.');
  }
  const refresh = issueOpaqueRefreshToken();
  await query('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'30 days\')', [refresh.tokenId, user.id, refresh.hash]);
  refreshCookie(res, refresh.token);
  const accessToken = await signAccessToken(user.id, user.role);
  await writeAuthAudit({ action: 'AUTH_LOGIN_SUCCEEDED', outcome: 'SUCCESS', correlationId: req.context.correlationId, userId: user.id });
  return success(res, { accessToken });
});

// Registro público: multipart con la carta de autorización de la cuenta (campo authorizationLetter).
// El registro JSON anterior se conserva por compatibilidad, pero la cuenta queda pendiente y no puede aprobarse sin carta.
// Ninguna variante crea sesión.
const letterUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fields: 10, fileSize: 5 * 1024 * 1024 } });
const acceptLetter = (req: Request, res: Response, next: NextFunction) => req.is('multipart/form-data')
  ? letterUpload.single('authorizationLetter')(req, res, (failure: any) => failure
    ? error(req, res, failure.code === 'LIMIT_FILE_SIZE' ? 413 : 400, failure.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR', 'Archivo inválido.')
    : next())
  : next();
const letterFailures: Record<string, [number, string]> = {
  VALIDATION_ERROR: [400, 'Archivo inválido.'], PAYLOAD_TOO_LARGE: [413, 'El archivo supera 5 MB.'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'Formato no permitido. Use PDF, JPEG o PNG.'], STORAGE_UNAVAILABLE: [503, 'El almacenamiento privado no está disponible.'],
};

router.post('/register', acceptLetter, async (req, res) => {
  const multipartRequest = Boolean(req.is('multipart/form-data'));
  const body = multipartRequest ? Object.fromEntries(Object.entries(req.body ?? {}).filter(([, value]) => value !== '')) : req.body;
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return error(req, res, 400, 'VALIDATION_ERROR', 'Datos de registro inválidos.');
  if (multipartRequest && !req.file) return error(req, res, 400, 'AUTHORIZATION_LETTER_REQUIRED', 'Adjunte la carta de autorización de la cuenta.');
  const userId = randomUUID();
  const create = async (client: PoolClient, letter?: { storagePath: string; fileName: string; sha256: string }) => {
    const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE code=$1', [parsed.data.roleCode]);
    const passwordHash = await hashPassword(parsed.data.password);
    await client.query(`INSERT INTO users(id,role_id,full_name,email,phone,password_hash,status) VALUES($1,$2,$3,$4,$5,$6,'PENDING_VALIDATION')`,
      [userId, role.rows[0].id, parsed.data.fullName, parsed.data.email.toLowerCase(), parsed.data.phone ?? null, passwordHash]);
    if (parsed.data.companyId) await client.query('INSERT INTO user_company_memberships(user_id,company_id) VALUES($1,$2)', [userId, parsed.data.companyId]);
    const inserted = letter ? await insertLetter(client, { userId, uploadedBy: userId, ...letter, mimeType: req.file!.mimetype, sizeBytes: req.file!.size }) : null;
    await writeDomainAudit({ action: 'USER_REGISTERED_PUBLIC', actorUserId: userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: userId,
      metadata: { roleCode: parsed.data.roleCode, letterId: inserted?.id ?? null }, client });
  };
  try {
    if (req.file) await storeLetter(userId, req.file, (stored) => withTransaction((client) => create(client, stored)));
    else await withTransaction((client) => create(client));
    const result = await query(`${userProjection} WHERE u.id=$1`, [userId]);
    return res.status(201).json({ data: { ...result.rows[0], authorizationLetterStatus: req.file ? 'PENDING' : null }, meta: { correlationId: req.context.correlationId } });
  } catch (err: any) {
    if (err instanceof LetterError && letterFailures[err.code]) return error(req, res, letterFailures[err.code][0], err.code, letterFailures[err.code][1]);
    if (err?.code === '23505') return error(req, res, 409, 'CONFLICT', 'El correo ya está registrado.');
    if (err?.code === '23503') return error(req, res, 400, 'VALIDATION_ERROR', 'La empresa indicada no existe.');
    throw err;
  }
});

router.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return error(req, res, 400, 'VALIDATION_ERROR', 'Correo electrónico inválido.');
  const result = await query<{ id: string }>('SELECT id FROM users WHERE email_normalized=$1', [parsed.data.email]);
  if (result.rows[0]) {
    await writeAuthAudit({
      action: 'AUTH_FORGOT_PASSWORD_REQUESTED',
      outcome: 'SUCCESS',
      correlationId: req.context.correlationId,
      userId: result.rows[0].id,
    });
  }
  return success(res, { requested: true });
});

router.post('/refresh', requireTrustedOrigin, async (req, res) => {
  const parsed = parseOpaqueRefreshToken(cookieValue(req, 'refresh_token') ?? '');
  if (!parsed) {
    await writeAuthAudit({ action: 'AUTH_REFRESH_REJECTED', outcome: 'FAILURE', correlationId: req.context.correlationId });
    return error(req, res, 401, 'UNAUTHENTICATED', 'Refresh token inválido.');
  }
  const next = issueOpaqueRefreshToken();
  const rotated = await withTransaction(async (client) => {
    const current = await client.query<{ id: string; user_id: string; token_hash: string; role: string }>('SELECT t.id,t.user_id,t.token_hash,r.code AS role FROM refresh_tokens t JOIN users u ON u.id=t.user_id JOIN roles r ON r.id=u.role_id WHERE t.id=$1 AND t.revoked_at IS NULL AND t.expires_at>now() AND u.status=\'APPROVED\' FOR UPDATE', [parsed.tokenId]);
    const row = current.rows[0];
    if (!row || !validRole(row.role)) return null;
    const supplied = Buffer.from(parsed.hash, 'hex');
    const stored = Buffer.from(row.token_hash.trim(), 'hex');
    if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) return null;
    await client.query('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'30 days\')', [next.tokenId, row.user_id, next.hash]);
    await client.query('UPDATE refresh_tokens SET revoked_at=now(),replaced_by_id=$1 WHERE id=$2', [next.tokenId, row.id]);
    await writeAuthAudit({ action: 'AUTH_REFRESH_SUCCEEDED', outcome: 'SUCCESS', correlationId: req.context.correlationId, userId: row.user_id, client });
    return { userId: row.user_id, role: row.role };
  });
  if (!rotated) {
    await writeAuthAudit({ action: 'AUTH_REFRESH_REJECTED', outcome: 'FAILURE', correlationId: req.context.correlationId });
    return error(req, res, 401, 'UNAUTHENTICATED', 'Refresh token inválido.');
  }
  refreshCookie(res, next.token);
  return success(res, { accessToken: await signAccessToken(rotated.userId, rotated.role) });
});

router.post('/logout', requireTrustedOrigin, async (req, res) => {
  const parsed = parseOpaqueRefreshToken(cookieValue(req, 'refresh_token') ?? '');
  let userId: string | undefined;
  if (parsed) {
    const result = await query<{ user_id: string }>('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND token_hash=$2 RETURNING user_id', [parsed.tokenId, parsed.hash]);
    userId = result.rows[0]?.user_id;
  }
  res.clearCookie('refresh_token', { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/v1/auth' });
  await writeAuthAudit({ action: 'AUTH_LOGOUT', outcome: 'SUCCESS', correlationId: req.context.correlationId, userId });
  return success(res, { loggedOut: true });
});

router.post('/reauthenticate', authenticate, async (req, res) => {
  const parsed = passwordBody.safeParse(req.body);
  if (!parsed.success) return error(req, res, 400, 'VALIDATION_ERROR', 'La solicitud no es válida.');
  const result = await query<{ password_hash: string; role: string }>('SELECT u.password_hash,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 AND u.status=\'APPROVED\'', [req.auth!.userId]);
  const user = result.rows[0];
  if (!user || !validRole(user.role) || !await verifyPassword(user.password_hash, parsed.data.password)) return error(req, res, 401, 'UNAUTHENTICATED', 'Credenciales inválidas.');
  const accessToken = await signAccessToken(req.auth!.userId, user.role, Math.floor(Date.now() / 1000));
  await writeAuthAudit({ action: 'AUTH_REAUTHENTICATED', outcome: 'SUCCESS', correlationId: req.context.correlationId, userId: req.auth!.userId });
  return success(res, { accessToken });
});

router.get('/me', authenticate, async (req, res) => {
  const result = await query<CurrentUserRow>(`SELECT u.id,u.full_name AS "fullName",r.code AS "roleCode",u.status::text,m.company_id AS "companyId"
    FROM users u
    JOIN roles r ON r.id=u.role_id
    LEFT JOIN user_company_memberships m ON m.user_id=u.id AND m.effective_to IS NULL AND EXISTS (SELECT 1 FROM companies c WHERE c.id=m.company_id AND c.status='ACTIVE')
    WHERE u.id=$1 AND u.status='APPROVED'`, [req.auth!.userId]);
  const user = result.rows[0];
  if (!user || !validRole(user.roleCode) || user.roleCode !== req.auth!.role) return error(req, res, 401, 'UNAUTHENTICATED', 'Autenticación requerida.');
  return success(res, { ...user, roleCode: user.roleCode, authTime: req.auth!.authTime });
});

export default router;
