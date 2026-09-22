import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../core/auth/authenticate.js';
import { requireRecentReauthentication } from '../../core/auth/reauth.middleware.js';
import { CompanyError, create, deactivate, get, list, patch } from './service.js';
import { companyIdSchema, createCompanySchema, deactivateCompanySchema, listCompaniesSchema, patchCompanySchema } from './schemas.js';

const router = Router();
router.use(authenticate);

const success = (res: Response, data: unknown, extra: object = {}) => res.json({ data, meta: { correlationId: res.locals.correlationId, ...extra } });
const failure = (req: Request, res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message }, meta: { correlationId: req.context.correlationId } });
const respondError = (req: Request, res: Response, error: unknown) => {
  if (!(error instanceof CompanyError)) throw error;
  const map = {
    FORBIDDEN: [403, 'FORBIDDEN', 'Acceso denegado.'],
    NOT_FOUND: [404, 'NOT_FOUND', 'Empresa no encontrada.'],
    STALE_VERSION: [409, 'STALE_VERSION', 'La empresa fue modificada por otra operación.'],
    CONFLICT: [409, 'CONFLICT', 'El RNC ya está registrado.'],
  } as const;
  const [status, code, message] = map[error.code];
  return failure(req, res, status, code, message);
};

router.get('/', async (req, res, next) => {
  const parsed = listCompaniesSchema.safeParse(req.query);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Consulta inválida.');
  try {
    const result = await list(parsed.data, req.auth!);
    return success(res, result.rows, { page: parsed.data.page, limit: parsed.data.limit, total: result.total });
  } catch (error) { try { return respondError(req, res, error); } catch (unhandled) { next(unhandled); } }
});

router.post('/', async (req, res, next) => {
  const parsed = createCompanySchema.safeParse(req.body);
  if (!parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Datos de empresa inválidos.');
  try { return res.status(201).json({ data: await create(parsed.data, req.auth!, req.context.correlationId), meta: { correlationId: req.context.correlationId } }); }
  catch (error) { try { return respondError(req, res, error); } catch (unhandled) { next(unhandled); } }
});

router.get('/:id', async (req, res, next) => {
  const parsedId = companyIdSchema.safeParse(req.params.id);
  if (!parsedId.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Identificador inválido.');
  try { return success(res, await get(parsedId.data, req.auth!)); }
  catch (error) { try { return respondError(req, res, error); } catch (unhandled) { next(unhandled); } }
});

router.patch('/:id', async (req, res, next) => {
  const parsed = patchCompanySchema.safeParse(req.body);
  const parsedId = companyIdSchema.safeParse(req.params.id);
  if (!parsedId.success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Modificación inválida.');
  try { return success(res, await patch(parsedId.data, parsed.data, req.auth!, req.context.correlationId)); }
  catch (error) { try { return respondError(req, res, error); } catch (unhandled) { next(unhandled); } }
});

router.post('/:id/deactivate', requireRecentReauthentication, async (req, res, next) => {
  const parsed = deactivateCompanySchema.safeParse(req.body);
  const parsedId = companyIdSchema.safeParse(req.params.id);
  if (!parsedId.success || !parsed.success) return failure(req, res, 400, 'VALIDATION_ERROR', 'Solicitud inválida.');
  try { return success(res, await deactivate(parsedId.data, parsed.data.version, req.auth!, req.context.correlationId)); }
  catch (error) { try { return respondError(req, res, error); } catch (unhandled) { next(unhandled); } }
});

export default router;
