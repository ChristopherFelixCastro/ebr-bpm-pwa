import type { PoolClient } from 'pg';
import { writeDomainAudit } from '../../core/audit/domain-audit.service.js';
import type { RoleCode } from '../../core/auth/roles.js';
import { query, withTransaction } from '../../db/client.js';
import type { CreateEstablishmentInput, CreateOperationalProfileInput, ListEstablishmentsInput, PatchEstablishmentInput } from './schemas.js';
import * as repository from './repository.js';

export class EstablishmentError extends Error {
  constructor(public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'STALE_VERSION' | 'CONFLICT') { super(code); }
}
type Auth = { userId: string; role: RoleCode };
const globalReaders = new Set<RoleCode>(['ADMIN', 'UNIVERSAL', 'COORDINATOR', 'EVALUATOR']);
const globalWriters = new Set<RoleCode>(['ADMIN', 'UNIVERSAL']);

async function activeMembership(userId: string, client?: PoolClient) {
  return repository.findActiveMembershipCompany(client ?? { query }, userId);
}
async function listScope(auth: Auth): Promise<string | undefined | null> {
  if (globalReaders.has(auth.role)) return undefined;
  if (auth.role === 'COMPANY_ADMIN' || auth.role === 'DELEGATE') return (await activeMembership(auth.userId)) ?? null;
  throw new EstablishmentError('FORBIDDEN');
}
async function assertCompanyAccess(auth: Auth, companyId: string, write: boolean, client?: PoolClient) {
  if (globalReaders.has(auth.role)) {
    if (write && !globalWriters.has(auth.role)) throw new EstablishmentError('FORBIDDEN');
    return;
  }
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'DELEGATE') throw new EstablishmentError('FORBIDDEN');
  if (write && auth.role !== 'COMPANY_ADMIN') throw new EstablishmentError('FORBIDDEN');
  if ((await activeMembership(auth.userId, client)) !== companyId) throw new EstablishmentError('FORBIDDEN');
}
async function findAccessibleEstablishment(id: string, auth: Auth) {
  const establishment = await repository.findEstablishment({ query }, id);
  if (!establishment) throw new EstablishmentError('NOT_FOUND');
  await assertCompanyAccess(auth, establishment.companyId, false);
  return establishment;
}
const rethrowConflict = (error: any) => {
  if (error?.code === '23505' || error?.code === '23P01') throw new EstablishmentError('CONFLICT');
  throw error;
};

export async function list(input: ListEstablishmentsInput, auth: Auth) {
  const scope = await listScope(auth);
  if (scope === null) return { rows: [], total: 0 };
  return repository.listEstablishments({ query }, input, scope);
}
export async function get(id: string, auth: Auth) { return findAccessibleEstablishment(id, auth); }
export async function create(input: CreateEstablishmentInput, actor: Auth, correlationId: string) {
  try {
    return await withTransaction(async (client) => {
      const company = await repository.findCompanyStatus(client, input.companyId);
      if (!company) throw new EstablishmentError('NOT_FOUND');
      await assertCompanyAccess(actor, company.id, true, client);
      if (company.status !== 'ACTIVE') throw new EstablishmentError('CONFLICT');
      const id = await repository.insertEstablishment(client, input);
      await writeDomainAudit({ action: 'ESTABLISHMENT_CREATED', actorUserId: actor.userId, correlationId, entityType: 'ESTABLISHMENT', entityId: id, metadata: { companyId: input.companyId, status: 'ACTIVE' }, client });
      return (await repository.findEstablishment(client, id))!;
    });
  } catch (error) { return rethrowConflict(error); }
}
export async function patch(id: string, input: PatchEstablishmentInput, actor: Auth, correlationId: string) {
  try {
    return await withTransaction(async (client) => {
      const current = await repository.lockEstablishment(client, id);
      if (!current) throw new EstablishmentError('NOT_FOUND');
      await assertCompanyAccess(actor, current.companyId, true, client);
      if (!(await repository.updateEstablishment(client, id, input))) throw new EstablishmentError('STALE_VERSION');
      await writeDomainAudit({ action: 'ESTABLISHMENT_UPDATED', actorUserId: actor.userId, correlationId, entityType: 'ESTABLISHMENT', entityId: id, metadata: { companyId: current.companyId, status: current.status }, client });
      return (await repository.findEstablishment(client, id))!;
    });
  } catch (error) { return rethrowConflict(error); }
}
export async function deactivate(id: string, version: number, actor: Auth, correlationId: string) {
  return withTransaction(async (client) => {
    const current = await repository.lockEstablishment(client, id);
    if (!current) throw new EstablishmentError('NOT_FOUND');
    await assertCompanyAccess(actor, current.companyId, true, client);
    if (current.version !== version) throw new EstablishmentError('STALE_VERSION');
    if (current.status === 'ACTIVE') {
      await repository.deactivateEstablishment(client, id);
      await writeDomainAudit({ action: 'ESTABLISHMENT_DEACTIVATED', actorUserId: actor.userId, correlationId, entityType: 'ESTABLISHMENT', entityId: id, metadata: { companyId: current.companyId, status: 'INACTIVE' }, client });
    }
    return (await repository.findEstablishment(client, id))!;
  });
}
export async function listOperationalProfiles(id: string, auth: Auth) {
  await findAccessibleEstablishment(id, auth);
  return repository.listProfiles({ query }, id);
}
export async function currentOperationalProfile(id: string, auth: Auth) {
  await findAccessibleEstablishment(id, auth);
  const profile = await repository.findCurrentProfile({ query }, id);
  if (!profile) throw new EstablishmentError('NOT_FOUND');
  return profile;
}
export async function createOperationalProfile(id: string, input: CreateOperationalProfileInput, actor: Auth, correlationId: string) {
  try {
    return await withTransaction(async (client) => {
      const establishment = await repository.lockEstablishment(client, id);
      if (!establishment) throw new EstablishmentError('NOT_FOUND');
      await assertCompanyAccess(actor, establishment.companyId, true, client);
      if (establishment.status !== 'ACTIVE' || establishment.companyStatus !== 'ACTIVE') throw new EstablishmentError('CONFLICT');
      const previous = await repository.findCurrentProfile(client, id, true);
      if (previous && input.effectiveFrom <= previous.effectiveFrom) throw new EstablishmentError('CONFLICT');
      if (previous) await repository.closeCurrentProfile(client, previous.id, input.effectiveFrom);
      const profileId = await repository.insertProfile(client, id, input);
      await writeDomainAudit({ action: 'OPERATIONAL_PROFILE_CREATED', actorUserId: actor.userId, correlationId, entityType: 'OPERATIONAL_PROFILE', entityId: profileId, metadata: { companyId: establishment.companyId, effectiveFrom: input.effectiveFrom, previousProfileClosed: Boolean(previous) }, client });
      return (await repository.findProfile(client, profileId))!;
    });
  } catch (error) { return rethrowConflict(error); }
}
