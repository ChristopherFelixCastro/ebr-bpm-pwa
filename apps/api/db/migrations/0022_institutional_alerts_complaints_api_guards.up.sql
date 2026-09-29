ALTER TABLE institutional_program_cases
  ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE health_alerts
  ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE complaints
  ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN decision_reason text,
  ADD COLUMN referral_destination text,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION complaint_data_is_valid(payload jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF payload IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(payload)<>'object' OR (payload-ARRAY['fullName','phone','email','preferredContactMethod'])<>'{}'::jsonb THEN RETURN false; END IF;
  IF NOT(payload?'preferredContactMethod') OR jsonb_typeof(payload->'preferredContactMethod')<>'string' OR payload->>'preferredContactMethod' NOT IN('PHONE','EMAIL','NONE') THEN RETURN false; END IF;
  IF payload?'fullName' AND (jsonb_typeof(payload->'fullName')<>'string' OR length(btrim(payload->>'fullName')) NOT BETWEEN 1 AND 200) THEN RETURN false; END IF;
  IF payload?'phone' AND (jsonb_typeof(payload->'phone')<>'string' OR length(btrim(payload->>'phone')) NOT BETWEEN 1 AND 40) THEN RETURN false; END IF;
  IF payload?'email' AND (jsonb_typeof(payload->'email')<>'string' OR length(payload->>'email')>320 OR payload->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RETURN false; END IF;
  IF payload->>'preferredContactMethod'='PHONE' AND NOT(payload?'phone') THEN RETURN false; END IF;
  IF payload->>'preferredContactMethod'='EMAIL' AND NOT(payload?'email') THEN RETURN false; END IF;
  RETURN true;
END $$;
ALTER TABLE complaints ADD CONSTRAINT complaints_complainant_data_allowlist CHECK(complaint_data_is_valid(complainant_data));

ALTER TABLE health_alerts DROP CONSTRAINT IF EXISTS health_alerts_check1;
ALTER TABLE health_alerts ADD CONSTRAINT health_alerts_alert_number_not_blank CHECK(btrim(alert_number)<>'');
ALTER TABLE health_alerts ADD CONSTRAINT health_alerts_decision_coherent CHECK (
  (decision='PENDING' AND decided_at IS NULL AND decided_by_user_id IS NULL AND decision_reason IS NULL) OR
  (decision='PROCEEDS' AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL) OR
  (decision='NOT_PROCEEDS' AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL AND decision_reason IS NOT NULL AND btrim(decision_reason)<>'')
);
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_check1;
ALTER TABLE complaints ADD CONSTRAINT complaints_decision_coherent CHECK (
  (decision='PENDING' AND decided_at IS NULL AND decided_by_user_id IS NULL AND decision_reason IS NULL AND referral_reason IS NULL AND referral_destination IS NULL) OR
  (decision='PROCEEDS' AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL AND referral_reason IS NULL AND referral_destination IS NULL) OR
  (decision='NOT_PROCEEDS' AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL AND decision_reason IS NOT NULL AND btrim(decision_reason)<>'' AND referral_reason IS NULL AND referral_destination IS NULL) OR
  (decision='REFERRED' AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL AND decision_reason IS NULL AND referral_reason IS NOT NULL AND btrim(referral_reason)<>'' AND referral_destination IS NOT NULL AND btrim(referral_destination)<>'')
);

CREATE UNIQUE INDEX health_alerts_number_normalized_unique ON health_alerts(lower(btrim(alert_number)));

CREATE OR REPLACE FUNCTION intake_case_organization_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE company_state organization_status; establishment_state organization_status; actual_company uuid;
BEGIN
  IF NEW.origin NOT IN('INSTITUTIONAL_PROGRAM','HEALTH_ALERT','COMPLAINT') THEN RETURN NEW; END IF;
  IF NEW.establishment_id IS NOT NULL AND NEW.company_id IS NULL THEN RAISE EXCEPTION 'establishment requires company' USING ERRCODE='23514'; END IF;
  IF NEW.company_id IS NOT NULL THEN
    SELECT status INTO company_state FROM companies WHERE id=NEW.company_id FOR SHARE;
    IF company_state IS NULL THEN RAISE EXCEPTION 'company not found' USING ERRCODE='23514'; END IF;
    IF company_state<>'ACTIVE' THEN RAISE EXCEPTION 'active company required' USING ERRCODE='23514'; END IF;
  END IF;
  IF NEW.establishment_id IS NOT NULL THEN
    SELECT status,company_id INTO establishment_state,actual_company FROM establishments WHERE id=NEW.establishment_id FOR SHARE;
    IF establishment_state IS NULL THEN RAISE EXCEPTION 'establishment not found' USING ERRCODE='23514'; END IF;
    IF actual_company<>NEW.company_id THEN RAISE EXCEPTION 'establishment company mismatch' USING ERRCODE='23514'; END IF;
    IF establishment_state<>'ACTIVE' THEN RAISE EXCEPTION 'active establishment required' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='INSERT' AND (
    (NEW.origin='INSTITUTIONAL_PROGRAM' AND (NEW.status<>'PENDING_ASSIGNMENT' OR NEW.priority<>'MEDIUM')) OR
    (NEW.origin='HEALTH_ALERT' AND (NEW.status<>'PENDING_REVIEW' OR NEW.priority<>'HIGH')) OR
    (NEW.origin='COMPLAINT' AND (NEW.status<>'PENDING_REVIEW' OR NEW.priority<>'MEDIUM'))
  ) THEN RAISE EXCEPTION 'invalid intake case initial state or priority' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cases_intake_organization_guard BEFORE INSERT OR UPDATE OF origin,company_id,establishment_id ON cases
FOR EACH ROW EXECUTE FUNCTION intake_case_organization_guard();

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
CREATE TRIGGER institutional_program_cases_guard BEFORE INSERT OR UPDATE OR DELETE ON institutional_program_cases FOR EACH ROW EXECUTE FUNCTION intake_source_guard();
CREATE TRIGGER health_alerts_guard BEFORE INSERT OR UPDATE OR DELETE ON health_alerts FOR EACH ROW EXECUTE FUNCTION intake_source_guard();
CREATE TRIGGER complaints_guard BEFORE INSERT OR UPDATE OR DELETE ON complaints FOR EACH ROW EXECUTE FUNCTION intake_source_guard();

DROP TRIGGER IF EXISTS health_alerts_case_sync ON health_alerts;
DROP TRIGGER IF EXISTS complaints_case_sync ON complaints;
CREATE OR REPLACE FUNCTION sync_case_from_health_alert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.decision IS DISTINCT FROM OLD.decision THEN
    IF NEW.decision='PROCEEDS' THEN UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=NEW.case_id AND status='PENDING_REVIEW';
    ELSIF NEW.decision='NOT_PROCEEDS' THEN UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason=NEW.decision_reason WHERE id=NEW.case_id AND status='PENDING_REVIEW'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION sync_case_from_complaint() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.decision IS DISTINCT FROM OLD.decision THEN
    IF NEW.decision='PROCEEDS' THEN UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=NEW.case_id AND status='PENDING_REVIEW';
    ELSIF NEW.decision='NOT_PROCEEDS' THEN UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason=NEW.decision_reason WHERE id=NEW.case_id AND status='PENDING_REVIEW';
    ELSIF NEW.decision='REFERRED' THEN UPDATE cases SET status='REFERRED',closed_at=clock_timestamp(),closed_reason=NEW.referral_reason WHERE id=NEW.case_id AND status='PENDING_REVIEW'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER health_alerts_case_sync AFTER UPDATE ON health_alerts FOR EACH ROW EXECUTE FUNCTION sync_case_from_health_alert();
CREATE TRIGGER complaints_case_sync AFTER UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION sync_case_from_complaint();

CREATE TRIGGER institutional_program_cases_version BEFORE UPDATE ON institutional_program_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER health_alerts_version BEFORE UPDATE ON health_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER complaints_version BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
