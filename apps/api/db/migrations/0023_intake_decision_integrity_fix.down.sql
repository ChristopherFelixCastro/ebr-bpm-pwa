DROP TRIGGER IF EXISTS cases_intake_decision_transition_guard ON cases;
DROP FUNCTION IF EXISTS intake_case_decision_transition_guard();

CREATE OR REPLACE FUNCTION intake_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_origin case_origin; current_origin case_origin; current_status case_status; has_assignment boolean;
BEGIN
  expected_origin := CASE TG_TABLE_NAME WHEN 'institutional_program_cases' THEN 'INSTITUTIONAL_PROGRAM'::case_origin WHEN 'health_alerts' THEN 'HEALTH_ALERT'::case_origin ELSE 'COMPLAINT'::case_origin END;
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'intake sources are historical and cannot be deleted' USING ERRCODE='55000'; END IF;
  SELECT origin,status INTO current_origin,current_status FROM cases WHERE id=NEW.case_id FOR UPDATE;
  IF current_origin IS NULL OR current_origin<>expected_origin THEN RAISE EXCEPTION 'case origin source mismatch' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' THEN
    IF TG_TABLE_NAME='health_alerts' THEN NEW.alert_number:=btrim(NEW.alert_number); END IF;
    RETURN NEW;
  END IF;
  IF NEW.case_id<>OLD.case_id THEN RAISE EXCEPTION 'source case is immutable' USING ERRCODE='55000'; END IF;
  IF TG_TABLE_NAME='institutional_program_cases' THEN
    SELECT EXISTS(SELECT 1 FROM case_assignments WHERE case_id=NEW.case_id AND is_active) INTO has_assignment;
    IF current_status<>'PENDING_ASSIGNMENT' OR has_assignment THEN RAISE EXCEPTION 'institutional case already assigned' USING ERRCODE='55000'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.decision<>'PENDING' THEN RAISE EXCEPTION 'decision is final' USING ERRCODE='55000'; END IF;
  IF TG_TABLE_NAME='health_alerts' THEN NEW.alert_number:=btrim(NEW.alert_number); END IF;
  IF NEW.decision=OLD.decision THEN RETURN NEW; END IF;
  IF NEW.decision='PENDING' THEN RAISE EXCEPTION 'decision cannot return to pending' USING ERRCODE='23514'; END IF;
  IF current_status<>'PENDING_REVIEW' THEN RAISE EXCEPTION 'case is not pending review' USING ERRCODE='55000'; END IF;
  IF NEW.decided_at IS NULL OR NEW.decided_by_user_id IS NULL THEN RAISE EXCEPTION 'decision actor and timestamp required' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='health_alerts' THEN
    IF NEW.alert_date<>OLD.alert_date OR NEW.product_description<>OLD.product_description OR NEW.description<>OLD.description OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id THEN RAISE EXCEPTION 'alert content cannot change with decision' USING ERRCODE='23514'; END IF;
  ELSE
    IF NEW.complaint_type<>OLD.complaint_type OR NEW.received_at<>OLD.received_at OR NEW.description<>OLD.description OR NEW.complainant_data IS DISTINCT FROM OLD.complainant_data OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id THEN RAISE EXCEPTION 'complaint content cannot change with decision' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
