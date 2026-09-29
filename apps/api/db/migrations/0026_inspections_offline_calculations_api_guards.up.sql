ALTER TABLE inspections
  ADD COLUMN content_revision integer NOT NULL DEFAULT 1 CHECK (content_revision > 0);

ALTER TYPE inspection_operation_type ADD VALUE IF NOT EXISTS 'UPSERT_RISK_FACTOR_SELECTION';
ALTER TYPE inspection_operation_type ADD VALUE IF NOT EXISTS 'ADD_FOOD_SNAPSHOT';

ALTER TABLE inspection_operations
  ADD COLUMN result_payload jsonb,
  ADD COLUMN conflict_current_version integer CHECK (conflict_current_version IS NULL OR conflict_current_version > 0),
  ADD COLUMN completed_at timestamptz DEFAULT clock_timestamp();

UPDATE inspection_operations SET completed_at=COALESCE(applied_at,received_at),conflict_current_version=CASE WHEN status='CONFLICT' THEN base_version ELSE NULL END;
ALTER TABLE inspection_operations ALTER COLUMN completed_at SET NOT NULL;
ALTER TABLE inspection_operations
  ADD CONSTRAINT inspection_operations_result_object CHECK (result_payload IS NULL OR jsonb_typeof(result_payload)='object'),
  ADD CONSTRAINT inspection_operations_completion CHECK (
    (status='APPLIED' AND completed_at IS NOT NULL AND conflict_current_version IS NULL)
    OR (status='CONFLICT' AND completed_at IS NOT NULL AND conflict_current_version IS NOT NULL)
    OR (status='REJECTED' AND completed_at IS NOT NULL AND conflict_current_version IS NULL)
  );

ALTER TABLE inspection_evidence
  ADD COLUMN validated_at timestamptz,
  ADD COLUMN validated_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN rejection_reason text,
  ADD COLUMN archived_at timestamptz;

ALTER TABLE inspection_evidence DROP CONSTRAINT IF EXISTS inspection_evidence_mime_type_check;
ALTER TABLE inspection_evidence ADD CONSTRAINT inspection_evidence_mime_type_check
  CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')) NOT VALID;
ALTER TABLE inspection_evidence ADD CONSTRAINT inspection_evidence_state_check CHECK (
  (status='PENDING_UPLOAD' AND validated_at IS NULL AND validated_by_user_id IS NULL AND rejection_reason IS NULL AND archived_at IS NULL AND deleted_at IS NULL AND deleted_by_user_id IS NULL)
  OR (status='UPLOADED' AND validated_at IS NULL AND validated_by_user_id IS NULL AND rejection_reason IS NULL AND archived_at IS NULL AND deleted_at IS NULL AND deleted_by_user_id IS NULL)
  OR (status='VALID' AND validated_at IS NOT NULL AND validated_by_user_id IS NOT NULL AND rejection_reason IS NULL AND archived_at IS NULL AND deleted_at IS NULL AND deleted_by_user_id IS NULL)
  OR (status='REJECTED' AND validated_at IS NOT NULL AND validated_by_user_id IS NOT NULL AND rejection_reason IS NOT NULL AND btrim(rejection_reason)<>'' AND archived_at IS NULL AND deleted_at IS NULL AND deleted_by_user_id IS NULL)
  OR (status='ARCHIVED' AND archived_at IS NOT NULL AND deleted_at IS NOT NULL AND deleted_by_user_id IS NOT NULL)
) NOT VALID;

ALTER TABLE inspection_calculations ADD COLUMN inspection_content_revision integer CHECK (inspection_content_revision IS NULL OR inspection_content_revision > 0);

CREATE OR REPLACE FUNCTION inspection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_evaluator uuid; assignment_active boolean; case_current_status case_status;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspections are historical and cannot be deleted' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT status INTO case_current_status FROM cases WHERE id=NEW.case_id FOR UPDATE;
    IF case_current_status<>'ASSIGNED' THEN RAISE EXCEPTION 'inspection requires assigned case' USING ERRCODE='23514'; END IF;
    SELECT case_id,evaluator_user_id,is_active INTO assignment_case,assignment_evaluator,assignment_active FROM case_assignments WHERE id=NEW.case_assignment_id FOR UPDATE;
    IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_evaluator IS DISTINCT FROM NEW.evaluator_user_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'inspection assignment invalid' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM bpm_template_versions WHERE id=NEW.bpm_template_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection BPM version must be published' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM risk_rule_versions WHERE id=NEW.risk_rule_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection risk version must be published' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='SUBMITTED' THEN RAISE EXCEPTION 'submitted inspection is immutable'; END IF;
  IF NEW.case_id<>OLD.case_id OR NEW.case_assignment_id<>OLD.case_assignment_id OR NEW.evaluator_user_id<>OLD.evaluator_user_id OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id OR NEW.created_by_user_id<>OLD.created_by_user_id THEN RAISE EXCEPTION 'inspection context is immutable' USING ERRCODE='55000'; END IF;
  IF NEW.content_revision<OLD.content_revision OR NEW.content_revision>OLD.content_revision+1 THEN RAISE EXCEPTION 'invalid inspection content revision' USING ERRCODE='23514'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status='DRAFT' AND NEW.status='IN_PROGRESS') OR
    (OLD.status='IN_PROGRESS' AND NEW.status='PENDING_SUBMISSION') OR
    (OLD.status='PENDING_SUBMISSION' AND NEW.status IN ('IN_PROGRESS','SUBMITTED'))
  ) THEN RAISE EXCEPTION 'invalid inspection transition' USING ERRCODE='23514'; END IF;
  IF OLD.status='PENDING_SUBMISSION' AND NEW.status='IN_PROGRESS' AND NEW.content_revision<>OLD.content_revision+1 THEN RAISE EXCEPTION 'unlock must increment content revision' USING ERRCODE='23514'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('PENDING_SUBMISSION','SUBMITTED') AND EXISTS (
    SELECT 1 FROM bpm_template_items item
    WHERE item.template_version_id=NEW.bpm_template_version_id AND item.item_kind='CRITERION' AND item.is_evaluable
      AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses response WHERE response.inspection_id=NEW.id AND response.bpm_item_id=item.id)
  ) THEN RAISE EXCEPTION 'all evaluable BPM items require responses'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_bpm_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; item_template uuid; item_kind_value bpm_item_kind; evaluable boolean; iid uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  SELECT * INTO ins FROM inspections WHERE id=iid FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN ('DRAFT','IN_PROGRESS') THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT template_version_id,item_kind,is_evaluable INTO item_template,item_kind_value,evaluable FROM bpm_template_items WHERE id=NEW.bpm_item_id;
    IF item_template IS DISTINCT FROM ins.bpm_template_version_id OR item_kind_value<>'CRITERION' OR evaluable IS DISTINCT FROM true THEN RAISE EXCEPTION 'BPM item does not belong to inspection template'; END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_factor_selection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; factor_rule uuid; option_factor uuid; iid uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  SELECT * INTO ins FROM inspections WHERE id=iid FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN ('DRAFT','IN_PROGRESS') THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT risk_rule_version_id INTO factor_rule FROM risk_factors WHERE id=NEW.risk_factor_id;
    SELECT risk_factor_id INTO option_factor FROM risk_factor_options WHERE id=NEW.risk_factor_option_id;
    IF factor_rule IS DISTINCT FROM ins.risk_rule_version_id OR option_factor IS DISTINCT FROM NEW.risk_factor_id THEN RAISE EXCEPTION 'risk factor selection does not belong to inspection rule' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_food_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; food_rule uuid; source_category_code varchar(120); source_category_name varchar(300); source_subcategory_name varchar(700); source_microbiological_risk microbiological_risk; source_risk_score smallint;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN RAISE EXCEPTION 'inspection food snapshots are immutable' USING ERRCODE='55000'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=NEW.inspection_id FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN ('DRAFT','IN_PROGRESS') THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  SELECT c.risk_rule_version_id,c.code,c.name,s.name,s.microbiological_risk,s.risk_score INTO food_rule,source_category_code,source_category_name,source_subcategory_name,source_microbiological_risk,source_risk_score FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE s.id=NEW.food_risk_subcategory_id;
  IF food_rule IS DISTINCT FROM ins.risk_rule_version_id THEN RAISE EXCEPTION 'food subcategory does not belong to inspection risk version'; END IF;
  IF NEW.category_code_snapshot<>source_category_code OR NEW.category_name_snapshot<>source_category_name OR NEW.subcategory_name_snapshot<>source_subcategory_name OR NEW.microbiological_risk_snapshot IS DISTINCT FROM source_microbiological_risk OR NEW.risk_score_snapshot IS DISTINCT FROM source_risk_score THEN RAISE EXCEPTION 'food snapshot must match selected catalog row' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_touch_content() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  UPDATE inspections SET content_revision=content_revision+1 WHERE id=iid;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_touch_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  UPDATE inspections SET updated_at=clock_timestamp() WHERE id=iid;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE TRIGGER inspection_bpm_responses_touch_content AFTER INSERT OR UPDATE OR DELETE ON inspection_bpm_responses FOR EACH ROW EXECUTE FUNCTION inspection_touch_content();
CREATE TRIGGER inspection_factor_selections_touch_content AFTER INSERT OR UPDATE OR DELETE ON inspection_risk_factor_selections FOR EACH ROW EXECUTE FUNCTION inspection_touch_content();
CREATE TRIGGER inspection_food_snapshots_touch_content AFTER INSERT ON inspection_food_snapshots FOR EACH ROW EXECUTE FUNCTION inspection_touch_content();

CREATE OR REPLACE FUNCTION inspection_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid; active_count integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspection evidence requires logical deletion' USING ERRCODE='55000'; END IF;
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  PERFORM 1 FROM inspections WHERE id=iid AND status IN ('DRAFT','IN_PROGRESS') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF TG_OP='INSERT' AND NEW.status='REJECTED' AND NEW.validated_at IS NULL THEN
    NEW.validated_at:=clock_timestamp(); NEW.validated_by_user_id:=NEW.uploaded_by_user_id; NEW.rejection_reason:='Legacy rejection';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.status=OLD.status THEN
      NEW.status:='ARCHIVED'; NEW.archived_at:=COALESCE(NEW.archived_at,NEW.deleted_at);
    END IF;
    IF OLD.status='ARCHIVED' THEN RAISE EXCEPTION 'archived evidence is immutable' USING ERRCODE='55000'; END IF;
    IF NEW.inspection_id<>OLD.inspection_id OR NEW.storage_path<>OLD.storage_path OR NEW.original_file_name<>OLD.original_file_name OR NEW.mime_type<>OLD.mime_type OR NEW.size_bytes<>OLD.size_bytes OR NEW.uploaded_by_user_id<>OLD.uploaded_by_user_id THEN RAISE EXCEPTION 'evidence identity is immutable' USING ERRCODE='55000'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status='PENDING_UPLOAD' AND NEW.status IN ('UPLOADED','ARCHIVED')) OR
      (OLD.status='UPLOADED' AND NEW.status IN ('VALID','REJECTED','ARCHIVED')) OR
      (OLD.status IN ('VALID','REJECTED') AND NEW.status='ARCHIVED')
    ) THEN RAISE EXCEPTION 'invalid evidence transition' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND OLD.status='ARCHIVED' AND NEW.status<>'ARCHIVED') THEN
    SELECT count(*)::integer INTO active_count FROM inspection_evidence WHERE inspection_id=iid AND status<>'ARCHIVED' AND deleted_at IS NULL;
    IF active_count>=10 THEN RAISE EXCEPTION 'maximum active evidence reached'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER inspection_evidence_touch_version AFTER INSERT OR UPDATE ON inspection_evidence FOR EACH ROW EXECUTE FUNCTION inspection_touch_version();

CREATE OR REPLACE FUNCTION case_assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status case_status; evaluator_status user_status; evaluator_role text; prior_evaluator uuid;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'case assignments are historical and cannot be deleted' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT status INTO current_status FROM cases WHERE id=NEW.case_id FOR UPDATE;
    IF current_status IS NULL OR current_status NOT IN('PENDING_ASSIGNMENT','ASSIGNED') THEN RAISE EXCEPTION 'case is not assignable' USING ERRCODE='23514'; END IF;
    SELECT u.status,r.code INTO evaluator_status,evaluator_role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=NEW.evaluator_user_id;
    IF evaluator_status IS NULL OR evaluator_status<>'APPROVED' OR evaluator_role<>'EVALUATOR' THEN RAISE EXCEPTION 'approved evaluator required' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.assigned_by_user_id) THEN RAISE EXCEPTION 'assigner not found' USING ERRCODE='23514'; END IF;
    IF NOT NEW.is_active OR NEW.unassigned_at IS NOT NULL OR NEW.unassigned_by_user_id IS NOT NULL THEN RAISE EXCEPTION 'assignments must start active' USING ERRCODE='23514'; END IF;
    IF EXISTS(SELECT 1 FROM case_assignments WHERE case_id=NEW.case_id AND is_active) THEN RAISE EXCEPTION 'case already has active assignment' USING ERRCODE='23514'; END IF;
    SELECT evaluator_user_id INTO prior_evaluator FROM case_assignments WHERE case_id=NEW.case_id ORDER BY assigned_at DESC,id DESC LIMIT 1;
    IF current_status='PENDING_ASSIGNMENT' AND prior_evaluator IS NOT NULL THEN RAISE EXCEPTION 'initial assignment already exists' USING ERRCODE='23514'; END IF;
    IF current_status='ASSIGNED' THEN
      IF prior_evaluator IS NULL THEN RAISE EXCEPTION 'reassignment requires prior assignment' USING ERRCODE='23514'; END IF;
      IF prior_evaluator=NEW.evaluator_user_id THEN RAISE EXCEPTION 'reassignment requires a different evaluator' USING ERRCODE='23514'; END IF;
      IF NEW.change_reason IS NULL OR btrim(NEW.change_reason)='' THEN RAISE EXCEPTION 'reassignment reason required' USING ERRCODE='23514'; END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT OLD.is_active THEN RAISE EXCEPTION 'inactive assignment is immutable' USING ERRCODE='55000'; END IF;
  IF NEW.is_active THEN RAISE EXCEPTION 'active assignment may only be closed once' USING ERRCODE='55000'; END IF;
  IF EXISTS(SELECT 1 FROM inspections WHERE case_assignment_id=OLD.id AND status IN ('DRAFT','IN_PROGRESS','PENDING_SUBMISSION')) THEN RAISE EXCEPTION 'inspection in progress blocks reassignment' USING ERRCODE='23514'; END IF;
  IF NEW.case_id IS DISTINCT FROM OLD.case_id OR NEW.evaluator_user_id IS DISTINCT FROM OLD.evaluator_user_id OR NEW.assigned_by_user_id IS DISTINCT FROM OLD.assigned_by_user_id OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN RAISE EXCEPTION 'assignment identity is immutable' USING ERRCODE='55000'; END IF;
  IF NEW.unassigned_at IS NULL OR NEW.unassigned_by_user_id IS NULL OR NEW.change_reason IS NULL OR btrim(NEW.change_reason)='' THEN RAISE EXCEPTION 'atomic reassignment reason and actor required' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.unassigned_by_user_id) THEN RAISE EXCEPTION 'unassigner not found' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION calculation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'calculations are historical and cannot be deleted' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'COMPLETED' OR NOT NEW.is_current OR NEW.inspection_content_revision IS NULL THEN RAISE EXCEPTION 'new calculation must be current, completed and revisioned' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status<>'COMPLETED' OR NOT OLD.is_current OR NEW.status<>'SUPERSEDED' OR NEW.is_current OR NEW.superseded_at IS NULL OR NEW.superseded_by_user_id IS NULL
    OR NEW.inspection_id<>OLD.inspection_id OR NEW.calculation_number<>OLD.calculation_number OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id
    OR NEW.bpm_numerator<>OLD.bpm_numerator OR NEW.bpm_denominator<>OLD.bpm_denominator OR NEW.bpm_percentage<>OLD.bpm_percentage OR NEW.product_risk_score<>OLD.product_risk_score
    OR NEW.establishment_risk_score<>OLD.establishment_risk_score OR NEW.total_risk_score<>OLD.total_risk_score OR NEW.frequency<>OLD.frequency OR NEW.frequency_range_id<>OLD.frequency_range_id
    OR NEW.inspection_content_revision IS DISTINCT FROM OLD.inspection_content_revision THEN RAISE EXCEPTION 'calculation history immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION assert_inspection_current_calculation(target_inspection uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; matches integer;
BEGIN
  SELECT * INTO ins FROM inspections WHERE id=target_inspection;
  IF NOT FOUND OR ins.status NOT IN ('PENDING_SUBMISSION','SUBMITTED') THEN RETURN; END IF;
  SELECT count(*)::integer INTO matches FROM inspection_calculations c
  WHERE c.inspection_id=ins.id AND c.status='COMPLETED' AND c.is_current
    AND c.inspection_content_revision=ins.content_revision
    AND c.bpm_template_version_id=ins.bpm_template_version_id
    AND c.risk_rule_version_id=ins.risk_rule_version_id;
  IF matches<>1 THEN RAISE EXCEPTION 'pending or submitted inspection requires one current calculation' USING ERRCODE='23514'; END IF;
END $$;

CREATE OR REPLACE FUNCTION inspection_calculation_integrity_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='inspections' THEN PERFORM assert_inspection_current_calculation(CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END);
  ELSE
    IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM assert_inspection_current_calculation(OLD.inspection_id); END IF;
    IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.inspection_id IS DISTINCT FROM OLD.inspection_id) THEN PERFORM assert_inspection_current_calculation(NEW.inspection_id); END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER inspections_current_calculation_integrity AFTER INSERT OR UPDATE OR DELETE ON inspections DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION inspection_calculation_integrity_trigger();
CREATE CONSTRAINT TRIGGER calculations_inspection_integrity AFTER INSERT OR UPDATE OR DELETE ON inspection_calculations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION inspection_calculation_integrity_trigger();

CREATE OR REPLACE FUNCTION recalculate_inspection(p_inspection_id uuid,p_calculated_by_user_id uuid,p_reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  ins inspections%ROWTYPE; product_score numeric(4,2); establishment_score numeric(8,4); total_score numeric(10,4);
  numerator numeric(12,4); denominator integer; factor_count integer; factor_codes integer; weights numeric(10,4);
  range_row inspection_frequency_ranges%ROWTYPE; range_count integer; next_number integer; calc_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_calculated_by_user_id) THEN RAISE EXCEPTION 'calculation actor not found' USING ERRCODE='23514'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=p_inspection_id FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN ('PENDING_SUBMISSION','SUBMITTED') THEN RAISE EXCEPTION 'calculation requires pending or submitted inspection' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM bpm_template_items i WHERE i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses r WHERE r.inspection_id=ins.id AND r.bpm_item_id=i.id)) THEN RAISE EXCEPTION 'all evaluable BPM items require responses' USING ERRCODE='23514'; END IF;
  SELECT count(*),count(*) FILTER(WHERE f.code IN ('VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING')),coalesce(sum(f.weight),0)
    INTO factor_count,factor_codes,weights
  FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id AND o.risk_factor_id=f.id
  WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id;
  IF factor_count<>6 OR factor_codes<>6 OR weights<>1.0000 THEN RAISE EXCEPTION 'six official risk factors with total weight 1 required' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM inspection_food_snapshots WHERE inspection_id=ins.id) THEN RAISE EXCEPTION 'food snapshot required' USING ERRCODE='23514'; END IF;
  SELECT max(risk_score_snapshot)::numeric INTO product_score FROM inspection_food_snapshots WHERE inspection_id=ins.id AND risk_score_snapshot IS NOT NULL;
  IF product_score IS NULL THEN RAISE EXCEPTION 'NO_APPLICABLE_FOOD_RISK' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(CASE r.response_value WHEN 'C' THEN 1 WHEN 'CP' THEN .5 WHEN 'IT' THEN 0 ELSE 0 END),0),count(*) FILTER(WHERE r.response_value<>'NA')
    INTO numerator,denominator
  FROM bpm_template_items i JOIN inspection_bpm_responses r ON r.bpm_item_id=i.id AND r.inspection_id=ins.id
  WHERE i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable;
  IF denominator=0 THEN RAISE EXCEPTION 'NO_APPLICABLE_BPM_RESPONSES' USING ERRCODE='23514'; END IF;
  SELECT sum(o.score*f.weight) INTO establishment_score FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id AND o.risk_factor_id=f.id WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id;
  total_score:=product_score*establishment_score;
  SELECT count(*) INTO range_count FROM inspection_frequency_ranges fr WHERE fr.risk_rule_version_id=ins.risk_rule_version_id AND (total_score>fr.lower_bound OR (fr.lower_inclusive AND total_score=fr.lower_bound)) AND (fr.upper_bound IS NULL OR total_score<fr.upper_bound OR (fr.upper_inclusive AND total_score=fr.upper_bound));
  IF range_count<>1 THEN RAISE EXCEPTION 'NO_FREQUENCY_RANGE' USING ERRCODE='23514'; END IF;
  SELECT * INTO range_row FROM inspection_frequency_ranges fr WHERE fr.risk_rule_version_id=ins.risk_rule_version_id AND (total_score>fr.lower_bound OR (fr.lower_inclusive AND total_score=fr.lower_bound)) AND (fr.upper_bound IS NULL OR total_score<fr.upper_bound OR (fr.upper_inclusive AND total_score=fr.upper_bound));
  UPDATE inspection_calculations SET status='SUPERSEDED',is_current=false,superseded_at=clock_timestamp(),superseded_by_user_id=p_calculated_by_user_id WHERE inspection_id=ins.id AND is_current;
  SELECT coalesce(max(calculation_number),0)+1 INTO next_number FROM inspection_calculations WHERE inspection_id=ins.id;
  INSERT INTO inspection_calculations(inspection_id,calculation_number,bpm_template_version_id,risk_rule_version_id,inspection_content_revision,bpm_numerator,bpm_denominator,bpm_percentage,product_risk_score,establishment_risk_score,total_risk_score,frequency,frequency_range_id,calculation_reason,calculated_by_user_id,calculated_at)
    VALUES(ins.id,next_number,ins.bpm_template_version_id,ins.risk_rule_version_id,ins.content_revision,numerator,denominator,numerator/denominator*100,product_score,establishment_score,total_score,range_row.frequency,range_row.id,NULLIF(btrim(p_reason),''),p_calculated_by_user_id,clock_timestamp()) RETURNING id INTO calc_id;
  INSERT INTO inspection_calculation_bpm_snapshots(calculation_id,bpm_item_id,display_code_snapshot,response_value,response_score,is_applicable)
    SELECT calc_id,r.bpm_item_id,i.display_code,r.response_value,CASE r.response_value WHEN 'C' THEN 1 WHEN 'CP' THEN .5 WHEN 'IT' THEN 0 ELSE NULL END,r.response_value<>'NA' FROM inspection_bpm_responses r JOIN bpm_template_items i ON i.id=r.bpm_item_id WHERE r.inspection_id=ins.id AND i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable;
  INSERT INTO inspection_calculation_factor_snapshots(calculation_id,risk_factor_id,factor_code_snapshot,factor_name_snapshot,weight_snapshot,risk_factor_option_id,option_code_snapshot,option_label_snapshot,selected_score_snapshot,weighted_contribution,sort_order_snapshot)
    SELECT calc_id,f.id,f.code,f.name,f.weight,o.id,o.code,o.label,o.score,o.score*f.weight,f.sort_order FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id AND o.risk_factor_id=f.id WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id;
  INSERT INTO inspection_calculation_food_snapshots(calculation_id,inspection_food_snapshot_id,food_risk_subcategory_id,category_code_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot,is_applicable)
    SELECT calc_id,x.id,x.food_risk_subcategory_id,x.category_code_snapshot,x.subcategory_name_snapshot,x.microbiological_risk_snapshot,x.risk_score_snapshot,x.risk_score_snapshot IS NOT NULL FROM inspection_food_snapshots x WHERE x.inspection_id=ins.id;
  INSERT INTO inspection_calculation_frequency_snapshots(calculation_id,frequency_range_id,lower_bound_snapshot,upper_bound_snapshot,lower_inclusive_snapshot,upper_inclusive_snapshot,frequency,label_snapshot)
    VALUES(calc_id,range_row.id,range_row.lower_bound,range_row.upper_bound,range_row.lower_inclusive,range_row.upper_inclusive,range_row.frequency,range_row.label);
  RETURN calc_id;
END $$;
