CREATE OR REPLACE FUNCTION inspection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_evaluator uuid; assignment_active boolean; case_current_status case_status;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspections are historical and cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT status INTO case_current_status FROM cases WHERE id=NEW.case_id;
    IF case_current_status <> 'ASSIGNED' THEN RAISE EXCEPTION 'inspection requires assigned case'; END IF;
    SELECT case_id,evaluator_user_id,is_active INTO assignment_case,assignment_evaluator,assignment_active FROM case_assignments WHERE id=NEW.case_assignment_id;
    IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_evaluator IS DISTINCT FROM NEW.evaluator_user_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'inspection assignment invalid'; END IF;
    IF NOT EXISTS(SELECT 1 FROM bpm_template_versions WHERE id=NEW.bpm_template_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection BPM version must be published'; END IF;
    IF NOT EXISTS(SELECT 1 FROM risk_rule_versions WHERE id=NEW.risk_rule_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection risk version must be published'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='SUBMITTED' THEN RAISE EXCEPTION 'submitted inspection is immutable'; END IF;
  IF NEW.case_id<>OLD.case_id OR NEW.case_assignment_id<>OLD.case_assignment_id OR NEW.evaluator_user_id<>OLD.evaluator_user_id OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id OR NEW.created_by_user_id<>OLD.created_by_user_id THEN RAISE EXCEPTION 'inspection context is immutable'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status='DRAFT' AND NEW.status='IN_PROGRESS') OR (OLD.status='IN_PROGRESS' AND NEW.status IN ('PENDING_SUBMISSION','SUBMITTED')) OR (OLD.status='PENDING_SUBMISSION' AND NEW.status='SUBMITTED')) THEN RAISE EXCEPTION 'invalid inspection transition'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('PENDING_SUBMISSION','SUBMITTED') AND EXISTS (
    SELECT 1
    FROM bpm_template_items item
    WHERE item.template_version_id=NEW.bpm_template_version_id
      AND item.item_kind='CRITERION'
      AND item.is_evaluable
      AND NOT EXISTS (
        SELECT 1 FROM inspection_bpm_responses response
        WHERE response.inspection_id=NEW.id AND response.bpm_item_id=item.id
      )
  ) THEN RAISE EXCEPTION 'all evaluable BPM items require responses'; END IF;
  RETURN NEW;
END $$;
