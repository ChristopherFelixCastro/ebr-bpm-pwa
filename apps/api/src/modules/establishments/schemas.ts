import { z } from 'zod';

export const establishmentIdSchema = z.string().uuid();
export const organizationStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value);
};
export const isoDateSchema = z.string().refine(isIsoDate, 'Debe ser una fecha ISO YYYY-MM-DD.');
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const optionalDate = isoDateSchema.nullable().optional();

export const listEstablishmentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  status: organizationStatusSchema.optional(),
  companyId: establishmentIdSchema.optional(),
  provinceCode: z.string().trim().min(1).max(80).optional(),
  municipalityCode: z.string().trim().min(1).max(80).optional(),
  healthJurisdictionCode: z.string().trim().min(1).max(80).optional(),
  sanitaryPermitExpiresBefore: isoDateSchema.optional(),
}).strict();

export const createEstablishmentSchema = z.object({
  companyId: establishmentIdSchema,
  name: z.string().trim().min(1).max(300),
  establishmentTypeCode: optionalText(80),
  address: optionalText(500),
  provinceCode: optionalText(80),
  municipalityCode: optionalText(80),
  healthJurisdictionCode: optionalText(80),
  sanitaryPermitNumber: optionalText(100),
  sanitaryPermitExpiresAt: optionalDate,
  operationsStartedAt: optionalDate,
}).strict();

export const patchEstablishmentSchema = z.object({
  version: z.number().int().positive(),
  name: z.string().trim().min(1).max(300).optional(),
  establishmentTypeCode: optionalText(80),
  address: optionalText(500),
  provinceCode: optionalText(80),
  municipalityCode: optionalText(80),
  healthJurisdictionCode: optionalText(80),
  sanitaryPermitNumber: optionalText(100),
  sanitaryPermitExpiresAt: optionalDate,
  operationsStartedAt: optionalDate,
}).strict().superRefine((value, context) => {
  if (Object.keys(value).length === 1) context.addIssue({ code: 'custom', message: 'Debe indicar al menos un campo para modificar.' });
});

export const versionSchema = z.object({ version: z.number().int().positive() }).strict();

const optionalNumber = z.number().finite().nonnegative().nullable().optional();
const optionalCount = z.number().int().nonnegative().nullable().optional();
export const createOperationalProfileSchema = z.object({
  annualProduction: optionalNumber,
  marketTarget: optionalText(200),
  commercializationScope: optionalText(200),
  employeeCount: optionalCount,
  maleEmployeeCount: optionalCount,
  femaleEmployeeCount: optionalCount,
  haccpStatus: optionalText(100),
  haccpImplementationLevel: optionalText(100),
  samplingPlanStatus: optionalText(100),
  samplingPlanScope: optionalText(200),
  inabieSupplierStatus: optionalText(100),
  inabieDistributionScope: optionalText(200),
  effectiveFrom: isoDateSchema,
}).strict().superRefine((value, context) => {
  const total = value.employeeCount;
  const genderCount = (value.maleEmployeeCount ?? 0) + (value.femaleEmployeeCount ?? 0);
  if (total !== undefined && total !== null && genderCount > total) {
    context.addIssue({ code: 'custom', path: ['employeeCount'], message: 'La suma de personal masculino y femenino no puede superar el total.' });
  }
});

export type ListEstablishmentsInput = z.infer<typeof listEstablishmentsSchema>;
export type CreateEstablishmentInput = z.infer<typeof createEstablishmentSchema>;
export type PatchEstablishmentInput = z.infer<typeof patchEstablishmentSchema>;
export type CreateOperationalProfileInput = z.infer<typeof createOperationalProfileSchema>;
