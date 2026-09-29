ALTER TABLE inspection_evidence
  ADD COLUMN bpm_item_id uuid REFERENCES bpm_template_items(id) ON DELETE RESTRICT;
CREATE INDEX inspection_evidence_item_idx
  ON inspection_evidence(inspection_id,bpm_item_id) WHERE bpm_item_id IS NOT NULL;
CREATE FUNCTION inspection_evidence_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.bpm_item_id IS DISTINCT FROM OLD.bpm_item_id THEN
    RAISE EXCEPTION 'evidence criterion link is immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.bpm_item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM inspections ins
    JOIN bpm_template_items item ON item.id=NEW.bpm_item_id
    WHERE ins.id=NEW.inspection_id
      AND item.template_version_id=ins.bpm_template_version_id
      AND item.item_kind='CRITERION'
      AND item.is_evaluable
  ) THEN RAISE EXCEPTION 'evidence item must be evaluable criterion in inspection template' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER inspection_evidence_item_guard
  BEFORE INSERT OR UPDATE OF bpm_item_id,inspection_id ON inspection_evidence
  FOR EACH ROW EXECUTE FUNCTION inspection_evidence_item_guard();
