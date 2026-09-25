import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { bpmTreeOrderCte } from '../../core/bpm/bpm-tree-order.js';
import { query, withTransaction } from '../../db/client.js';

// Runs against the migrated database in DATABASE_URL.
describe('BPM depth-first reading order', () => {
  it('walks section → subsection → group → criterion even when sort_order repeats across levels', async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
    const versionId = await withTransaction(async (client) => {
      const templateId = (await client.query<{ id: string }>('INSERT INTO bpm_templates(code,name) VALUES($1,$2) RETURNING id', [`ORDER_${suffix}`, `Order ${suffix}`])).rows[0].id;
      const version = (await client.query<{ id: string }>('INSERT INTO bpm_template_versions(template_id,version_number) VALUES($1,1) RETURNING id', [templateId])).rows[0].id;
      const add = async (kind: string, code: string, sortOrder: number, parentId: string | null) => (await client.query<{ id: string }>(`
        INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order,is_evaluable)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [version, parentId, kind, `Item ${code}`, code, sortOrder, kind === 'CRITERION'])).rows[0].id;
      // Inserted out of reading order on purpose; every level reuses sort_order 0 and 1.
      const s2 = await add('SECTION', '2', 1, null);
      const s1 = await add('SECTION', '1', 0, null);
      await add('CRITERION', '2.1', 0, s2);
      await add('CRITERION', '1.2', 1, s1);
      const ss11 = await add('SUBSECTION', '1.1', 0, s1);
      const g111 = await add('GROUP', '1.1.1', 0, ss11);
      await add('CRITERION', '1.1.1.2', 1, g111);
      await add('CRITERION', '1.1.1.1', 0, g111);
      await add('CRITERION', '1.1.2', 1, ss11);
      return version;
    });
    const rows = await query<{ code: string }>(`WITH RECURSIVE ${bpmTreeOrderCte('$1')}
      SELECT item.display_code AS code FROM bpm_template_items item JOIN bpm_tree ON bpm_tree.id=item.id ORDER BY bpm_tree.path`, [versionId]);
    expect(rows.rows.map((row) => row.code)).toEqual(['1', '1.1', '1.1.1', '1.1.1.1', '1.1.1.2', '1.1.2', '1.2', '2', '2.1']);
  });
});
