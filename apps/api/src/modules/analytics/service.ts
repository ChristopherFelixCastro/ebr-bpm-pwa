import type { RoleCode } from '../../core/auth/roles.js';
import * as repository from './repository.js';
import type { ListEvaluationsInput } from './schemas.js';

export type Actor = { userId: string; role: RoleCode; authTime: number };
export type AnalyticsErrorCode = 'FORBIDDEN' | 'NOT_FOUND';
export class AnalyticsError extends Error {
  constructor(public code: AnalyticsErrorCode) { super(code); }
}

const allowedRoles = new Set<RoleCode>(['ADMIN', 'COORDINATOR', 'UNIVERSAL']);
const authorize = (actor: Actor) => {
  if (!allowedRoles.has(actor.role)) throw new AnalyticsError('FORBIDDEN');
};

export async function listEvaluations(input: ListEvaluationsInput, actor: Actor) {
  authorize(actor);
  return repository.listEvaluations(input);
}

export async function evaluationDetail(id: string, actor: Actor) {
  authorize(actor);
  const row = await repository.evaluationDetail(id);
  if (!row) throw new AnalyticsError('NOT_FOUND');
  return row;
}

export async function summary(actor: Actor) {
  authorize(actor);
  return repository.summary();
}
