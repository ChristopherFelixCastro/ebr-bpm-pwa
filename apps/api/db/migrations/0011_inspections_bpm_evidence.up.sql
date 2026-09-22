CREATE TYPE inspection_status AS ENUM ('DRAFT','IN_PROGRESS','PENDING_SUBMISSION','SUBMITTED');
CREATE TYPE evidence_status AS ENUM ('PENDING_UPLOAD','UPLOADED','VALID','REJECTED','ARCHIVED');
CREATE TYPE inspection_operation_type AS ENUM ('UPSERT_BPM_RESPONSE','DELETE_BPM_RESPONSE','ADD_EVIDENCE','SOFT_DELETE_EVIDENCE','FINALIZE');
CREATE TYPE operation_processing_status AS ENUM ('APPLIED','CONFLICT','REJECTED');

CREATE TABLE inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  case_assignment_id uuid NOT NULL REFERENCES case_assignments(id) ON DELETE RESTRICT,
  evaluator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  bpm_template_version_id uuid NOT NULL REFERENCES bpm_template_versions(id) ON DELETE RESTRICT,
  risk_rule_version_id uuid NOT NULL REFERENCES risk_rule_versions(id) ON DELETE RESTRICT,
  status inspection_status NOT NULL DEFAULT 'DRAFT',
  started_at timestamptz,
  finalized_at timestamptz,
  submitted_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='DRAFT' AND started_at IS NULL AND finalized_at IS NULL AND submitted_at IS NULL)
      OR (status='IN_PROGRESS' AND started_at IS NOT NULL AND finalized_at IS NULL AND submitted_at IS NULL)
      OR (status='PENDING_SUBMISSION' AND started_at IS NOT NULL AND finalized_at IS NOT NULL AND submitted_at IS NULL)
      OR (status='SUBMITTED' AND started_at IS NOT NULL AND finalized_at IS NOT NULL AND submitted_at IS NOT NULL))
);
CREATE UNIQUE INDEX inspections_one_editable_case_idx ON inspections(case_id) WHERE status IN ('DRAFT','IN_PROGRESS','PENDING_SUBMISSION');
CREATE INDEX inspections_case_status_idx ON inspections(case_id,status,created_at DESC);
CREATE INDEX inspections_evaluator_status_idx ON inspections(evaluator_user_id,status,created_at DESC);

CREATE TABLE inspection_bpm_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  bpm_item_id uuid NOT NULL REFERENCES bpm_template_items(id) ON DELETE RESTRICT,
  response_value bpm_response_value NOT NULL,
  observations text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inspection_id,bpm_item_id)
);
CREATE INDEX inspection_bpm_responses_inspection_idx ON inspection_bpm_responses(inspection_id);

CREATE TABLE inspection_food_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  food_risk_subcategory_id uuid NOT NULL REFERENCES food_risk_subcategories(id) ON DELETE RESTRICT,
  category_code_snapshot varchar(120) NOT NULL,
  category_name_snapshot varchar(300) NOT NULL,
  subcategory_name_snapshot varchar(700) NOT NULL,
  microbiological_risk_snapshot microbiological_risk,
  risk_score_snapshot smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inspection_id,food_risk_subcategory_id),
  CHECK (btrim(category_code_snapshot)<>'' AND btrim(category_name_snapshot)<>'' AND btrim(subcategory_name_snapshot)<>''),
  CHECK ((microbiological_risk_snapshot IS NULL AND risk_score_snapshot IS NULL)
      OR (microbiological_risk_snapshot='LOW' AND risk_score_snapshot=1)
      OR (microbiological_risk_snapshot='MEDIUM' AND risk_score_snapshot=2)
      OR (microbiological_risk_snapshot='HIGH' AND risk_score_snapshot=3))
);

CREATE TABLE inspection_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  storage_path text NOT NULL,
  original_file_name varchar(300) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes bigint NOT NULL,
  status evidence_status NOT NULL DEFAULT 'PENDING_UPLOAD',
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at timestamptz,
  deleted_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(storage_path)<>'' AND storage_path !~* '^[a-z][a-z0-9+.-]*:'),
  CHECK (btrim(original_file_name)<>''),
  CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm')),
  CHECK ((deleted_at IS NULL AND deleted_by_user_id IS NULL) OR (deleted_at IS NOT NULL AND deleted_by_user_id IS NOT NULL))
);
CREATE INDEX inspection_evidence_active_idx ON inspection_evidence(inspection_id,created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE inspection_operations (
  operation_id uuid PRIMARY KEY,
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  operation_type inspection_operation_type NOT NULL,
  base_version integer NOT NULL CHECK (base_version > 0),
  resulting_version integer CHECK (resulting_version IS NULL OR resulting_version > 0),
  payload_sha256 char(64) NOT NULL,
  status operation_processing_status NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  conflict_reason text,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  applied_at timestamptz,
  CHECK (payload_sha256 = lower(payload_sha256) AND payload_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK ((status='APPLIED' AND resulting_version IS NOT NULL AND applied_at IS NOT NULL AND conflict_reason IS NULL)
      OR (status IN ('CONFLICT','REJECTED') AND resulting_version IS NULL AND applied_at IS NULL))
);
CREATE INDEX inspection_operations_inspection_idx ON inspection_operations(inspection_id,received_at DESC);

CREATE OR REPLACE FUNCTION inspection_is_editable(inspection_uuid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT status IN ('DRAFT','IN_PROGRESS') FROM inspections WHERE id=inspection_uuid
$$;

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
  IF NEW.status IN ('PENDING_SUBMISSION','SUBMITTED') AND NOT EXISTS (
    SELECT 1 FROM bpm_template_items i
    WHERE i.template_version_id=NEW.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable
      AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses r WHERE r.inspection_id=NEW.id AND r.bpm_item_id=i.id)
  ) THEN RAISE EXCEPTION 'all evaluable BPM items require responses'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_bpm_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inspection_template uuid; item_template uuid; item_kind_value bpm_item_kind; evaluable boolean; iid uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  IF NOT inspection_is_editable(iid) THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT bpm_template_version_id INTO inspection_template FROM inspections WHERE id=NEW.inspection_id;
    SELECT template_version_id,item_kind,is_evaluable INTO item_template,item_kind_value,evaluable FROM bpm_template_items WHERE id=NEW.bpm_item_id;
    IF item_template IS DISTINCT FROM inspection_template OR item_kind_value<>'CRITERION' OR evaluable IS DISTINCT FROM true THEN RAISE EXCEPTION 'BPM item does not belong to inspection template'; END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_food_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inspection_rule uuid; food_rule uuid; source_category_code varchar(120); source_category_name varchar(300); source_subcategory_name varchar(700); source_microbiological_risk microbiological_risk; source_risk_score smallint;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN RAISE EXCEPTION 'inspection food snapshots are immutable'; END IF;
  IF NOT inspection_is_editable(NEW.inspection_id) THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  SELECT risk_rule_version_id INTO inspection_rule FROM inspections WHERE id=NEW.inspection_id;
  SELECT c.risk_rule_version_id,c.code,c.name,s.name,s.microbiological_risk,s.risk_score INTO food_rule,source_category_code,source_category_name,source_subcategory_name,source_microbiological_risk,source_risk_score FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE s.id=NEW.food_risk_subcategory_id;
  IF food_rule IS DISTINCT FROM inspection_rule THEN RAISE EXCEPTION 'food subcategory does not belong to inspection risk version'; END IF;
  IF NEW.category_code_snapshot<>source_category_code OR NEW.category_name_snapshot<>source_category_name OR NEW.subcategory_name_snapshot<>source_subcategory_name OR NEW.microbiological_risk_snapshot IS DISTINCT FROM source_microbiological_risk OR NEW.risk_score_snapshot IS DISTINCT FROM source_risk_score THEN RAISE EXCEPTION 'food snapshot must match selected catalog row'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid; active_count integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspection evidence requires logical deletion'; END IF;
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  IF NOT inspection_is_editable(iid) THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF TG_OP='INSERT' OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    PERFORM 1 FROM inspections WHERE id=iid FOR UPDATE;
    SELECT count(*) INTO active_count FROM inspection_evidence WHERE inspection_id=iid AND deleted_at IS NULL;
    IF active_count >= 10 THEN RAISE EXCEPTION 'maximum active evidence reached'; END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_operation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN RAISE EXCEPTION 'inspection operations are immutable'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER inspections_guard BEFORE INSERT OR UPDATE OR DELETE ON inspections FOR EACH ROW EXECUTE FUNCTION inspection_guard();
CREATE TRIGGER inspections_version BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER inspection_bpm_responses_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_bpm_responses FOR EACH ROW EXECUTE FUNCTION inspection_bpm_response_guard();
CREATE TRIGGER inspection_bpm_responses_version BEFORE UPDATE ON inspection_bpm_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER inspection_food_snapshots_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_food_snapshots FOR EACH ROW EXECUTE FUNCTION inspection_food_snapshot_guard();
CREATE TRIGGER inspection_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_evidence FOR EACH ROW EXECUTE FUNCTION inspection_evidence_guard();
CREATE TRIGGER inspection_evidence_version BEFORE UPDATE ON inspection_evidence FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER inspection_operations_guard BEFORE UPDATE OR DELETE ON inspection_operations FOR EACH ROW EXECUTE FUNCTION inspection_operation_guard();
