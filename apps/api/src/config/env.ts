import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.env') });

const booleanFromEnvironment = z.enum(['true', 'false']).transform((value) => value === 'true');
const optionalEnvironmentValue = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  (value) => value === '' ? undefined : value,
  schema.optional(),
);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JSON_BODY_LIMIT: z.string().default('1mb'),
  FORM_BODY_LIMIT: z.string().default('1mb'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REAUTH_MAX_AGE_MINUTES: z.coerce.number().int().positive().default(15),
  OPENAPI_DOCS_ENABLED: booleanFromEnvironment.optional(),
  SUPABASE_URL: optionalEnvironmentValue(z.string().url()),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnvironmentValue(z.string().min(20)),
  SUPABASE_STORAGE_BUCKET_PRIVATE: optionalEnvironmentValue(z.string().min(1)),
  PDF_CHROMIUM_EXECUTABLE_PATH: optionalEnvironmentValue(z.string().min(1)),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.JWT_ACCESS_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_ACCESS_SECRET'],
      message: 'JWT_ACCESS_SECRET es obligatorio en producción.',
    });
  }
  const storageValues = [value.SUPABASE_URL, value.SUPABASE_SERVICE_ROLE_KEY, value.SUPABASE_STORAGE_BUCKET_PRIVATE];
  if (storageValues.some(Boolean) && !storageValues.every(Boolean)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SUPABASE_URL'],
      message: 'La configuración de Supabase Storage debe proporcionarse completa.',
    });
  }
  if (value.SUPABASE_STORAGE_BUCKET_PRIVATE && value.SUPABASE_STORAGE_BUCKET_PRIVATE !== 'ebr-bpm-private') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SUPABASE_STORAGE_BUCKET_PRIVATE'], message: 'El bucket privado debe ser ebr-bpm-private.' });
  }
});

const parsed = schema.parse(process.env);
export const env = {
  ...parsed,
  OPENAPI_DOCS_ENABLED: parsed.OPENAPI_DOCS_ENABLED ?? parsed.NODE_ENV !== 'production',
};
