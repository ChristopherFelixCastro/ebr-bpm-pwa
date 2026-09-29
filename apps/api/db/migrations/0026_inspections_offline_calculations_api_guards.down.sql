DROP TRIGGER IF EXISTS calculations_inspection_integrity ON inspection_calculations;
DROP TRIGGER IF EXISTS inspections_current_calculation_integrity ON inspections;
DROP TRIGGER IF EXISTS inspection_evidence_touch_version ON inspection_evidence;
DROP TRIGGER IF EXISTS inspection_food_snapshots_touch_content ON inspection_food_snapshots;
DROP TRIGGER IF EXISTS inspection_factor_selections_touch_content ON inspection_risk_factor_selections;
DROP TRIGGER IF EXISTS inspection_bpm_responses_touch_content ON inspection_bpm_responses;
DROP FUNCTION IF EXISTS inspection_calculation_integrity_trigger();
DROP FUNCTION IF EXISTS assert_inspection_current_calculation(uuid);
DROP FUNCTION IF EXISTS inspection_touch_version();
DROP FUNCTION IF EXISTS inspection_touch_content();
ALTER TABLE inspection_calculations DROP COLUMN IF EXISTS inspection_content_revision;
ALTER TABLE inspection_evidence DROP CONSTRAINT IF EXISTS inspection_evidence_state_check;
ALTER TABLE inspection_evidence DROP CONSTRAINT IF EXISTS inspection_evidence_mime_type_check;
ALTER TABLE inspection_evidence ADD CONSTRAINT inspection_evidence_mime_type_check CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm'));
ALTER TABLE inspection_evidence DROP COLUMN IF EXISTS archived_at,DROP COLUMN IF EXISTS rejection_reason,DROP COLUMN IF EXISTS validated_by_user_id,DROP COLUMN IF EXISTS validated_at;
ALTER TABLE inspection_operations DROP CONSTRAINT IF EXISTS inspection_operations_completion,DROP CONSTRAINT IF EXISTS inspection_operations_result_object,DROP COLUMN IF EXISTS completed_at,DROP COLUMN IF EXISTS conflict_current_version,DROP COLUMN IF EXISTS result_payload;
ALTER TABLE inspections DROP COLUMN IF EXISTS content_revision;

CREATE OR REPLACE FUNCTION inspection_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid; active_count integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspection evidence requires logical deletion'; END IF;
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  IF NOT inspection_is_editable(iid) THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF TG_OP='INSERT' OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
    PERFORM 1 FROM inspections WHERE id=iid FOR UPDATE;
    SELECT count(*) INTO active_count FROM inspection_evidence WHERE inspection_id=iid AND deleted_at IS NULL;
    IF active_count>=10 THEN RAISE EXCEPTION 'maximum active evidence reached'; END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_evaluator uuid; assignment_active boolean; case_current_status case_status;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspections are historical and cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT status INTO case_current_status FROM cases WHERE id=NEW.case_id;
    IF case_current_status<>'ASSIGNED' THEN RAISE EXCEPTION 'inspection requires assigned case'; END IF;
    SELECT case_id,evaluator_user_id,is_active INTO assignment_case,assignment_evaluator,assignment_active FROM case_assignments WHERE id=NEW.case_assignment_id;
    IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_evaluator IS DISTINCT FROM NEW.evaluator_user_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'inspection assignment invalid'; END IF;
    IF NOT EXISTS(SELECT 1 FROM bpm_template_versions WHERE id=NEW.bpm_template_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection BPM version must be published'; END IF;
    IF NOT EXISTS(SELECT 1 FROM risk_rule_versions WHERE id=NEW.risk_rule_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection risk version must be published'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='SUBMITTED' THEN RAISE EXCEPTION 'submitted inspection is immutable'; END IF;
  IF NEW.case_id<>OLD.case_id OR NEW.case_assignment_id<>OLD.case_assignment_id OR NEW.evaluator_user_id<>OLD.evaluator_user_id OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id OR NEW.created_by_user_id<>OLD.created_by_user_id THEN RAISE EXCEPTION 'inspection context is immutable'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status='DRAFT' AND NEW.status='IN_PROGRESS') OR (OLD.status='IN_PROGRESS' AND NEW.status IN ('PENDING_SUBMISSION','SUBMITTED')) OR (OLD.status='PENDING_SUBMISSION' AND NEW.status='SUBMITTED')) THEN RAISE EXCEPTION 'invalid inspection transition'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('PENDING_SUBMISSION','SUBMITTED') AND EXISTS(SELECT 1 FROM bpm_template_items item WHERE item.template_version_id=NEW.bpm_template_version_id AND item.item_kind='CRITERION' AND item.is_evaluable AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses response WHERE response.inspection_id=NEW.id AND response.bpm_item_id=item.id)) THEN RAISE EXCEPTION 'all evaluable BPM items require responses'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION calculation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'calculations are historical and cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN IF NEW.status<>'COMPLETED' OR NOT NEW.is_current THEN RAISE EXCEPTION 'new calculation must be current and completed'; END IF; RETURN NEW; END IF;
  IF OLD.status<>'COMPLETED' OR NOT OLD.is_current OR NEW.status<>'SUPERSEDED' OR NEW.is_current OR NEW.superseded_at IS NULL OR NEW.superseded_by_user_id IS NULL OR NEW.inspection_id<>OLD.inspection_id OR NEW.calculation_number<>OLD.calculation_number OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id OR NEW.bpm_numerator<>OLD.bpm_numerator OR NEW.bpm_denominator<>OLD.bpm_denominator OR NEW.bpm_percentage<>OLD.bpm_percentage OR NEW.product_risk_score<>OLD.product_risk_score OR NEW.establishment_risk_score<>OLD.establishment_risk_score OR NEW.total_risk_score<>OLD.total_risk_score OR NEW.frequency<>OLD.frequency OR NEW.frequency_range_id<>OLD.frequency_range_id THEN RAISE EXCEPTION 'calculation history immutable'; END IF;
  RETURN NEW;
END $$;

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
  IF NEW.case_id IS DISTINCT FROM OLD.case_id OR NEW.evaluator_user_id IS DISTINCT FROM OLD.evaluator_user_id OR NEW.assigned_by_user_id IS DISTINCT FROM OLD.assigned_by_user_id OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN RAISE EXCEPTION 'assignment identity is immutable' USING ERRCODE='55000'; END IF;
  IF NEW.unassigned_at IS NULL OR NEW.unassigned_by_user_id IS NULL OR NEW.change_reason IS NULL OR btrim(NEW.change_reason)='' THEN RAISE EXCEPTION 'atomic reassignment reason and actor required' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.unassigned_by_user_id) THEN RAISE EXCEPTION 'unassigner not found' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION recalculate_inspection(p_inspection_id uuid,p_calculated_by_user_id uuid,p_reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; product_score numeric(4,2); establishment_score numeric(8,4); total_score numeric(10,4); numerator numeric(12,4); denominator integer; range_row inspection_frequency_ranges%ROWTYPE; next_number integer; calc_id uuid;
BEGIN
  SELECT * INTO ins FROM inspections WHERE id=p_inspection_id FOR UPDATE;
  IF NOT FOUND OR ins.status<>'SUBMITTED' THEN RAISE EXCEPTION 'calculation requires submitted inspection'; END IF;
  IF EXISTS(SELECT 1 FROM bpm_template_items i WHERE i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses r WHERE r.inspection_id=ins.id AND r.bpm_item_id=i.id)) THEN RAISE EXCEPTION 'all evaluable BPM items require responses'; END IF;
  IF (SELECT count(*) FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id)<>6 THEN RAISE EXCEPTION 'all six risk factors require selections'; END IF;
  SELECT max(risk_score_snapshot)::numeric INTO product_score FROM inspection_food_snapshots WHERE inspection_id=ins.id AND risk_score_snapshot IS NOT NULL;
  IF product_score IS NULL THEN RAISE EXCEPTION 'no applicable food risk snapshot'; END IF;
  SELECT coalesce(sum(CASE r.response_value WHEN 'C' THEN 1 WHEN 'CP' THEN .5 ELSE 0 END),0),count(*) FILTER(WHERE r.response_value<>'NA') INTO numerator,denominator FROM inspection_bpm_responses r WHERE r.inspection_id=ins.id;
  IF denominator=0 THEN RAISE EXCEPTION 'no applicable BPM responses'; END IF;
  SELECT sum(o.score*f.weight) INTO establishment_score FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id WHERE s.inspection_id=ins.id;
  total_score:=product_score*establishment_score;
  SELECT * INTO range_row FROM inspection_frequency_ranges fr WHERE fr.risk_rule_version_id=ins.risk_rule_version_id AND (total_score>fr.lower_bound OR (fr.lower_inclusive AND total_score=fr.lower_bound)) AND (fr.upper_bound IS NULL OR total_score<fr.upper_bound OR (fr.upper_inclusive AND total_score=fr.upper_bound));
  IF NOT FOUND THEN RAISE EXCEPTION 'no frequency range for total risk'; END IF;
  UPDATE inspection_calculations SET status='SUPERSEDED',is_current=false,superseded_at=clock_timestamp(),superseded_by_user_id=p_calculated_by_user_id WHERE inspection_id=ins.id AND is_current;
  SELECT coalesce(max(calculation_number),0)+1 INTO next_number FROM inspection_calculations WHERE inspection_id=ins.id;
  INSERT INTO inspection_calculations(inspection_id,calculation_number,bpm_template_version_id,risk_rule_version_id,bpm_numerator,bpm_denominator,bpm_percentage,product_risk_score,establishment_risk_score,total_risk_score,frequency,frequency_range_id,calculation_reason,calculated_by_user_id) VALUES(ins.id,next_number,ins.bpm_template_version_id,ins.risk_rule_version_id,numerator,denominator,numerator/denominator*100,product_score,establishment_score,total_score,range_row.frequency,range_row.id,p_reason,p_calculated_by_user_id) RETURNING id INTO calc_id;
  INSERT INTO inspection_calculation_bpm_snapshots(calculation_id,bpm_item_id,display_code_snapshot,response_value,response_score,is_applicable) SELECT calc_id,r.bpm_item_id,i.display_code,r.response_value,CASE r.response_value WHEN 'C' THEN 1 WHEN 'CP' THEN .5 WHEN 'IT' THEN 0 ELSE NULL END,r.response_value<>'NA' FROM inspection_bpm_responses r JOIN bpm_template_items i ON i.id=r.bpm_item_id WHERE r.inspection_id=ins.id;
  INSERT INTO inspection_calculation_factor_snapshots(calculation_id,risk_factor_id,factor_code_snapshot,factor_name_snapshot,weight_snapshot,risk_factor_option_id,option_code_snapshot,option_label_snapshot,selected_score_snapshot,weighted_contribution,sort_order_snapshot) SELECT calc_id,f.id,f.code,f.name,f.weight,o.id,o.code,o.label,o.score,o.score*f.weight,f.sort_order FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id WHERE s.inspection_id=ins.id;
  INSERT INTO inspection_calculation_food_snapshots(calculation_id,inspection_food_snapshot_id,food_risk_subcategory_id,category_code_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot,is_applicable) SELECT calc_id,x.id,x.food_risk_subcategory_id,x.category_code_snapshot,x.subcategory_name_snapshot,x.microbiological_risk_snapshot,x.risk_score_snapshot,x.risk_score_snapshot IS NOT NULL FROM inspection_food_snapshots x WHERE x.inspection_id=ins.id;
  INSERT INTO inspection_calculation_frequency_snapshots(calculation_id,frequency_range_id,lower_bound_snapshot,upper_bound_snapshot,lower_inclusive_snapshot,upper_inclusive_snapshot,frequency,label_snapshot) VALUES(calc_id,range_row.id,range_row.lower_bound,range_row.upper_bound,range_row.lower_inclusive,range_row.upper_inclusive,range_row.frequency,range_row.label);
  RETURN calc_id;
END $$;
