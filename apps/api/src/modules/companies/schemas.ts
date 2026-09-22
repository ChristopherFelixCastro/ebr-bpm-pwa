import { z } from 'zod';

export const companyIdSchema = z.string().uuid();
export const companyStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const createCompanySchema = z.object({
  legalName: z.string().trim().min(1).max(300),
  tradeName: optionalText(300),
  rnc: z.string().trim().min(1).max(40),
  address: optionalText(500),
  phone: optionalText(40),
  email: z.string().trim().email().max(320).nullable().optional(),
  economicActivityCode: optionalText(80),
}).strict();

export const patchCompanySchema = z.object({
  version: z.number().int().positive(),
  legalName: z.string().trim().min(1).max(300).optional(),
  tradeName: optionalText(300),
  rnc: z.string().trim().min(1).max(40).optional(),
  address: optionalText(500),
  phone: optionalText(40),
  email: z.string().trim().email().max(320).nullable().optional(),
  economicActivityCode: optionalText(80),
}).strict().superRefine((value, context) => {
  if (Object.keys(value).length === 1) {
    context.addIssue({ code: 'custom', message: 'Debe indicar al menos un campo para modificar.' });
  }
});

export const deactivateCompanySchema = z.object({
  version: z.number().int().positive(),
}).strict();

export const listCompaniesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  status: companyStatusSchema.optional(),
}).strict();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type PatchCompanyInput = z.infer<typeof patchCompanySchema>;
export type ListCompaniesInput = z.infer<typeof listCompaniesSchema>;
