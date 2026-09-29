import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../core/auth/authenticate.js';
import { requireRecentReauthentication } from '../../core/auth/reauth.middleware.js';
import { EstablishmentError, create, createOperationalProfile, currentOperationalProfile, deactivate, get, list, listOperationalProfiles, patch } from './service.js';
import { createEstablishmentSchema, createOperationalProfileSchema, establishmentIdSchema, listEstablishmentsSchema, patchEstablishmentSchema, versionSchema } from './schemas.js';

const router = Router();
router.use(authenticate);
const success = (res: Response, data: unknown, extra: object = {}) => res.json({ data, meta: { correlationId: res.locals.correlationId, ...extra } });
const failure = (req: Request, res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message }, meta: { correlationId: req.context.correlationId } });
const respondError = (req: Request, res: Response, error: unknown) => {
  if (!(error instanceof EstablishmentError)) throw error;
  const values = { FORBIDDEN: [403, 'FORBIDDEN', 'Acceso denegado.'], NOT_FOUND: [404, 'NOT_FOUND', 'Recurso no encontrado.'], STALE_VERSION: [409, 'STALE_VERSION', 'El recurso fue modificado por otra operación.'], CONFLICT: [409, 'CONFLICT', 'La operación entra en conflicto con el estado actual.'] } as const;
  const [status, code, message] = values[error.code];
  return failure(req, res, status, code, message);
};
const idFrom = (req: Request) => establishmentIdSchema.safeParse(req.params.id);
const withErrors = (handler: (req: Request, res: Response) => Promise<Response | undefined>) => async (req: Request, res: Response, next: (error?: unknown) => void) => { try { return await handler(req, res); } catch (error) { try { return respondError(req, res, error); } catch (unhandled) { return next(unhandled); } } };

router.get('/', withErrors(async (req, res) => {
  const parsed = listEstablishmentsSchema.safeParse(req.query);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Consulta inválida.');
  const result = await list(parsed.data, req.auth!);
  return success(res, result.rows, { page: parsed.data.page, limit: parsed.data.limit, total: result.total });
}));
router.post('/', withErrors(async (req, res) => {
  const parsed = createEstablishmentSchema.safeParse(req.body);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Datos de establecimiento inválidos.');
  const data = await create(parsed.data, req.auth!, req.context.correlationId);
  return res.status(201).json({ data, meta: { correlationId: req.context.correlationId } });
}));
router.get('/:id', withErrors(async (req, res) => {
  const id = idFrom(req); if (!id.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  return success(res, await get(id.data, req.auth!));
}));
router.patch('/:id', withErrors(async (req, res) => {
  const id = idFrom(req), parsed = patchEstablishmentSchema.safeParse(req.body);
  if (!id.success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Modificación inválida.');
  return success(res, await patch(id.data, parsed.data, req.auth!, req.context.correlationId));
}));
router.post('/:id/deactivate', requireRecentReauthentication, withErrors(async (req, res) => {
  const id = idFrom(req), parsed = versionSchema.safeParse(req.body);
  if (!id.success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Solicitud inválida.');
  return success(res, await deactivate(id.data, parsed.data.version, req.auth!, req.context.correlationId));
}));
router.get('/:id/operational-profiles', withErrors(async (req, res) => {
  const id = idFrom(req); if (!id.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  return success(res, await listOperationalProfiles(id.data, req.auth!));
}));
router.get('/:id/operational-profiles/current', withErrors(async (req, res) => {
  const id = idFrom(req); if (!id.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  return success(res, await currentOperationalProfile(id.data, req.auth!));
}));
router.post('/:id/operational-profiles', withErrors(async (req, res) => {
  const id = idFrom(req), parsed = createOperationalProfileSchema.safeParse(req.body);
  if (!id.success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Datos de perfil inválidos.');
  return res.status(201).json({ data: await createOperationalProfile(id.data, parsed.data, req.auth!, req.context.correlationId), meta: { correlationId: req.context.correlationId } });
}));

export default router;
