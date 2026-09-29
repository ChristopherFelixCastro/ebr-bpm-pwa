/**
 * Recursive CTE `bpm_tree(id, path)` that orders a BPM template version depth-first:
 * section, then its subsections, groups and criteria, siblings by sort_order and id.
 * sort_order is relative to the parent, so a flat ORDER BY sort_order interleaves levels.
 * `versionExpression` is a SQL expression for the template version id (a parameter or subquery).
 */
export const bpmTreeOrderCte = (versionExpression: string) => `bpm_tree AS (
  SELECT root.id, ARRAY[lpad(root.sort_order::text, 10, '0') || ':' || root.id::text] AS path
  FROM bpm_template_items root WHERE root.template_version_id = ${versionExpression} AND root.parent_item_id IS NULL
  UNION ALL
  SELECT child.id, bpm_tree.path || (lpad(child.sort_order::text, 10, '0') || ':' || child.id::text)
  FROM bpm_template_items child JOIN bpm_tree ON child.parent_item_id = bpm_tree.id
)`;
