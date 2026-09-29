import type { PoolClient } from 'pg';
import { writeDomainAudit } from '../../core/audit/domain-audit.service.js';
import { query, withTransaction } from '../../db/client.js';
import type { RoleCode } from '../../core/auth/roles.js';
import type { CreateCompanyInput, ListCompaniesInput, PatchCompanyInput } from './schemas.js';
import * as repository from './repository.js';

export class CompanyError extends Error {
  constructor(public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'STALE_VERSION' | 'CONFLICT') { super(code); }
}

const isGlobal = (role: RoleCode) => role === 'ADMIN' || role === 'UNIVERSAL';

async function scopedCompanyId(userId: string, role: RoleCode, client?: PoolClient): Promise<string | undefined | null> {
  if (isGlobal(role)) return undefined;
  if (role !== 'COMPANY_ADMIN') throw new CompanyError('FORBIDDEN');
  return (await repository.findActiveMembershipCompany(client ?? { query }, userId)) ?? null;
}

async function verifySpecificAccess(userId: string, role: RoleCode, companyId: string, client?: PoolClient) {
  if (isGlobal(role)) return;
  if (role !== 'COMPANY_ADMIN') throw new CompanyError('FORBIDDEN');
  const existing = await repository.findCompany(client ?? { query }, companyId);
  if (!existing) throw new CompanyError('NOT_FOUND');
  const ownCompanyId = await scopedCompanyId(userId, role, client);
  if (ownCompanyId !== companyId) throw new CompanyError('FORBIDDEN');
}

export async function list(input: ListCompaniesInput, auth: { userId: string; role: RoleCode }) {
  const companyId = await scopedCompanyId(auth.userId, auth.role);
  if (companyId === null) return { rows: [], total: 0 };
  return repository.listCompanies({ query }, input, companyId);
}

export async function get(companyId: string, auth: { userId: string; role: RoleCode }) {
  await verifySpecificAccess(auth.userId, auth.role, companyId);
  const company = await repository.findCompany({ query }, companyId);
  if (!company) throw new CompanyError('NOT_FOUND');
  return company;
}

export async function create(input: CreateCompanyInput, actor: { userId: string; role: RoleCode }, correlationId: string) {
  if (!isGlobal(actor.role)) throw new CompanyError('FORBIDDEN');
  try {
    return await withTransaction(async (client) => {
      const id = await repository.insertCompany(client, input);
      await writeDomainAudit({ action: 'COMPANY_CREATED', actorUserId: actor.userId, correlationId, entityType: 'COMPANY', entityId: id, metadata: { status: 'ACTIVE' }, client });
      return (await repository.findCompany(client, id))!;
    });
  } catch (error: any) {
    if (error?.code === '23505') throw new CompanyError('CONFLICT');
    throw error;
  }
}

export async function patch(companyId: string, input: PatchCompanyInput, actor: { userId: string; role: RoleCode }, correlationId: string) {
  try {
    return await withTransaction(async (client) => {
      await verifySpecificAccess(actor.userId, actor.role, companyId, client);
      const current = await repository.lockCompany(client, companyId);
      if (!current) throw new CompanyError('NOT_FOUND');
      const updated = await repository.updateCompany(client, companyId, input);
      if (!updated) throw new CompanyError('STALE_VERSION');
      await writeDomainAudit({ action: 'COMPANY_UPDATED', actorUserId: actor.userId, correlationId, entityType: 'COMPANY', entityId: companyId, metadata: { status: current.status }, client });
      return (await repository.findCompany(client, companyId))!;
    });
  } catch (error: any) {
    if (error?.code === '23505') throw new CompanyError('CONFLICT');
    throw error;
  }
}

export async function deactivate(companyId: string, version: number, actor: { userId: string; role: RoleCode }, correlationId: string) {
  if (!isGlobal(actor.role)) throw new CompanyError('FORBIDDEN');
  return withTransaction(async (client) => {
    const current = await repository.lockCompany(client, companyId);
    if (!current) throw new CompanyError('NOT_FOUND');
    if (current.version !== version) throw new CompanyError('STALE_VERSION');
    if (current.status === 'ACTIVE') {
      const deactivatedEstablishmentCount = await repository.deactivateActiveEstablishments(client, companyId);
      await repository.deactivateCompany(client, companyId);
      await writeDomainAudit({ action: 'COMPANY_DEACTIVATED', actorUserId: actor.userId, correlationId, entityType: 'COMPANY', entityId: companyId, metadata: { status: 'INACTIVE', deactivatedEstablishmentCount }, client });
    }
    return (await repository.findCompany(client, companyId))!;
  });
}
