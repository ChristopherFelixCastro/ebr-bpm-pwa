ALTER TABLE inspection_review_cycles
  ADD COLUMN initial_calculation_id uuid REFERENCES inspection_calculations(id) ON DELETE RESTRICT,
  ADD COLUMN current_calculation_id uuid REFERENCES inspection_calculations(id) ON DELETE RESTRICT,
  ADD COLUMN return_count integer NOT NULL DEFAULT 0 CHECK(return_count>=0),
  ADD COLUMN approved_by_name_snapshot text,
  ADD COLUMN approved_by_role_snapshot text,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

UPDATE inspection_review_cycles r SET
  initial_calculation_id=(SELECT c.id FROM inspection_calculations c WHERE c.inspection_id=r.inspection_id ORDER BY c.calculation_number LIMIT 1),
  current_calculation_id=(SELECT c.id FROM inspection_calculations c WHERE c.inspection_id=r.inspection_id ORDER BY c.is_current DESC,c.calculation_number DESC LIMIT 1);

ALTER TABLE inspection_review_correction_items DROP CONSTRAINT IF EXISTS inspection_review_correction_items_review_cycle_id_bpm_item_key;
ALTER TABLE inspection_review_correction_items
  ADD COLUMN return_number integer NOT NULL DEFAULT 1 CHECK(return_number>0),
  ADD COLUMN response_version_at_return integer CHECK(response_version_at_return IS NULL OR response_version_at_return>0),
  ADD COLUMN corrected_response_version integer CHECK(corrected_response_version IS NULL OR corrected_response_version>0),
  ADD CONSTRAINT inspection_review_correction_items_cycle_return_item_key UNIQUE(review_cycle_id,return_number,bpm_item_id);

ALTER TABLE inspection_review_events ADD COLUMN calculation_id uuid REFERENCES inspection_calculations(id) ON DELETE RESTRICT;

ALTER TABLE inspection_reports
  ADD COLUMN review_cycle_id uuid REFERENCES inspection_review_cycles(id) ON DELETE RESTRICT,
  ADD COLUMN generation_key uuid,
  ADD COLUMN verification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT inspection_reports_verification_id_key UNIQUE(verification_id),
  ADD CONSTRAINT inspection_reports_generation_key_key UNIQUE(generation_key),
  ADD CONSTRAINT inspection_reports_archive_check CHECK((archived_at IS NULL AND archived_by_user_id IS NULL) OR (status='DRAFT' AND archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL));

CREATE UNIQUE INDEX inspection_reports_one_active_draft_idx ON inspection_reports(inspection_id) WHERE status='DRAFT' AND archived_at IS NULL;

CREATE TABLE inspection_report_participants(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES inspection_reports(id) ON DELETE RESTRICT,
  participant_role varchar(40) NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  display_name_snapshot text NOT NULL,
  role_name_snapshot text NOT NULL,
  participation_snapshot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(report_id,participant_role),
  CHECK(participant_role IN('EVALUATOR','COORDINATOR_APPROVER')),
  CHECK(btrim(display_name_snapshot)<>'' AND btrim(role_name_snapshot)<>'' AND btrim(participation_snapshot)<>'')
);

CREATE OR REPLACE FUNCTION review_role_of(target_user uuid) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=target_user AND u.status='APPROVED'
$$;

CREATE OR REPLACE FUNCTION review_actor_is_global(target_user uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(review_role_of(target_user) IN('ADMIN','UNIVERSAL','COORDINATOR'),false)
$$;

CREATE OR REPLACE FUNCTION review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_context text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'review cycles are historical' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    expected_context:=current_setting('app.review_open_inspection_id',true);
    IF expected_context IS NULL OR expected_context<>NEW.inspection_id::text THEN RAISE EXCEPTION 'review must be opened through controlled workflow' USING ERRCODE='23514'; END IF;
    IF NEW.status<>'PENDING_REVIEW' OR NEW.initial_calculation_id IS NULL OR NEW.current_calculation_id IS NULL OR NEW.initial_calculation_id<>NEW.current_calculation_id THEN RAISE EXCEPTION 'review requires a current calculation' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='APPROVED' THEN RAISE EXCEPTION 'approved review immutable' USING ERRCODE='55000'; END IF;
  IF current_setting('app.review_transition_cycle_id',true) IS DISTINCT FROM OLD.id::text THEN RAISE EXCEPTION 'review transition requires controlled workflow' USING ERRCODE='23514'; END IF;
  IF NEW.id<>OLD.id OR NEW.inspection_id<>OLD.inspection_id OR NEW.cycle_number<>OLD.cycle_number OR NEW.reviewer_user_id<>OLD.reviewer_user_id OR NEW.initial_calculation_id IS DISTINCT FROM OLD.initial_calculation_id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'review identity immutable' USING ERRCODE='55000'; END IF;
  IF NOT ((OLD.status='PENDING_REVIEW' AND NEW.status IN('RETURNED_FOR_CORRECTION','APPROVED')) OR (OLD.status='RETURNED_FOR_CORRECTION' AND NEW.status='RESUBMITTED') OR (OLD.status='RESUBMITTED' AND NEW.status IN('RETURNED_FOR_CORRECTION','APPROVED'))) THEN RAISE EXCEPTION 'invalid review transition' USING ERRCODE='23514'; END IF;
  IF NEW.status='RETURNED_FOR_CORRECTION' AND NOT EXISTS(SELECT 1 FROM inspection_review_correction_items x WHERE x.review_cycle_id=NEW.id AND x.return_number=NEW.return_count) THEN RAISE EXCEPTION 'return requires correction items' USING ERRCODE='23514'; END IF;
  IF NEW.status='RESUBMITTED' AND (NEW.current_calculation_id IS NULL OR EXISTS(SELECT 1 FROM inspection_review_correction_items x WHERE x.review_cycle_id=NEW.id AND x.return_number=NEW.return_count AND x.status<>'CORRECTED')) THEN RAISE EXCEPTION 'resubmission requires corrected items and calculation' USING ERRCODE='23514'; END IF;
  IF NEW.status='APPROVED' AND (NEW.approved_at IS NULL OR NEW.approved_by_user_id IS NULL OR NEW.approved_by_name_snapshot IS NULL OR NEW.approved_by_role_snapshot IS NULL OR NEW.current_calculation_id IS NULL) THEN RAISE EXCEPTION 'approval requires participant snapshot and calculation' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION correction_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cycle inspection_review_cycles%ROWTYPE; ins inspections%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'correction items are historical' USING ERRCODE='55000'; END IF;
  SELECT * INTO cycle FROM inspection_review_cycles WHERE id=COALESCE(NEW.review_cycle_id,OLD.review_cycle_id);
  SELECT * INTO ins FROM inspections WHERE id=cycle.inspection_id;
  IF TG_OP='INSERT' THEN
    IF current_setting('app.review_transition_cycle_id',true) IS DISTINCT FROM cycle.id::text OR cycle.status NOT IN('PENDING_REVIEW','RESUBMITTED') OR NEW.return_number<>cycle.return_count+1 THEN RAISE EXCEPTION 'invalid correction item workflow' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM bpm_template_items b WHERE b.id=NEW.bpm_item_id AND b.template_version_id=ins.bpm_template_version_id AND b.item_kind='CRITERION' AND b.is_evaluable) THEN RAISE EXCEPTION 'invalid correction item' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF current_setting('app.review_correction_write',true) IS DISTINCT FROM cycle.id::text OR OLD.status<>'OPEN' OR NEW.status<>'CORRECTED' OR NEW.corrected_at IS NULL OR NEW.corrected_by_user_id IS NULL OR NEW.corrected_response_version IS NULL THEN RAISE EXCEPTION 'correction item transition invalid' USING ERRCODE='23514'; END IF;
  IF NEW.id<>OLD.id OR NEW.review_cycle_id<>OLD.review_cycle_id OR NEW.bpm_item_id<>OLD.bpm_item_id OR NEW.return_number<>OLD.return_number OR NEW.correction_reason<>OLD.correction_reason OR NEW.marked_by_user_id<>OLD.marked_by_user_id OR NEW.response_version_at_return IS DISTINCT FROM OLD.response_version_at_return THEN RAISE EXCEPTION 'correction item identity immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_evaluator uuid; assignment_active boolean; case_current_status case_status; correction_cycle uuid;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspections are historical and cannot be deleted' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT status INTO case_current_status FROM cases WHERE id=NEW.case_id FOR UPDATE;
    IF case_current_status<>'ASSIGNED' THEN RAISE EXCEPTION 'inspection requires assigned case' USING ERRCODE='23514'; END IF;
    SELECT case_id,evaluator_user_id,is_active INTO assignment_case,assignment_evaluator,assignment_active FROM case_assignments WHERE id=NEW.case_assignment_id FOR UPDATE;
    IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_evaluator IS DISTINCT FROM NEW.evaluator_user_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'inspection assignment invalid' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM bpm_template_versions WHERE id=NEW.bpm_template_version_id AND status='PUBLISHED') OR NOT EXISTS(SELECT 1 FROM risk_rule_versions WHERE id=NEW.risk_rule_version_id AND status='PUBLISHED') THEN RAISE EXCEPTION 'inspection versions must be published' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.case_id<>OLD.case_id OR NEW.case_assignment_id<>OLD.case_assignment_id OR NEW.evaluator_user_id<>OLD.evaluator_user_id OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id OR NEW.created_by_user_id<>OLD.created_by_user_id THEN RAISE EXCEPTION 'inspection context is immutable' USING ERRCODE='55000'; END IF;
  IF NEW.content_revision<OLD.content_revision OR NEW.content_revision>OLD.content_revision+1 THEN RAISE EXCEPTION 'invalid inspection content revision' USING ERRCODE='23514'; END IF;
  SELECT id INTO correction_cycle FROM inspection_review_cycles WHERE inspection_id=OLD.id AND status='RETURNED_FOR_CORRECTION';
  IF OLD.status='SUBMITTED' THEN
    IF NEW.status IS DISTINCT FROM 'IN_PROGRESS' OR correction_cycle IS NULL OR current_setting('app.review_return_cycle_id',true) IS DISTINCT FROM correction_cycle::text OR NEW.content_revision<>OLD.content_revision+1 THEN RAISE EXCEPTION 'submitted inspection is immutable outside review return' USING ERRCODE='55000'; END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status='DRAFT' AND NEW.status='IN_PROGRESS') OR
    (OLD.status='IN_PROGRESS' AND NEW.status='PENDING_SUBMISSION') OR
    (OLD.status='PENDING_SUBMISSION' AND NEW.status IN('IN_PROGRESS','SUBMITTED'))
  ) THEN RAISE EXCEPTION 'invalid inspection transition' USING ERRCODE='23514'; END IF;
  IF OLD.status='PENDING_SUBMISSION' AND NEW.status='IN_PROGRESS' THEN
    IF NEW.content_revision<>OLD.content_revision+1 OR EXISTS(SELECT 1 FROM inspection_review_cycles r WHERE r.inspection_id=OLD.id) OR EXISTS(SELECT 1 FROM inspection_reports r WHERE r.inspection_id=OLD.id AND r.archived_at IS NULL) OR EXISTS(SELECT 1 FROM inspection_closures c WHERE c.inspection_id=OLD.id) THEN RAISE EXCEPTION 'unlock blocked by review or report lifecycle' USING ERRCODE='23514'; END IF;
  END IF;
  IF OLD.status='IN_PROGRESS' AND NEW.status='PENDING_SUBMISSION' AND correction_cycle IS NOT NULL AND current_setting('app.review_resubmit_cycle_id',true) IS DISTINCT FROM correction_cycle::text THEN RAISE EXCEPTION 'returned inspection requires formal resubmission' USING ERRCODE='23514'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN('PENDING_SUBMISSION','SUBMITTED') AND EXISTS(SELECT 1 FROM bpm_template_items item WHERE item.template_version_id=NEW.bpm_template_version_id AND item.item_kind='CRITERION' AND item.is_evaluable AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses response WHERE response.inspection_id=NEW.id AND response.bpm_item_id=item.id)) THEN RAISE EXCEPTION 'all evaluable BPM items require responses' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_bpm_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; item_template uuid; item_kind_value bpm_item_kind; evaluable boolean; iid uuid; cycle_id uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id); SELECT * INTO ins FROM inspections WHERE id=iid FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN('DRAFT','IN_PROGRESS') THEN RAISE EXCEPTION 'inspection is not editable' USING ERRCODE='23514'; END IF;
  SELECT id INTO cycle_id FROM inspection_review_cycles WHERE inspection_id=iid AND status='RETURNED_FOR_CORRECTION';
  IF cycle_id IS NOT NULL AND (current_setting('app.review_correction_write',true) IS DISTINCT FROM cycle_id::text OR NOT EXISTS(SELECT 1 FROM inspection_review_correction_items x JOIN inspection_review_cycles r ON r.id=x.review_cycle_id WHERE x.review_cycle_id=cycle_id AND x.return_number=r.return_count AND x.bpm_item_id=COALESCE(NEW.bpm_item_id,OLD.bpm_item_id) AND x.status='OPEN')) THEN RAISE EXCEPTION 'criterion is outside correction scope' USING ERRCODE='23514'; END IF;
  IF TG_OP IN('INSERT','UPDATE') THEN SELECT template_version_id,item_kind,is_evaluable INTO item_template,item_kind_value,evaluable FROM bpm_template_items WHERE id=NEW.bpm_item_id; IF item_template IS DISTINCT FROM ins.bpm_template_version_id OR item_kind_value<>'CRITERION' OR evaluable IS DISTINCT FROM true THEN RAISE EXCEPTION 'BPM item does not belong to inspection template' USING ERRCODE='23514'; END IF; END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION mark_review_correction_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid; cycle_id uuid; actor_id uuid; response_version integer;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  SELECT id INTO cycle_id FROM inspection_review_cycles WHERE inspection_id=iid AND status='RETURNED_FOR_CORRECTION';
  IF cycle_id IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
  SELECT COALESCE(NULLIF(current_setting('app.actor_user_id',true),'')::uuid,i.evaluator_user_id) INTO actor_id FROM inspections i WHERE i.id=iid;
  SELECT version INTO response_version FROM inspection_bpm_responses WHERE inspection_id=iid AND bpm_item_id=COALESCE(NEW.bpm_item_id,OLD.bpm_item_id);
  PERFORM set_config('app.review_correction_write',cycle_id::text,true);
  UPDATE inspection_review_correction_items x SET status='CORRECTED',corrected_at=clock_timestamp(),corrected_by_user_id=actor_id,corrected_response_version=COALESCE(response_version,1)
  FROM inspection_review_cycles r WHERE x.review_cycle_id=cycle_id AND r.id=x.review_cycle_id AND x.return_number=r.return_count AND x.bpm_item_id=COALESCE(NEW.bpm_item_id,OLD.bpm_item_id) AND x.status='OPEN';
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE TRIGGER inspection_bpm_responses_mark_correction AFTER INSERT OR UPDATE OR DELETE ON inspection_bpm_responses FOR EACH ROW EXECUTE FUNCTION mark_review_correction_item();

CREATE OR REPLACE FUNCTION inspection_factor_selection_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; factor_rule uuid; option_factor uuid; iid uuid;
BEGIN
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id); SELECT * INTO ins FROM inspections WHERE id=iid FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN('DRAFT','IN_PROGRESS') OR EXISTS(SELECT 1 FROM inspection_review_cycles WHERE inspection_id=iid AND status='RETURNED_FOR_CORRECTION') THEN RAISE EXCEPTION 'risk factors are locked during correction' USING ERRCODE='23514'; END IF;
  IF TG_OP IN('INSERT','UPDATE') THEN SELECT risk_rule_version_id INTO factor_rule FROM risk_factors WHERE id=NEW.risk_factor_id; SELECT risk_factor_id INTO option_factor FROM risk_factor_options WHERE id=NEW.risk_factor_option_id; IF factor_rule IS DISTINCT FROM ins.risk_rule_version_id OR option_factor IS DISTINCT FROM NEW.risk_factor_id THEN RAISE EXCEPTION 'risk factor selection does not belong to inspection rule' USING ERRCODE='23514'; END IF; END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION inspection_food_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; food_rule uuid; source_category_code varchar(120); source_category_name varchar(300); source_subcategory_name varchar(700); source_microbiological_risk microbiological_risk; source_risk_score smallint;
BEGIN
  IF TG_OP IN('UPDATE','DELETE') THEN RAISE EXCEPTION 'inspection food snapshots are immutable' USING ERRCODE='55000'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=NEW.inspection_id FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN('DRAFT','IN_PROGRESS') OR EXISTS(SELECT 1 FROM inspection_review_cycles WHERE inspection_id=NEW.inspection_id AND status='RETURNED_FOR_CORRECTION') THEN RAISE EXCEPTION 'food snapshots are locked during correction' USING ERRCODE='23514'; END IF;
  SELECT c.risk_rule_version_id,c.code,c.name,s.name,s.microbiological_risk,s.risk_score INTO food_rule,source_category_code,source_category_name,source_subcategory_name,source_microbiological_risk,source_risk_score FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE s.id=NEW.food_risk_subcategory_id;
  IF food_rule IS DISTINCT FROM ins.risk_rule_version_id OR NEW.category_code_snapshot<>source_category_code OR NEW.category_name_snapshot<>source_category_name OR NEW.subcategory_name_snapshot<>source_subcategory_name OR NEW.microbiological_risk_snapshot IS DISTINCT FROM source_microbiological_risk OR NEW.risk_score_snapshot IS DISTINCT FROM source_risk_score THEN RAISE EXCEPTION 'food snapshot does not match inspection rule' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION inspection_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iid uuid; active_count integer;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inspection evidence requires logical deletion' USING ERRCODE='55000'; END IF;
  iid:=COALESCE(NEW.inspection_id,OLD.inspection_id);
  PERFORM 1 FROM inspections WHERE id=iid AND status IN ('DRAFT','IN_PROGRESS') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inspection is not editable'; END IF;
  IF EXISTS(SELECT 1 FROM inspection_review_cycles WHERE inspection_id=iid AND status='RETURNED_FOR_CORRECTION') THEN RAISE EXCEPTION 'evidence is locked during correction' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' AND NEW.status='REJECTED' AND NEW.validated_at IS NULL THEN
    NEW.validated_at:=clock_timestamp(); NEW.validated_by_user_id:=NEW.uploaded_by_user_id; NEW.rejection_reason:='Legacy rejection';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.status=OLD.status THEN NEW.status:='ARCHIVED'; NEW.archived_at:=COALESCE(NEW.archived_at,NEW.deleted_at); END IF;
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

CREATE OR REPLACE FUNCTION case_schedule_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_active boolean; current_status case_status; target_case uuid;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'schedule history cannot be deleted' USING ERRCODE='55000'; END IF;
  target_case:=COALESCE(NEW.case_id,OLD.case_id);
  IF EXISTS(SELECT 1 FROM inspections i JOIN inspection_review_cycles r ON r.inspection_id=i.id WHERE i.case_id=target_case AND r.status='RETURNED_FOR_CORRECTION') THEN RAISE EXCEPTION 'schedule is locked during correction' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'SCHEDULED' THEN RAISE EXCEPTION 'new schedules must start scheduled' USING ERRCODE='23514'; END IF;
    IF NEW.case_assignment_id IS NULL THEN RAISE EXCEPTION 'schedule assignment required' USING ERRCODE='23514'; END IF;
    IF NEW.scheduled_start_at<=clock_timestamp() THEN RAISE EXCEPTION 'schedule must start in the future' USING ERRCODE='23514'; END IF;
    IF NEW.scheduled_end_at<=NEW.scheduled_start_at OR NEW.scheduled_end_at-NEW.scheduled_start_at<interval '15 minutes' OR NEW.scheduled_end_at-NEW.scheduled_start_at>interval '12 hours' THEN RAISE EXCEPTION 'schedule duration must be between 15 minutes and 12 hours' USING ERRCODE='23514'; END IF;
    IF NEW.timezone<>'America/Santo_Domingo' THEN RAISE EXCEPTION 'invalid schedule timezone' USING ERRCODE='23514'; END IF;
    IF NEW.cancellation_reason IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by_user_id IS NOT NULL THEN RAISE EXCEPTION 'new schedule cannot be cancelled' USING ERRCODE='23514'; END IF;
    SELECT status INTO current_status FROM cases WHERE id=NEW.case_id FOR UPDATE;
    IF current_status<>'ASSIGNED' THEN RAISE EXCEPTION 'case must be assigned before scheduling' USING ERRCODE='23514'; END IF;
    SELECT case_id,is_active INTO assignment_case,assignment_active FROM case_assignments WHERE id=NEW.case_assignment_id;
    IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'schedule assignment must be active and belong to case' USING ERRCODE='23514'; END IF;
    IF NEW.rescheduled_from_schedule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=NEW.rescheduled_from_schedule_id AND case_id=NEW.case_id AND status='RESCHEDULED') THEN RAISE EXCEPTION 'rescheduled schedule predecessor is invalid' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status<>'SCHEDULED' THEN RAISE EXCEPTION 'inactive schedule is immutable' USING ERRCODE='55000'; END IF;
  IF NEW.status NOT IN('RESCHEDULED','CANCELLED') THEN RAISE EXCEPTION 'scheduled entry must be closed by reschedule or cancellation' USING ERRCODE='23514'; END IF;
  IF NEW.case_id IS DISTINCT FROM OLD.case_id OR NEW.case_assignment_id IS DISTINCT FROM OLD.case_assignment_id OR NEW.rescheduled_from_schedule_id IS DISTINCT FROM OLD.rescheduled_from_schedule_id OR NEW.scheduled_start_at IS DISTINCT FROM OLD.scheduled_start_at OR NEW.scheduled_end_at IS DISTINCT FROM OLD.scheduled_end_at OR NEW.timezone IS DISTINCT FROM OLD.timezone OR NEW.scheduled_by_user_id IS DISTINCT FROM OLD.scheduled_by_user_id OR NEW.notes IS DISTINCT FROM OLD.notes THEN RAISE EXCEPTION 'schedule details are immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION open_inspection_review(p_inspection uuid,p_actor uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; calc inspection_calculations%ROWTYPE; review_id uuid; next_cycle integer;
BEGIN
  IF NOT review_actor_is_global(p_actor) THEN RAISE EXCEPTION 'review actor forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=p_inspection FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inspection not found' USING ERRCODE='P0002'; END IF;
  PERFORM 1 FROM cases WHERE id=ins.case_id AND status='ASSIGNED' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'review requires open assigned case' USING ERRCODE='23514'; END IF;
  IF ins.status<>'SUBMITTED' OR EXISTS(SELECT 1 FROM inspection_review_cycles WHERE inspection_id=ins.id AND status<>'APPROVED') OR EXISTS(SELECT 1 FROM inspection_reports WHERE inspection_id=ins.id AND status='OFFICIAL') OR EXISTS(SELECT 1 FROM inspection_closures WHERE inspection_id=ins.id) THEN RAISE EXCEPTION 'inspection cannot open review' USING ERRCODE='23514'; END IF;
  SELECT * INTO calc FROM inspection_calculations WHERE inspection_id=ins.id AND is_current FOR UPDATE;
  IF NOT FOUND OR calc.status<>'COMPLETED' OR calc.inspection_content_revision<>ins.content_revision OR calc.bpm_template_version_id<>ins.bpm_template_version_id OR calc.risk_rule_version_id<>ins.risk_rule_version_id THEN RAISE EXCEPTION 'review requires matching current calculation' USING ERRCODE='23514'; END IF;
  SELECT COALESCE(max(cycle_number),0)+1 INTO next_cycle FROM inspection_review_cycles WHERE inspection_id=ins.id;
  PERFORM set_config('app.review_open_inspection_id',ins.id::text,true);
  INSERT INTO inspection_review_cycles(inspection_id,cycle_number,reviewer_user_id,initial_calculation_id,current_calculation_id) VALUES(ins.id,next_cycle,p_actor,calc.id,calc.id) RETURNING id INTO review_id;
  INSERT INTO inspection_review_events(inspection_id,review_cycle_id,event_type,actor_user_id,calculation_id) VALUES(ins.id,review_id,'OPENED',p_actor,calc.id);
  RETURN review_id;
END $$;

CREATE OR REPLACE FUNCTION return_inspection_review(p_inspection uuid,p_review uuid,p_actor uuid,p_reason text,p_items uuid[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; cycle inspection_review_cycles%ROWTYPE; calc inspection_calculations%ROWTYPE; next_return integer; item_id uuid;
BEGIN
  IF NOT review_actor_is_global(p_actor) OR p_reason IS NULL OR btrim(p_reason)='' OR COALESCE(array_length(p_items,1),0)=0 THEN RAISE EXCEPTION 'return requires actor, reason and criteria' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*) FROM unnest(p_items) x)<>(SELECT count(DISTINCT x) FROM unnest(p_items) x) THEN RAISE EXCEPTION 'duplicate correction criteria' USING ERRCODE='23514'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=p_inspection FOR UPDATE; SELECT * INTO cycle FROM inspection_review_cycles WHERE id=p_review AND inspection_id=p_inspection FOR UPDATE; PERFORM 1 FROM cases WHERE id=ins.case_id AND status='ASSIGNED' FOR UPDATE;
  IF ins.id IS NULL OR cycle.id IS NULL OR NOT FOUND OR ins.status<>'SUBMITTED' OR cycle.status NOT IN('PENDING_REVIEW','RESUBMITTED') OR EXISTS(SELECT 1 FROM inspection_reports WHERE inspection_id=ins.id AND status='OFFICIAL') THEN RAISE EXCEPTION 'review cannot be returned' USING ERRCODE='23514'; END IF;
  SELECT * INTO calc FROM inspection_calculations WHERE id=cycle.current_calculation_id AND inspection_id=ins.id AND is_current FOR UPDATE;
  IF NOT FOUND OR calc.inspection_content_revision<>ins.content_revision THEN RAISE EXCEPTION 'review calculation is stale' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_items) x LEFT JOIN bpm_template_items b ON b.id=x WHERE b.id IS NULL OR b.template_version_id<>ins.bpm_template_version_id OR b.item_kind<>'CRITERION' OR NOT b.is_evaluable) THEN RAISE EXCEPTION 'invalid correction criterion' USING ERRCODE='23514'; END IF;
  next_return:=cycle.return_count+1; PERFORM set_config('app.review_transition_cycle_id',cycle.id::text,true);
  FOREACH item_id IN ARRAY p_items LOOP
    INSERT INTO inspection_review_correction_items(review_cycle_id,bpm_item_id,correction_reason,marked_by_user_id,return_number,response_version_at_return)
    SELECT cycle.id,item_id,p_reason,p_actor,next_return,r.version FROM inspection_bpm_responses r WHERE r.inspection_id=ins.id AND r.bpm_item_id=item_id;
  END LOOP;
  UPDATE inspection_review_cycles SET status='RETURNED_FOR_CORRECTION',return_reason=p_reason,return_count=next_return,current_calculation_id=NULL,updated_at=clock_timestamp() WHERE id=cycle.id;
  PERFORM set_config('app.review_return_cycle_id',cycle.id::text,true);
  UPDATE inspections SET status='IN_PROGRESS',finalized_at=NULL,submitted_at=NULL,content_revision=content_revision+1 WHERE id=ins.id;
  UPDATE inspection_calculations SET status='SUPERSEDED',is_current=false,superseded_at=clock_timestamp(),superseded_by_user_id=p_actor WHERE id=calc.id;
  INSERT INTO inspection_review_events(inspection_id,review_cycle_id,event_type,actor_user_id,reason,calculation_id) VALUES(ins.id,cycle.id,'RETURNED',p_actor,p_reason,calc.id);
END $$;

CREATE OR REPLACE FUNCTION resubmit_inspection_review(p_inspection uuid,p_review uuid,p_actor uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; cycle inspection_review_cycles%ROWTYPE; calc_id uuid;
BEGIN
  SELECT * INTO ins FROM inspections WHERE id=p_inspection FOR UPDATE; SELECT * INTO cycle FROM inspection_review_cycles WHERE id=p_review AND inspection_id=p_inspection FOR UPDATE;
  IF ins.id IS NULL OR cycle.id IS NULL OR p_actor<>ins.evaluator_user_id OR ins.status<>'IN_PROGRESS' OR cycle.status<>'RETURNED_FOR_CORRECTION' THEN RAISE EXCEPTION 'review cannot be resubmitted' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM inspection_review_correction_items x WHERE x.review_cycle_id=cycle.id AND x.return_number=cycle.return_count AND x.status<>'CORRECTED') THEN RAISE EXCEPTION 'all correction items must be corrected' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM bpm_template_items b WHERE b.template_version_id=ins.bpm_template_version_id AND b.item_kind='CRITERION' AND b.is_evaluable AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses r WHERE r.inspection_id=ins.id AND r.bpm_item_id=b.id)) THEN RAISE EXCEPTION 'all BPM responses required' USING ERRCODE='23514'; END IF;
  PERFORM set_config('app.review_resubmit_cycle_id',cycle.id::text,true);
  UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=ins.id;
  calc_id:=recalculate_inspection(ins.id,p_actor,'Review resubmission');
  UPDATE inspections SET status='SUBMITTED',submitted_at=clock_timestamp() WHERE id=ins.id;
  PERFORM set_config('app.review_transition_cycle_id',cycle.id::text,true);
  UPDATE inspection_review_cycles SET status='RESUBMITTED',current_calculation_id=calc_id,resubmitted_at=clock_timestamp(),resubmitted_by_user_id=p_actor,updated_at=clock_timestamp() WHERE id=cycle.id;
  INSERT INTO inspection_review_events(inspection_id,review_cycle_id,event_type,actor_user_id,calculation_id) VALUES(ins.id,cycle.id,'RESUBMITTED',p_actor,calc_id);
  RETURN calc_id;
END $$;

CREATE OR REPLACE FUNCTION approve_inspection_review(p_inspection uuid,p_review uuid,p_actor uuid,p_note text DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; cycle inspection_review_cycles%ROWTYPE; calc inspection_calculations%ROWTYPE; actor_name text; actor_role text;
BEGIN
  IF NOT review_actor_is_global(p_actor) OR length(COALESCE(p_note,''))>1000 THEN RAISE EXCEPTION 'approval actor or note invalid' USING ERRCODE='23514'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=p_inspection FOR UPDATE; SELECT * INTO cycle FROM inspection_review_cycles WHERE id=p_review AND inspection_id=p_inspection FOR UPDATE; SELECT full_name,review_role_of(p_actor) INTO actor_name,actor_role FROM users WHERE id=p_actor;
  IF ins.id IS NULL OR cycle.id IS NULL OR actor_name IS NULL OR ins.status<>'SUBMITTED' OR cycle.status NOT IN('PENDING_REVIEW','RESUBMITTED') OR cycle.current_calculation_id IS NULL OR EXISTS(SELECT 1 FROM inspection_review_correction_items WHERE review_cycle_id=cycle.id AND status='OPEN') OR EXISTS(SELECT 1 FROM inspection_reports WHERE inspection_id=ins.id AND status='OFFICIAL') THEN RAISE EXCEPTION 'review cannot be approved' USING ERRCODE='23514'; END IF;
  SELECT * INTO calc FROM inspection_calculations WHERE id=cycle.current_calculation_id AND inspection_id=ins.id AND is_current FOR UPDATE;
  IF NOT FOUND OR calc.status<>'COMPLETED' OR calc.inspection_content_revision<>ins.content_revision OR calc.bpm_template_version_id<>ins.bpm_template_version_id OR calc.risk_rule_version_id<>ins.risk_rule_version_id THEN RAISE EXCEPTION 'approval calculation mismatch' USING ERRCODE='23514'; END IF;
  PERFORM set_config('app.review_transition_cycle_id',cycle.id::text,true);
  UPDATE inspection_review_cycles SET status='APPROVED',approved_at=clock_timestamp(),approved_by_user_id=p_actor,approved_by_name_snapshot=actor_name,approved_by_role_snapshot=actor_role,updated_at=clock_timestamp() WHERE id=cycle.id;
  INSERT INTO inspection_review_events(inspection_id,review_cycle_id,event_type,actor_user_id,reason,calculation_id) VALUES(ins.id,cycle.id,'APPROVED',p_actor,NULLIF(btrim(p_note),''),calc.id);
END $$;

CREATE OR REPLACE FUNCTION report_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE generator_role text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'reports are historical' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    generator_role:=review_role_of(NEW.generated_by_user_id);
    IF current_setting('app.report_generation_review_id',true) IS DISTINCT FROM NEW.review_cycle_id::text OR generator_role NOT IN('ADMIN','UNIVERSAL','COORDINATOR') OR NEW.status<>'DRAFT' OR NEW.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM inspection_reports r WHERE r.inspection_id=NEW.inspection_id AND r.status='OFFICIAL') OR EXISTS(SELECT 1 FROM inspection_closures c WHERE c.inspection_id=NEW.inspection_id) OR NOT EXISTS(SELECT 1 FROM inspection_review_cycles r JOIN inspection_calculations c ON c.id=r.current_calculation_id WHERE r.id=NEW.review_cycle_id AND r.inspection_id=NEW.inspection_id AND r.status='APPROVED' AND c.id=NEW.calculation_id AND c.is_current) THEN RAISE EXCEPTION 'report generation prerequisites invalid' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='OFFICIAL' OR OLD.archived_at IS NOT NULL THEN RAISE EXCEPTION 'official or archived report immutable' USING ERRCODE='55000'; END IF;
  IF NEW.id<>OLD.id OR NEW.inspection_id<>OLD.inspection_id OR NEW.review_cycle_id IS DISTINCT FROM OLD.review_cycle_id OR NEW.verification_id<>OLD.verification_id THEN RAISE EXCEPTION 'report identity immutable' USING ERRCODE='55000'; END IF;
  IF NEW.status='OFFICIAL' THEN
    IF current_setting('app.report_officialize_id',true) IS DISTINCT FROM OLD.id::text OR NEW.official_at IS NULL OR NEW.official_by_user_id IS NULL THEN RAISE EXCEPTION 'invalid officialization' USING ERRCODE='23514'; END IF;
  ELSIF NEW.archived_at IS NOT NULL THEN
    IF current_setting('app.report_archive_calculation_id',true) IS DISTINCT FROM OLD.calculation_id::text OR NEW.archived_by_user_id IS NULL THEN RAISE EXCEPTION 'invalid draft archival' USING ERRCODE='23514'; END IF;
  ELSIF current_setting('app.report_generation_review_id',true) IS DISTINCT FROM OLD.review_cycle_id::text OR NEW.status<>'DRAFT' THEN RAISE EXCEPTION 'invalid draft regeneration' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION report_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP IN('UPDATE','DELETE') THEN RAISE EXCEPTION 'report participants immutable' USING ERRCODE='55000'; END IF; RETURN NEW; END $$;
CREATE TRIGGER report_participants_guard BEFORE UPDATE OR DELETE ON inspection_report_participants FOR EACH ROW EXECUTE FUNCTION report_participant_guard();

CREATE OR REPLACE FUNCTION officialize_inspection_report(p_inspection uuid,p_report uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE report inspection_reports%ROWTYPE; ins inspections%ROWTYPE; cycle inspection_review_cycles%ROWTYPE; calc inspection_calculations%ROWTYPE;
BEGIN
  IF NOT review_actor_is_global(p_actor) THEN RAISE EXCEPTION 'officialization actor forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO report FROM inspection_reports WHERE id=p_report AND inspection_id=p_inspection FOR UPDATE; SELECT * INTO ins FROM inspections WHERE id=p_inspection FOR UPDATE; SELECT * INTO cycle FROM inspection_review_cycles WHERE id=report.review_cycle_id FOR UPDATE; SELECT * INTO calc FROM inspection_calculations WHERE id=report.calculation_id FOR UPDATE;
  IF report.id IS NULL OR ins.id IS NULL OR cycle.id IS NULL OR calc.id IS NULL OR report.status<>'DRAFT' OR report.archived_at IS NOT NULL OR cycle.status<>'APPROVED' OR cycle.current_calculation_id<>calc.id OR NOT calc.is_current OR calc.inspection_content_revision<>ins.content_revision OR EXISTS(SELECT 1 FROM inspection_reports WHERE inspection_id=ins.id AND status='OFFICIAL') OR (SELECT count(*) FROM inspection_report_participants WHERE report_id=report.id AND participant_role IN('EVALUATOR','COORDINATOR_APPROVER'))<>2 THEN RAISE EXCEPTION 'report cannot be officialized' USING ERRCODE='23514'; END IF;
  PERFORM set_config('app.report_officialize_id',report.id::text,true);
  UPDATE inspection_reports SET status='OFFICIAL',official_at=clock_timestamp(),official_by_user_id=p_actor,updated_at=clock_timestamp() WHERE id=report.id;
END $$;

CREATE OR REPLACE FUNCTION calculation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'calculations are historical and cannot be deleted' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN IF NEW.status<>'COMPLETED' OR NOT NEW.is_current OR NEW.inspection_content_revision IS NULL THEN RAISE EXCEPTION 'new calculation must be current, completed and revisioned' USING ERRCODE='23514'; END IF; RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM inspection_reports r WHERE r.inspection_id=OLD.inspection_id AND r.status='OFFICIAL') OR EXISTS(SELECT 1 FROM inspection_closures c WHERE c.inspection_id=OLD.inspection_id) THEN RAISE EXCEPTION 'official report or closure locks calculations' USING ERRCODE='23514'; END IF;
  IF OLD.status<>'COMPLETED' OR NOT OLD.is_current OR NEW.status<>'SUPERSEDED' OR NEW.is_current OR NEW.superseded_at IS NULL OR NEW.superseded_by_user_id IS NULL OR NEW.inspection_id<>OLD.inspection_id OR NEW.calculation_number<>OLD.calculation_number OR NEW.bpm_template_version_id<>OLD.bpm_template_version_id OR NEW.risk_rule_version_id<>OLD.risk_rule_version_id OR NEW.bpm_numerator<>OLD.bpm_numerator OR NEW.bpm_denominator<>OLD.bpm_denominator OR NEW.bpm_percentage<>OLD.bpm_percentage OR NEW.product_risk_score<>OLD.product_risk_score OR NEW.establishment_risk_score<>OLD.establishment_risk_score OR NEW.total_risk_score<>OLD.total_risk_score OR NEW.frequency<>OLD.frequency OR NEW.frequency_range_id<>OLD.frequency_range_id OR NEW.inspection_content_revision IS DISTINCT FROM OLD.inspection_content_revision THEN RAISE EXCEPTION 'calculation history immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION recalculate_inspection(p_inspection_id uuid,p_calculated_by_user_id uuid,p_reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; product_score numeric(4,2); establishment_score numeric(8,4); total_score numeric(10,4); numerator numeric(12,4); denominator integer; factor_count integer; factor_codes integer; weights numeric(10,4); range_row inspection_frequency_ranges%ROWTYPE; range_count integer; next_number integer; calc_id uuid; old_calc uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_calculated_by_user_id) THEN RAISE EXCEPTION 'calculation actor not found' USING ERRCODE='23514'; END IF;
  SELECT * INTO ins FROM inspections WHERE id=p_inspection_id FOR UPDATE;
  IF NOT FOUND OR ins.status NOT IN('PENDING_SUBMISSION','SUBMITTED') OR EXISTS(SELECT 1 FROM inspection_reports WHERE inspection_id=ins.id AND status='OFFICIAL') OR EXISTS(SELECT 1 FROM inspection_closures WHERE inspection_id=ins.id) THEN RAISE EXCEPTION 'calculation lifecycle is locked' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM bpm_template_items i WHERE i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable AND NOT EXISTS(SELECT 1 FROM inspection_bpm_responses r WHERE r.inspection_id=ins.id AND r.bpm_item_id=i.id)) THEN RAISE EXCEPTION 'all evaluable BPM items require responses' USING ERRCODE='23514'; END IF;
  SELECT count(*),count(*) FILTER(WHERE f.code IN('VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING')),coalesce(sum(f.weight),0) INTO factor_count,factor_codes,weights FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id AND o.risk_factor_id=f.id WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id;
  IF factor_count<>6 OR factor_codes<>6 OR weights<>1.0000 THEN RAISE EXCEPTION 'six official risk factors with total weight 1 required' USING ERRCODE='23514'; END IF;
  SELECT max(risk_score_snapshot)::numeric INTO product_score FROM inspection_food_snapshots WHERE inspection_id=ins.id AND risk_score_snapshot IS NOT NULL; IF product_score IS NULL THEN RAISE EXCEPTION 'NO_APPLICABLE_FOOD_RISK' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(CASE r.response_value WHEN 'C' THEN 1 WHEN 'CP' THEN .5 ELSE 0 END),0),count(*) FILTER(WHERE r.response_value<>'NA') INTO numerator,denominator FROM bpm_template_items i JOIN inspection_bpm_responses r ON r.bpm_item_id=i.id AND r.inspection_id=ins.id WHERE i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable; IF denominator=0 THEN RAISE EXCEPTION 'NO_APPLICABLE_BPM_RESPONSES' USING ERRCODE='23514'; END IF;
  SELECT sum(o.score*f.weight) INTO establishment_score FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id AND o.risk_factor_id=f.id WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id; total_score:=product_score*establishment_score;
  SELECT count(*) INTO range_count FROM inspection_frequency_ranges fr WHERE fr.risk_rule_version_id=ins.risk_rule_version_id AND (total_score>fr.lower_bound OR (fr.lower_inclusive AND total_score=fr.lower_bound)) AND (fr.upper_bound IS NULL OR total_score<fr.upper_bound OR (fr.upper_inclusive AND total_score=fr.upper_bound)); IF range_count<>1 THEN RAISE EXCEPTION 'NO_FREQUENCY_RANGE' USING ERRCODE='23514'; END IF;
  SELECT * INTO range_row FROM inspection_frequency_ranges fr WHERE fr.risk_rule_version_id=ins.risk_rule_version_id AND (total_score>fr.lower_bound OR (fr.lower_inclusive AND total_score=fr.lower_bound)) AND (fr.upper_bound IS NULL OR total_score<fr.upper_bound OR (fr.upper_inclusive AND total_score=fr.upper_bound));
  SELECT id INTO old_calc FROM inspection_calculations WHERE inspection_id=ins.id AND is_current FOR UPDATE;
  IF old_calc IS NOT NULL THEN PERFORM set_config('app.report_archive_calculation_id',old_calc::text,true); UPDATE inspection_reports SET archived_at=clock_timestamp(),archived_by_user_id=p_calculated_by_user_id,updated_at=clock_timestamp() WHERE inspection_id=ins.id AND calculation_id=old_calc AND status='DRAFT' AND archived_at IS NULL; END IF;
  UPDATE inspection_calculations SET status='SUPERSEDED',is_current=false,superseded_at=clock_timestamp(),superseded_by_user_id=p_calculated_by_user_id WHERE inspection_id=ins.id AND is_current;
  SELECT coalesce(max(calculation_number),0)+1 INTO next_number FROM inspection_calculations WHERE inspection_id=ins.id;
  INSERT INTO inspection_calculations(inspection_id,calculation_number,bpm_template_version_id,risk_rule_version_id,inspection_content_revision,bpm_numerator,bpm_denominator,bpm_percentage,product_risk_score,establishment_risk_score,total_risk_score,frequency,frequency_range_id,calculation_reason,calculated_by_user_id,calculated_at) VALUES(ins.id,next_number,ins.bpm_template_version_id,ins.risk_rule_version_id,ins.content_revision,numerator,denominator,numerator/denominator*100,product_score,establishment_score,total_score,range_row.frequency,range_row.id,NULLIF(btrim(p_reason),''),p_calculated_by_user_id,clock_timestamp()) RETURNING id INTO calc_id;
  INSERT INTO inspection_calculation_bpm_snapshots(calculation_id,bpm_item_id,display_code_snapshot,response_value,response_score,is_applicable) SELECT calc_id,r.bpm_item_id,i.display_code,r.response_value,CASE r.response_value WHEN 'C' THEN 1 WHEN 'CP' THEN .5 WHEN 'IT' THEN 0 ELSE NULL END,r.response_value<>'NA' FROM inspection_bpm_responses r JOIN bpm_template_items i ON i.id=r.bpm_item_id WHERE r.inspection_id=ins.id AND i.template_version_id=ins.bpm_template_version_id AND i.item_kind='CRITERION' AND i.is_evaluable;
  INSERT INTO inspection_calculation_factor_snapshots(calculation_id,risk_factor_id,factor_code_snapshot,factor_name_snapshot,weight_snapshot,risk_factor_option_id,option_code_snapshot,option_label_snapshot,selected_score_snapshot,weighted_contribution,sort_order_snapshot) SELECT calc_id,f.id,f.code,f.name,f.weight,o.id,o.code,o.label,o.score,o.score*f.weight,f.sort_order FROM inspection_risk_factor_selections s JOIN risk_factors f ON f.id=s.risk_factor_id JOIN risk_factor_options o ON o.id=s.risk_factor_option_id AND o.risk_factor_id=f.id WHERE s.inspection_id=ins.id AND f.risk_rule_version_id=ins.risk_rule_version_id;
  INSERT INTO inspection_calculation_food_snapshots(calculation_id,inspection_food_snapshot_id,food_risk_subcategory_id,category_code_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot,is_applicable) SELECT calc_id,x.id,x.food_risk_subcategory_id,x.category_code_snapshot,x.subcategory_name_snapshot,x.microbiological_risk_snapshot,x.risk_score_snapshot,x.risk_score_snapshot IS NOT NULL FROM inspection_food_snapshots x WHERE x.inspection_id=ins.id;
  INSERT INTO inspection_calculation_frequency_snapshots(calculation_id,frequency_range_id,lower_bound_snapshot,upper_bound_snapshot,lower_inclusive_snapshot,upper_inclusive_snapshot,frequency,label_snapshot) VALUES(calc_id,range_row.id,range_row.lower_bound,range_row.upper_bound,range_row.lower_inclusive,range_row.upper_inclusive,range_row.frequency,range_row.label);
  RETURN calc_id;
END $$;

CREATE OR REPLACE FUNCTION close_inspection(p_inspection uuid,p_report uuid,p_actor uuid,p_reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE ins inspections%ROWTYPE; report inspection_reports%ROWTYPE; cycle inspection_review_cycles%ROWTYPE; calc inspection_calculations%ROWTYPE; existing inspection_closures%ROWTYPE; active_assignment uuid; normalized_reason text; closure_id uuid;
BEGIN
  normalized_reason:=COALESCE(NULLIF(btrim(p_reason),''),'Case closed');
  SELECT * INTO ins FROM inspections WHERE id=p_inspection FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'inspection not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO existing FROM inspection_closures WHERE inspection_id=ins.id FOR UPDATE;
  IF FOUND THEN IF existing.official_report_id=p_report AND existing.closed_by_user_id=p_actor AND existing.closure_reason=normalized_reason THEN RETURN existing.id; END IF; RAISE EXCEPTION 'closure identity conflict' USING ERRCODE='23505'; END IF;
  IF NOT review_actor_is_global(p_actor) OR ins.status<>'SUBMITTED' THEN RAISE EXCEPTION 'closure actor or inspection invalid' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM cases WHERE id=ins.case_id AND status='ASSIGNED' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'case cannot close' USING ERRCODE='23514'; END IF;
  SELECT * INTO report FROM inspection_reports WHERE id=p_report AND inspection_id=ins.id FOR UPDATE; SELECT * INTO cycle FROM inspection_review_cycles WHERE id=report.review_cycle_id FOR UPDATE; SELECT * INTO calc FROM inspection_calculations WHERE id=report.calculation_id FOR UPDATE;
  IF NOT FOUND OR report.status<>'OFFICIAL' OR cycle.status<>'APPROVED' OR cycle.current_calculation_id<>calc.id OR NOT calc.is_current OR calc.inspection_content_revision<>ins.content_revision THEN RAISE EXCEPTION 'closure requires current approved official report' USING ERRCODE='23514'; END IF;
  SELECT id INTO active_assignment FROM case_assignments WHERE case_id=ins.case_id AND is_active FOR UPDATE; IF active_assignment IS NULL THEN RAISE EXCEPTION 'closure requires active assignment' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM case_schedule_entries WHERE case_id=ins.case_id AND status='SCHEDULED' FOR UPDATE;
  PERFORM set_config('app.actor_user_id',p_actor::text,true); PERFORM set_config('app.schedule_change_reason',normalized_reason,true);
  UPDATE case_schedule_entries SET status='CANCELLED',cancellation_reason=normalized_reason,cancelled_at=clock_timestamp(),cancelled_by_user_id=p_actor WHERE case_id=ins.case_id AND status='SCHEDULED';
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=p_actor,change_reason=normalized_reason WHERE id=active_assignment;
  UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason=normalized_reason WHERE id=ins.case_id;
  INSERT INTO inspection_closures(inspection_id,case_id,official_report_id,closed_by_user_id,closure_reason) VALUES(ins.id,ins.case_id,report.id,p_actor,normalized_reason) RETURNING id INTO closure_id;
  RETURN closure_id;
END $$;

DROP TRIGGER IF EXISTS reviews_guard ON inspection_review_cycles;
DROP TRIGGER IF EXISTS correction_guard ON inspection_review_correction_items;
DROP TRIGGER IF EXISTS reports_guard ON inspection_reports;
CREATE TRIGGER reviews_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_review_cycles FOR EACH ROW EXECUTE FUNCTION review_guard();
CREATE TRIGGER reviews_version BEFORE UPDATE ON inspection_review_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER correction_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_review_correction_items FOR EACH ROW EXECUTE FUNCTION correction_guard();
CREATE TRIGGER reports_guard BEFORE INSERT OR UPDATE OR DELETE ON inspection_reports FOR EACH ROW EXECUTE FUNCTION report_guard();
CREATE TRIGGER reports_version BEFORE UPDATE ON inspection_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE OR REPLACE FUNCTION immutable_review_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'review events immutable' USING ERRCODE='55000'; END $$;
CREATE TRIGGER inspection_review_events_immutable BEFORE UPDATE OR DELETE ON inspection_review_events FOR EACH ROW EXECUTE FUNCTION immutable_review_event();
