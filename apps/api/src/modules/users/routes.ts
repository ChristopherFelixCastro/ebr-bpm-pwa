import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { writeDomainAudit } from '../../core/audit/domain-audit.service.js';
import { writeAuthAudit } from '../../core/audit/auth-audit.service.js';
import { authenticate } from '../../core/auth/authenticate.js';
import { hashPassword } from '../../core/auth/password.js';
import { newPasswordSchema } from '../../core/auth/password-policy.js';
import { requireRecentReauthentication } from '../../core/auth/reauth.middleware.js';
import { requireRoles } from '../../core/auth/rbac.middleware.js';
import { query, withTransaction } from '../../db/client.js';
import { env } from '../../config/env.js';

const router = Router();
router.use(authenticate, requireRoles('ADMIN'));

const uuid = z.string().uuid();
const companyRoles = new Set(['COMPANY_ADMIN', 'DELEGATE']);
const createSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().trim().min(1).max(40).optional(),
  password: newPasswordSchema,
  roleCode: z.enum(['ADMIN', 'COMPANY_ADMIN', 'DELEGATE', 'COORDINATOR', 'EVALUATOR', 'UNIVERSAL']),
  companyId: uuid.optional(),
}).strict().superRefine((value, context) => {
  if (companyRoles.has(value.roleCode) !== Boolean(value.companyId)) context.addIssue({ code: 'custom', path: ['companyId'], message: 'La empresa debe corresponder al tipo de rol.' });
});
const patchSchema = z.object({
  version: z.number().int().positive(),
  fullName: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  roleCode: z.enum(['ADMIN', 'COMPANY_ADMIN', 'DELEGATE', 'COORDINATOR', 'EVALUATOR', 'UNIVERSAL']).optional(),
  companyId: uuid.nullable().optional(),
}).strict();
const versionSchema = z.object({ version: z.number().int().positive() }).strict();
const listSchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).optional() });
const success = (res: Response, data: unknown, extra: object = {}) => res.json({ data, meta: { correlationId: res.locals.correlationId, ...extra } });
const failure = (req: Request, res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message }, meta: { correlationId: req.context.correlationId } });
const recent = (req: Request) => Boolean(req.auth) && Math.floor(Date.now() / 1000) - req.auth!.authTime <= env.JWT_REAUTH_MAX_AGE_MINUTES * 60;
const denied = async (req: Request, res: Response, code = 'FORBIDDEN', message = 'Acceso denegado.') => {
  try { await writeAuthAudit({ action: 'AUTH_FORBIDDEN', outcome: 'DENIED', correlationId: req.context.correlationId, userId: req.auth?.userId }); } catch { /* response still takes priority */ }
  return failure(req, res, code === 'REAUTHENTICATION_REQUIRED' ? 401 : 403, code, message);
};

const projection = `SELECT u.id,u.full_name AS "fullName",u.email,u.phone,u.status::text,u.version,r.code AS "roleCode",
  m.company_id AS "companyId",c.legal_name AS "companyName",u.created_at AS "createdAt",u.updated_at AS "updatedAt"
  FROM users u JOIN roles r ON r.id=u.role_id
  LEFT JOIN user_company_memberships m ON m.user_id=u.id AND m.effective_to IS NULL
  LEFT JOIN companies c ON c.id=m.company_id`;

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Consulta inválida.');
  const { page, limit, search } = parsed.data;
  const pattern = search ? `%${search.toLowerCase()}%` : null;
  const count = await query<{ total: string }>('SELECT count(*) total FROM users WHERE $1::text IS NULL OR lower(full_name) LIKE $1 OR email_normalized LIKE $1', [pattern]);
  const rows = await query(`${projection} WHERE $1::text IS NULL OR lower(u.full_name) LIKE $1 OR u.email_normalized LIKE $1 ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`, [pattern, limit, (page - 1) * limit]);
  return success(res, rows.rows, { page, limit, total: Number(count.rows[0].total) });
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Datos de usuario inválidos.');
  if (parsed.data.roleCode === 'UNIVERSAL' && req.auth!.role !== 'UNIVERSAL') return denied(req, res);
  if (parsed.data.roleCode === 'UNIVERSAL' && !recent(req)) return denied(req, res, 'REAUTHENTICATION_REQUIRED', 'Se requiere autenticación reciente.');
  try {
    const created = await withTransaction(async (client) => {
      const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE code=$1', [parsed.data.roleCode]);
      const passwordHash = await hashPassword(parsed.data.password);
      const user = await client.query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,phone,password_hash,status) VALUES($1,$2,$3,$4,$5,'PENDING_VALIDATION') RETURNING id`, [role.rows[0].id, parsed.data.fullName, parsed.data.email.toLowerCase(), parsed.data.phone ?? null, passwordHash]);
      if (parsed.data.companyId) await client.query('INSERT INTO user_company_memberships(user_id,company_id) VALUES($1,$2)', [user.rows[0].id, parsed.data.companyId]);
      await writeDomainAudit({ action: 'USER_CREATED', actorUserId: req.auth!.userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: user.rows[0].id, metadata: { roleCode: parsed.data.roleCode }, client });
      return user.rows[0].id;
    });
    const result = await query(`${projection} WHERE u.id=$1`, [created]);
    return res.status(201).json({ data: result.rows[0], meta: { correlationId: req.context.correlationId } });
  } catch (error: any) {
    if (error?.code === '23505') return failure(req, res, 409, 'CONFLICT', 'El correo ya está registrado.');
    if (error?.code === '23503') return failure(req, res, 400, 'VALIDATION_ERROR', 'La empresa indicada no existe.');
    throw error;
  }
});

router.get('/:id', async (req, res) => {
  if (!uuid.safeParse(req.params.id).success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  const result = await query(`${projection} WHERE u.id=$1`, [req.params.id]);
  return result.rows[0] ? success(res, result.rows[0]) : failure(req, res, 404, 'NOT_FOUND', 'Usuario no encontrado.');
});

router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!uuid.safeParse(req.params.id).success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Modificación inválida.');
  try {
    await withTransaction(async (client) => {
      const current = await client.query<{ role_code: string; company_id: string | null }>(`SELECT r.code role_code,m.company_id FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN user_company_memberships m ON m.user_id=u.id AND m.effective_to IS NULL WHERE u.id=$1 FOR UPDATE OF u`, [req.params.id]);
      if (!current.rows[0]) throw Object.assign(new Error(), { apiCode: 'NOT_FOUND' });
      const roleCode = parsed.data.roleCode ?? current.rows[0].role_code;
      if ((current.rows[0].role_code === 'UNIVERSAL' || roleCode === 'UNIVERSAL') && req.auth!.role !== 'UNIVERSAL') throw Object.assign(new Error(), { apiCode: 'FORBIDDEN' });
      if ((current.rows[0].role_code === 'UNIVERSAL' || roleCode === 'UNIVERSAL') && !recent(req)) throw Object.assign(new Error(), { apiCode: 'REAUTH' });
      const companyId = parsed.data.companyId === undefined ? current.rows[0].company_id : parsed.data.companyId;
      if (companyRoles.has(roleCode) !== Boolean(companyId)) throw Object.assign(new Error(), { apiCode: 'SCOPE' });
      const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE code=$1', [roleCode]);
      const updated = await client.query(`UPDATE users SET full_name=COALESCE($1,full_name),phone=CASE WHEN $2 THEN $3 ELSE phone END,role_id=$4 WHERE id=$5 AND version=$6 RETURNING id`, [parsed.data.fullName ?? null, parsed.data.phone !== undefined, parsed.data.phone ?? null, role.rows[0].id, req.params.id, parsed.data.version]);
      if (!updated.rowCount) throw Object.assign(new Error(), { apiCode: 'STALE' });
      if (companyId !== current.rows[0].company_id) {
        await client.query('UPDATE user_company_memberships SET effective_to=current_date WHERE user_id=$1 AND effective_to IS NULL', [req.params.id]);
        if (companyId) await client.query('INSERT INTO user_company_memberships(user_id,company_id) VALUES($1,$2)', [req.params.id, companyId]);
      }
      await writeDomainAudit({ action: 'USER_UPDATED', actorUserId: req.auth!.userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: String(req.params.id), metadata: { roleCode }, client });
    });
    const result = await query(`${projection} WHERE u.id=$1`, [req.params.id]);
    return success(res, result.rows[0]);
  } catch (error: any) {
    if (error.apiCode === 'NOT_FOUND') return failure(req, res, 404, 'NOT_FOUND', 'Usuario no encontrado.');
    if (error.apiCode === 'STALE') return failure(req, res, 409, 'STALE_VERSION', 'El usuario fue modificado por otra operación.');
    if (error.apiCode === 'SCOPE') return failure(req, res, 400, 'VALIDATION_ERROR', 'La empresa debe corresponder al tipo de rol.');
    if (error.apiCode === 'FORBIDDEN') return denied(req, res);
    if (error.apiCode === 'REAUTH') return denied(req, res, 'REAUTHENTICATION_REQUIRED', 'Se requiere autenticación reciente.');
    throw error;
  }
});

async function changeStatus(req: Request, res: Response, status: 'APPROVED' | 'REJECTED' | 'INACTIVE', action: string) {
  const parsed = versionSchema.safeParse(req.body);
  if (!uuid.safeParse(req.params.id).success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Solicitud inválida.');
  try {
    await withTransaction(async (client) => {
      const target = await client.query<{ roleCode: string }>(`SELECT r.code AS "roleCode" FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 FOR UPDATE OF u`, [req.params.id]);
      if (!target.rows[0]) throw Object.assign(new Error(), { apiCode: 'NOT_FOUND' });
      if (target.rows[0].roleCode === 'UNIVERSAL' && req.auth!.role !== 'UNIVERSAL') throw Object.assign(new Error(), { apiCode: 'FORBIDDEN' });
      if (target.rows[0].roleCode === 'UNIVERSAL' && !recent(req)) throw Object.assign(new Error(), { apiCode: 'REAUTH' });
      if (status === 'INACTIVE' && target.rows[0].roleCode === 'UNIVERSAL' && req.auth!.userId === req.params.id) throw Object.assign(new Error(), { apiCode: 'SELF' });
      const result = await client.query('UPDATE users SET status=$1 WHERE id=$2 AND version=$3 RETURNING id', [status, req.params.id, parsed.data.version]);
      if (!result.rowCount) throw Object.assign(new Error(), { apiCode: 'STALE' });
      if (status === 'INACTIVE') await client.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1', [req.params.id]);
      await writeDomainAudit({ action, actorUserId: req.auth!.userId, correlationId: req.context.correlationId, entityType: 'USER', entityId: String(req.params.id), metadata: { status }, client });
    });
    const result = await query(`${projection} WHERE u.id=$1`, [req.params.id]);
    return success(res, result.rows[0]);
  } catch (error: any) {
    if (error.apiCode === 'NOT_FOUND') return failure(req, res, 404, 'NOT_FOUND', 'Usuario no encontrado.');
    if (error.apiCode === 'STALE') return failure(req, res, 409, 'STALE_VERSION', 'Usuario inexistente o versión desactualizada.');
    if (error.apiCode === 'FORBIDDEN' || error.apiCode === 'SELF') return denied(req, res);
    if (error.apiCode === 'REAUTH') return denied(req, res, 'REAUTHENTICATION_REQUIRED', 'Se requiere autenticación reciente.');
    if (error?.code === '23514') return failure(req, res, 409, 'CONFLICT', 'Debe permanecer al menos un usuario UNIVERSAL activo.');
    throw error;
  }
}

router.post('/:id/approve', requireRecentReauthentication, (req, res) => changeStatus(req, res, 'APPROVED', 'USER_APPROVED'));
router.post('/:id/reject', requireRecentReauthentication, (req, res) => changeStatus(req, res, 'REJECTED', 'USER_REJECTED'));
router.post('/:id/deactivate', requireRecentReauthentication, (req, res) => changeStatus(req, res, 'INACTIVE', 'USER_DEACTIVATED'));

export default router;
