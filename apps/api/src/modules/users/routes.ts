import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { writeDomainAudit } from '../../core/audit/domain-audit.service.js';
import { writeAuthAudit } from '../../core/audit/auth-audit.service.js';
import { authenticate } from '../../core/auth/authenticate.js';
import { hashPassword } from '../../core/auth/password.js';
import { newPasswordSchema } from '../../core/auth/password-policy.js';
import { requireRecentReauthentication } from '../../core/auth/reauth.middleware.js';
import { requireRoles } from '../../core/auth/rbac.middleware.js';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../../db/client.js';
import { env } from '../../config/env.js';
import { insertLetter, issueLetterDownload, LetterError, letterById, letterHistory, reviewLetter, storeLetter } from './authorization-letters.js';

// Matriz F: ADMIN administra cuentas no universales; UNIVERSAL administra todas.
// ADMIN no descubre cuentas UNIVERSAL: quedan fuera de resultados, totales y consultas por ID (404).
const router = Router();
router.use(authenticate, requireRoles('ADMIN', 'UNIVERSAL'));

const uuid = z.string().uuid();
const roleCode = z.enum(['ADMIN', 'COMPANY_ADMIN', 'DELEGATE', 'COORDINATOR', 'EVALUATOR', 'UNIVERSAL']);
const companyRoles = new Set(['COMPANY_ADMIN', 'DELEGATE']);
const createSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().trim().min(1).max(40).optional(),
  password: newPasswordSchema,
  roleCode,
  companyId: uuid.optional(),
}).strict().superRefine((value, context) => {
  if (companyRoles.has(value.roleCode) !== Boolean(value.companyId)) context.addIssue({ code: 'custom', path: ['companyId'], message: 'La empresa debe corresponder al tipo de rol.' });
});
const patchSchema = z.object({
  version: z.number().int().positive(),
  fullName: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  roleCode: roleCode.optional(),
  companyId: uuid.nullable().optional(),
}).strict();
const versionSchema = z.object({ version: z.number().int().positive() }).strict();
const rejectLetterSchema = z.object({ version: z.number().int().positive(), reason: z.string().trim().min(1).max(1000) }).strict();
const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['PENDING_VALIDATION', 'APPROVED', 'REJECTED', 'INACTIVE']).optional(),
  roleCode: roleCode.optional(),
}).strict();
const multipart = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 5 * 1024 * 1024 } });

const success = (res: Response, data: unknown, extra: object = {}) => res.json({ data, meta: { correlationId: res.locals.correlationId, ...extra } });
const failure = (req: Request, res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message }, meta: { correlationId: req.context.correlationId } });
const recent = (req: Request) => Boolean(req.auth) && Math.floor(Date.now() / 1000) - req.auth!.authTime <= env.JWT_REAUTH_MAX_AGE_MINUTES * 60;
const isUniversal = (req: Request) => req.auth!.role === 'UNIVERSAL';
const auditDenial = async (req: Request) => {
  try { await writeAuthAudit({ action: 'AUTH_FORBIDDEN', outcome: 'DENIED', correlationId: req.context.correlationId, userId: req.auth?.userId }); } catch { /* response still takes priority */ }
};
// Letters are attached and reviewed while an account awaits approval or reactivation.
const awaitingApproval = new Set(['PENDING_VALIDATION', 'INACTIVE']);
const apiError = (apiCode: string) => Object.assign(new Error(apiCode), { apiCode });

const projection = `SELECT u.id,u.full_name AS "fullName",u.email,u.phone,u.status::text,u.version,r.code AS "roleCode",
  m.company_id AS "companyId",c.legal_name AS "companyName",u.created_at AS "createdAt",u.updated_at AS "updatedAt",
  (SELECT d.status::text FROM user_authorization_documents d WHERE d.user_id=u.id AND d.status<>'ARCHIVED') AS "authorizationLetterStatus"
  FROM users u JOIN roles r ON r.id=u.role_id
  LEFT JOIN user_company_memberships m ON m.user_id=u.id AND m.effective_to IS NULL
  LEFT JOIN companies c ON c.id=m.company_id`;
const escapeLike = (value: string) => value.toLowerCase().replace(/[\\%_]/g, (match) => `\\${match}`);

/** Loads and locks the target; hidden UNIVERSAL targets behave as missing for ADMIN (and the attempt is audited). */
async function lockVisibleTarget(req: Request, client: PoolClient) {
  const target = (await client.query<{ roleCode: string; status: string; companyId: string | null }>(`SELECT r.code AS "roleCode",u.status::text,m.company_id AS "companyId"
    FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN user_company_memberships m ON m.user_id=u.id AND m.effective_to IS NULL
    WHERE u.id=$1 FOR UPDATE OF u`, [req.params.id])).rows[0];
  if (!target) throw apiError('NOT_FOUND');
  if (target.roleCode === 'UNIVERSAL' && !isUniversal(req)) throw apiError('HIDDEN');
  if (target.roleCode === 'UNIVERSAL' && !recent(req)) throw apiError('REAUTH');
  return target;
}

async function respondError(req: Request, res: Response, error: any) {
  const code = error instanceof LetterError ? error.code : error?.apiCode;
  switch (code) {
    case 'HIDDEN': await auditDenial(req); return failure(req, res, 404, 'NOT_FOUND', 'Usuario no encontrado.');
    case 'NOT_FOUND': return failure(req, res, 404, 'NOT_FOUND', 'Recurso no encontrado.');
    case 'FORBIDDEN': await auditDenial(req); return failure(req, res, 403, 'FORBIDDEN', 'Acceso denegado.');
    case 'REAUTH': await auditDenial(req); return failure(req, res, 401, 'REAUTHENTICATION_REQUIRED', 'Se requiere autenticación reciente.');
    case 'STALE': case 'STALE_VERSION': return failure(req, res, 409, 'STALE_VERSION', 'El registro fue modificado por otra operación.');
    case 'SCOPE': return failure(req, res, 400, 'VALIDATION_ERROR', 'La empresa debe corresponder al tipo de rol.');
    case 'INVALID_STATE': return failure(req, res, 409, 'INVALID_STATE', 'La operación no está disponible en el estado actual.');
    case 'LETTER_REQUIRED': return failure(req, res, 409, 'AUTHORIZATION_LETTER_REQUIRED', 'La cuenta requiere una carta de autorización válida.');
    case 'VALIDATION_ERROR': return failure(req, res, 400, 'VALIDATION_ERROR', 'Archivo inválido.');
    case 'PAYLOAD_TOO_LARGE': return failure(req, res, 413, 'PAYLOAD_TOO_LARGE', 'El archivo supera 5 MB.');
    case 'UNSUPPORTED_MEDIA_TYPE': return failure(req, res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato no permitido. Use PDF, JPEG o PNG.');
    case 'STORAGE_UNAVAILABLE': return failure(req, res, 503, 'STORAGE_UNAVAILABLE', 'El almacenamiento privado no está disponible.');
  }
  if (error?.code === '23505') return failure(req, res, 409, 'CONFLICT', 'El correo ya está registrado.');
  if (error?.code === '23503') return failure(req, res, 400, 'VALIDATION_ERROR', 'La empresa indicada no existe.');
  if (error?.code === '23514' && error?.constraint === 'users_approval_requires_valid_letter') return failure(req, res, 409, 'AUTHORIZATION_LETTER_REQUIRED', 'La cuenta requiere una carta de autorización válida.');
  if (error?.code === '23514') return failure(req, res, 409, 'CONFLICT', 'Debe permanecer al menos un usuario UNIVERSAL activo.');
  if (typeof error?.message === 'string' && /company membership/.test(error.message)) return failure(req, res, 409, 'COMPANY_SCOPE_REQUIRED', 'La cuenta empresarial requiere exactamente una empresa activa.');
  throw error;
}

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Consulta inválida.');
  const { page, limit, search, status, roleCode: role } = parsed.data;
  const pattern = search ? `%${escapeLike(search)}%` : null;
  const where = `WHERE ($1::text IS NULL OR lower(u.full_name) LIKE $1 ESCAPE '\\' OR u.email_normalized LIKE $1 ESCAPE '\\')
    AND ($2::user_status IS NULL OR u.status=$2::user_status) AND ($3::text IS NULL OR r.code=$3) AND ($4::boolean OR r.code<>'UNIVERSAL')`;
  const values = [pattern, status ?? null, role ?? null, isUniversal(req)];
  const count = await query<{ total: string }>(`SELECT count(*) total FROM users u JOIN roles r ON r.id=u.role_id ${where}`, values);
  const rows = await query(`${projection} ${where} ORDER BY u.created_at DESC,u.id LIMIT $5 OFFSET $6`, [...values, limit, (page - 1) * limit]);
  return success(res, rows.rows, { page, limit, total: Number(count.rows[0].total) });
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Datos de usuario inválidos.');
  try {
    if (parsed.data.roleCode === 'UNIVERSAL' && !isUniversal(req)) throw apiError('FORBIDDEN');
    if (parsed.data.roleCode === 'UNIVERSAL' && !recent(req)) throw apiError('REAUTH');
    const created = await withTransaction(async (client) => {
      const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE code=$1', [parsed.data.roleCode]);
      if (!role.rows[0]) throw apiError('SCOPE');
      const passwordHash = await hashPassword(parsed.data.password);
      const user = await client.query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,phone,password_hash,status) VALUES($1,$2,$3,$4,$5,'PENDING_VALIDATION') RETURNING id`, [role.rows[0].id, parsed.data.fullName, parsed.data.email.toLowerCase(), parsed.data.phone ?? null, passwordHash]);
      if (parsed.data.companyId) await client.query('INSERT INTO user_company_memberships(user_id,company_id) VALUES($1,$2)', [user.rows[0].id, parsed.data.companyId]);
      await writeDomainAudit({ action: 'USER_CREATED', actorUserId: req.auth!.userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: user.rows[0].id, metadata: { roleCode: parsed.data.roleCode }, client });
      return user.rows[0].id;
    });
    const result = await query(`${projection} WHERE u.id=$1`, [created]);
    return res.status(201).json({ data: result.rows[0], meta: { correlationId: req.context.correlationId } });
  } catch (error) { return respondError(req, res, error); }
});

router.get('/:id', async (req, res) => {
  if (!uuid.safeParse(req.params.id).success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  const result = await query<{ roleCode: string }>(`${projection} WHERE u.id=$1`, [req.params.id]);
  const user = result.rows[0];
  if (user?.roleCode === 'UNIVERSAL' && !isUniversal(req)) return respondError(req, res, apiError('HIDDEN'));
  return user ? success(res, user) : failure(req, res, 404, 'NOT_FOUND', 'Usuario no encontrado.');
});

router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!uuid.safeParse(req.params.id).success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Modificación inválida.');
  try {
    await withTransaction(async (client) => {
      const current = await lockVisibleTarget(req, client);
      const nextRole = parsed.data.roleCode ?? current.roleCode;
      if (nextRole === 'UNIVERSAL' && !isUniversal(req)) throw apiError('FORBIDDEN');
      if (nextRole === 'UNIVERSAL' && !recent(req)) throw apiError('REAUTH');
      const companyId = parsed.data.companyId === undefined ? current.companyId : parsed.data.companyId;
      if (companyRoles.has(nextRole) !== Boolean(companyId)) throw apiError('SCOPE');
      const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE code=$1', [nextRole]);
      const updated = await client.query(`UPDATE users SET full_name=COALESCE($1,full_name),phone=CASE WHEN $2 THEN $3 ELSE phone END,role_id=$4 WHERE id=$5 AND version=$6 RETURNING id`, [parsed.data.fullName ?? null, parsed.data.phone !== undefined, parsed.data.phone ?? null, role.rows[0].id, req.params.id, parsed.data.version]);
      if (!updated.rowCount) throw apiError('STALE');
      if (companyId !== current.companyId) {
        await client.query('UPDATE user_company_memberships SET effective_to=current_date WHERE user_id=$1 AND effective_to IS NULL', [req.params.id]);
        if (companyId) await client.query('INSERT INTO user_company_memberships(user_id,company_id) VALUES($1,$2)', [req.params.id, companyId]);
      }
      // A role change invalidates existing sessions so the new claims apply at the next login.
      if (nextRole !== current.roleCode) await client.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1', [req.params.id]);
      await writeDomainAudit({ action: 'USER_UPDATED', actorUserId: req.auth!.userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: String(req.params.id), metadata: { roleCode: nextRole, previousRoleCode: current.roleCode }, client });
    });
    const result = await query(`${projection} WHERE u.id=$1`, [req.params.id]);
    return success(res, result.rows[0]);
  } catch (error) { return respondError(req, res, error); }
});

const transitions = {
  APPROVED: { from: ['PENDING_VALIDATION', 'INACTIVE'], action: 'USER_APPROVED' },
  REJECTED: { from: ['PENDING_VALIDATION'], action: 'USER_REJECTED' },
  INACTIVE: { from: ['PENDING_VALIDATION', 'APPROVED'], action: 'USER_DEACTIVATED' },
} as const;

async function changeStatus(req: Request, res: Response, status: keyof typeof transitions) {
  const parsed = versionSchema.safeParse(req.body);
  if (!uuid.safeParse(req.params.id).success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Solicitud inválida.');
  try {
    await withTransaction(async (client) => {
      const target = await lockVisibleTarget(req, client);
      if (req.auth!.userId === req.params.id) throw apiError('FORBIDDEN');
      if (!(transitions[status].from as readonly string[]).includes(target.status)) throw apiError('INVALID_STATE');
      if (status === 'APPROVED') {
        const letter = await client.query("SELECT 1 FROM user_authorization_documents WHERE user_id=$1 AND status='VALID' FOR SHARE", [req.params.id]);
        if (!letter.rowCount) throw apiError('LETTER_REQUIRED');
      }
      const result = await client.query('UPDATE users SET status=$1 WHERE id=$2 AND version=$3 RETURNING id', [status, req.params.id, parsed.data.version]);
      if (!result.rowCount) throw apiError('STALE');
      if (status !== 'APPROVED') await client.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1', [req.params.id]);
      await writeDomainAudit({ action: transitions[status].action, actorUserId: req.auth!.userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: String(req.params.id), metadata: { status, previousStatus: target.status }, client });
    });
    const result = await query(`${projection} WHERE u.id=$1`, [req.params.id]);
    return success(res, result.rows[0]);
  } catch (error) { return respondError(req, res, error); }
}

router.post('/:id/approve', requireRecentReauthentication, (req, res) => changeStatus(req, res, 'APPROVED'));
router.post('/:id/reject', requireRecentReauthentication, (req, res) => changeStatus(req, res, 'REJECTED'));
router.post('/:id/deactivate', requireRecentReauthentication, (req, res) => changeStatus(req, res, 'INACTIVE'));

// Carta de autorización de la cuenta.
router.get('/:id/authorization-letters', async (req, res) => {
  if (!uuid.safeParse(req.params.id).success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  try {
    const target = (await query<{ roleCode: string }>('SELECT r.code AS "roleCode" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1', [req.params.id])).rows[0];
    if (!target) throw apiError('NOT_FOUND');
    if (target.roleCode === 'UNIVERSAL' && !isUniversal(req)) throw apiError('HIDDEN');
    return success(res, await letterHistory(String(req.params.id)));
  } catch (error) { return respondError(req, res, error); }
});

router.post('/:id/authorization-letters', (req, res, next) => multipart.single('file')(req, res, (error: any) => error
  ? failure(req, res, error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, error.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR', 'Archivo inválido.')
  : next()), async (req, res) => {
  if (!uuid.safeParse(req.params.id).success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  const userId = String(req.params.id);
  try {
    // Pre-check visibility and state before touching Storage; re-checked under lock inside the transaction.
    await withTransaction(async (client) => { const target = await lockVisibleTarget(req, client); if (!awaitingApproval.has(target.status)) throw apiError('INVALID_STATE'); });
    const letter = await storeLetter(userId, req.file as any, (stored) => withTransaction(async (client) => {
      const target = await lockVisibleTarget(req, client);
      if (!awaitingApproval.has(target.status)) throw apiError('INVALID_STATE');
      const inserted = await insertLetter(client, { userId, uploadedBy: req.auth!.userId, storagePath: stored.storagePath, fileName: stored.fileName, mimeType: req.file!.mimetype, sizeBytes: req.file!.size, sha256: stored.sha256 });
      await writeDomainAudit({ action: inserted.replacedId ? 'USER_AUTHORIZATION_LETTER_REPLACED' : 'USER_AUTHORIZATION_LETTER_UPLOADED', actorUserId: req.auth!.userId, correlationId: req.context.correlationId,
        entityType: 'USER_AUTHORIZATION_LETTER', entityId: inserted.id, metadata: { userId, letterId: inserted.id, replacedLetterId: inserted.replacedId, mimeType: req.file!.mimetype, sizeBytes: req.file!.size }, client });
      return letterById(client, userId, inserted.id);
    }));
    return res.status(201).json({ data: letter, meta: { correlationId: req.context.correlationId } });
  } catch (error) { return respondError(req, res, error); }
});

async function reviewLetterRoute(req: Request, res: Response, decision: 'VALID' | 'REJECTED') {
  const parsed = (decision === 'VALID' ? versionSchema : rejectLetterSchema).safeParse(req.body);
  if (!uuid.safeParse(req.params.id).success || !uuid.safeParse(req.params.letterId).success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Solicitud inválida.');
  const userId = String(req.params.id), letterId = String(req.params.letterId);
  try {
    const letter = await withTransaction(async (client) => {
      const target = await lockVisibleTarget(req, client);
      if (!awaitingApproval.has(target.status)) throw apiError('INVALID_STATE');
      await reviewLetter(client, { userId, letterId, version: parsed.data.version, decision, reason: 'reason' in parsed.data ? String(parsed.data.reason) : undefined, actorId: req.auth!.userId, correlationId: req.context.correlationId });
      return letterById(client, userId, letterId);
    });
    return success(res, letter);
  } catch (error) { return respondError(req, res, error); }
}
router.post('/:id/authorization-letters/:letterId/validate', requireRecentReauthentication, (req, res) => reviewLetterRoute(req, res, 'VALID'));
router.post('/:id/authorization-letters/:letterId/reject', requireRecentReauthentication, (req, res) => reviewLetterRoute(req, res, 'REJECTED'));

router.post('/:id/authorization-letters/:letterId/download-url', async (req, res) => {
  if (!uuid.safeParse(req.params.id).success || !uuid.safeParse(req.params.letterId).success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  try {
    const target = (await query<{ roleCode: string }>('SELECT r.code AS "roleCode" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1', [req.params.id])).rows[0];
    if (!target) throw apiError('NOT_FOUND');
    if (target.roleCode === 'UNIVERSAL' && !isUniversal(req)) throw apiError('HIDDEN');
    const signed = await issueLetterDownload(String(req.params.id), String(req.params.letterId), req.auth!.userId, req.context.correlationId);
    res.setHeader('Cache-Control', 'no-store');
    return success(res, signed);
  } catch (error) { return respondError(req, res, error); }
});

export default router;
