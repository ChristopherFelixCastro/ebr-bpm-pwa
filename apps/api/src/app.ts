import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { pool } from './db/client.js';
import authRoutes from './modules/auth/routes.js';
import companyRoutes from './modules/companies/routes.js';
import establishmentRoutes from './modules/establishments/routes.js';
import contactRoutes from './modules/contacts/routes.js';
import companyRequestRoutes from './modules/company-requests/routes.js';
import caseRoutes from './modules/cases/routes.js';
import institutionalProgramRoutes from './modules/institutional-programs/routes.js';
import healthAlertRoutes from './modules/health-alerts/routes.js';
import complaintRoutes from './modules/complaints/routes.js';
import assignmentSchedulingRoutes from './modules/assignment-scheduling/routes.js';
import inspectionExecutionRoutes from './modules/inspection-execution/routes.js';
import inspectionReviewRoutes from './modules/inspection-reviews/routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import userRoutes from './modules/users/routes.js';
import catalogAdministrationRoutes from './modules/catalog-administration/routes.js';
import bpmTemplateAdministrationRoutes from './modules/bpm-template-administration/routes.js';
import riskRuleAdministrationRoutes from './modules/risk-rule-administration/routes.js';
import { openApiDocument } from './openapi.js';
import { rateLimit } from './core/http/rate-limit.js';

declare global {
  namespace Express {
    interface Request {
      context: { correlationId: string };
    }
  }
}

export const app = express();
app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
const origins = env.CORS_ORIGINS.split(',').map((value) => value.trim());
const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers.set-cookie',
    'password',
    'token',
    'hash',
    'identity_document',
    'storage_path',
    'req.body.password',
    'req.body.token',
    'req.body.email',
    'req.body.identityDocument',
    'req.body.phone',
  ],
});

app.use((req, res, next) => {
  const raw = req.header('x-correlation-id');
  const id = raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : randomUUID();
  req.context = { correlationId: id };
  res.setHeader('x-correlation-id', id);
  res.locals.correlationId = id;
  next();
});
app.use(pinoHttp({ logger, genReqId: (req) => req.context.correlationId }));
app.use(helmet({ contentSecurityPolicy: env.OPENAPI_DOCS_ENABLED ? false : undefined, crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || origins.includes(origin)), credentials: true, methods:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders:['authorization','content-type','x-correlation-id','x-csrf-token'] }));
app.use(express.json({ limit: env.JSON_BODY_LIMIT, strict: true }));
app.use(express.urlencoded({ extended: false, limit: env.FORM_BODY_LIMIT, parameterLimit: 200 }));

const ok = (res: Response, data: unknown) => res.json({ data, meta: { correlationId: res.locals.correlationId } });
app.get('/health/live', (_req, res) => ok(res, { status: 'ok' }));
app.get('/health/ready', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { status: 'ready' });
  } catch (error) {
    next(error);
  }
});
app.get('/openapi.json', (_req, res) => res.json(openApiDocument));

if (env.OPENAPI_DOCS_ENABLED) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'EBR/BPM API',
    swaggerOptions: { persistAuthorization: true, withCredentials: true },
  }));
}

app.use('/v1/auth', rateLimit({windowMs:env.AUTH_RATE_LIMIT_WINDOW_MS,max:env.AUTH_RATE_LIMIT_MAX,scope:'auth'}), authRoutes);
app.use('/v1/companies', companyRoutes);
app.use('/v1/establishments', establishmentRoutes);
app.use('/v1', contactRoutes);
app.use('/v1/company-requests', companyRequestRoutes);
app.use('/v1/cases', caseRoutes);
app.use('/v1/institutional-program-cases', institutionalProgramRoutes);
app.use('/v1/health-alerts', healthAlertRoutes);
app.use('/v1/complaints', complaintRoutes);
app.use('/v1', assignmentSchedulingRoutes);
app.use('/v1', inspectionExecutionRoutes);
app.use('/v1', inspectionReviewRoutes);
app.use('/v1/analytics', analyticsRoutes);
app.use('/v1/users', userRoutes);
const adminLimit=rateLimit({windowMs:env.ADMIN_RATE_LIMIT_WINDOW_MS,max:env.ADMIN_RATE_LIMIT_MAX,scope:'admin'});
app.use('/v1/admin/catalogs', adminLimit, catalogAdministrationRoutes);
app.use('/v1/admin/bpm-templates', adminLimit, bpmTemplateAdministrationRoutes);
app.use('/v1/admin/risk-rule-sets', adminLimit, riskRuleAdministrationRoutes);
app.use((_req, res) => res.status(404).json({
  error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' },
  meta: { correlationId: res.locals.correlationId },
}));
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const candidate=error as {status?:number;statusCode?:number;type?:string};
  const payloadTooLarge=candidate.status===413||candidate.statusCode===413||candidate.type==='entity.too.large';
  const invalidJson=error instanceof SyntaxError&&candidate.status===400;
  const status=payloadTooLarge?413:invalidJson?400:500;
  const code=payloadTooLarge?'PAYLOAD_TOO_LARGE':invalidJson?'INVALID_JSON':'INTERNAL_ERROR';
  if(status===500)req.log.error({ correlationId: req.context?.correlationId, errorName:(error as Error)?.name }, 'request failed');
  else req.log.warn({correlationId:req.context?.correlationId,code},'request rejected');
  res.status(status).json({
    error: { code, message: status===413?'La solicitud excede el tamaño permitido.':status===400?'JSON inválido.':'Error interno.' },
    meta: { correlationId: res.locals.correlationId },
  });
});
