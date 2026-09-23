DROP TRIGGER IF EXISTS inspection_evidence_item_guard ON inspection_evidence;
DROP FUNCTION IF EXISTS inspection_evidence_item_guard();
DROP INDEX IF EXISTS inspection_evidence_item_idx;
ALTER TABLE inspection_evidence DROP COLUMN IF EXISTS bpm_item_id;
