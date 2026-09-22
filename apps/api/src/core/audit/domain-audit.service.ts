import type { PoolClient } from 'pg';
import { query } from '../../db/client.js';

export async function writeDomainAudit(input: {
  action: string;
  actorUserId: string;
  correlationId: string;
  entityType: string;
  entityId: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  metadata?: Record<string, string | number | boolean | null>;
  client?: PoolClient;
}) {
  const run = input.client ? input.client.query.bind(input.client) : query;
  await run(
    `INSERT INTO audit_events(actor_user_id,actor_type,correlation_id,action,entity_type,entity_id,outcome,source,metadata)
     VALUES($1,'USER',$2,$3,$4,$5,$6,'HTTP',$7::jsonb)`,
    [input.actorUserId, input.correlationId, input.action, input.entityType, input.entityId, input.outcome ?? 'SUCCESS', JSON.stringify(input.metadata ?? {})],
  );
}
