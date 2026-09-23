import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../core/auth/authenticate.js';
import { bad, ok } from '../cases/http.js';
import { listEvaluationsSchema, uuid } from './schemas.js';
import * as service from './service.js';

const router = Router();
router.use(authenticate);
const actor = (request: Request): service.Actor => request.auth!;
const fail = (request: Request, response: Response, error: unknown) => {
  if (error instanceof service.AnalyticsError) {
    return bad(request, response, error.code === 'FORBIDDEN' ? 403 : 404, error.code);
  }
  throw error;
};
const wrap = (handler: (request: Request, response: Response) => Promise<unknown>) => async (request: Request, response: Response, next: (error?: unknown) => void) => {
  try { await handler(request, response); } catch (error) { try { fail(request, response, error); } catch (unexpected) { next(unexpected); } }
};

router.get('/summary', wrap(async (request, response) => {
  ok(request, response, await service.summary(actor(request)));
}));
router.get('/evaluations', wrap(async (request, response) => {
  const parsed = listEvaluationsSchema.safeParse(request.query);
  if (!parsed.success) return bad(request, response, 400, 'VALIDATION_ERROR');
  const result = await service.listEvaluations(parsed.data, actor(request));
  ok(request, response, result.rows, 200, { page: parsed.data.page, limit: parsed.data.limit, total: result.total });
}));
router.get('/evaluations/:inspectionId', wrap(async (request, response) => {
  const parsed = uuid.safeParse(request.params.inspectionId);
  if (!parsed.success) return bad(request, response, 400, 'VALIDATION_ERROR');
  ok(request, response, await service.evaluationDetail(parsed.data, actor(request)));
}));

export default router;
