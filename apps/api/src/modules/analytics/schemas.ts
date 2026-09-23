import { z } from 'zod';

export const uuid = z.string().uuid();
export const lifecycleStatuses = [
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_SUBMISSION',
  'READY_FOR_REVIEW',
  'PENDING_REVIEW',
  'RETURNED_FOR_CORRECTION',
  'RESUBMITTED',
  'APPROVED',
  'CLOSED',
] as const;

export const listEvaluationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  companyId: uuid.optional(),
  establishmentId: uuid.optional(),
  lifecycleStatus: z.enum(lifecycleStatuses).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  reportStatus: z.enum(['DRAFT', 'OFFICIAL']).optional(),
  createdFrom: z.string().datetime({ offset: true }).optional(),
  createdTo: z.string().datetime({ offset: true }).optional(),
}).strict().superRefine((value, context) => {
  if (value.createdFrom && value.createdTo && value.createdFrom > value.createdTo) {
    context.addIssue({ code: 'custom', path: ['createdTo'], message: 'createdTo debe ser posterior a createdFrom.' });
  }
});

export type ListEvaluationsInput = z.infer<typeof listEvaluationsSchema>;
