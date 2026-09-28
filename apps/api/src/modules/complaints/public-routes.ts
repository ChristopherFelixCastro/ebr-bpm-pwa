import { Router, type Request, type Response } from 'express';
import { bad, ok, wrap } from '../cases/http.js';
import { publicCreateSchema } from './schemas.js';
import { createPublic } from './service.js';

const router = Router();
router.post('/', wrap(async (request: Request, response: Response) => {
  const parsed = publicCreateSchema.safeParse(request.body);
  if (!parsed.success) return bad(request, response, 400, 'VALIDATION_ERROR');
  ok(request, response, await createPublic(parsed.data, request.context.correlationId), 201);
}));

export default router;
