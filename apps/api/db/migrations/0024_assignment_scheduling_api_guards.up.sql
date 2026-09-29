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

CREATE OR REPLACE FUNCTION assert_case_assignment_integrity(target_case uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_status case_status; active_count integer;
BEGIN
  SELECT status INTO current_status FROM cases WHERE id=target_case;
  IF current_status IS NULL THEN RETURN; END IF;
  SELECT count(*)::integer INTO active_count FROM case_assignments WHERE case_id=target_case AND is_active;
  IF current_status='PENDING_ASSIGNMENT' AND active_count<>0 THEN RAISE EXCEPTION 'pending assignment case cannot have active assignment' USING ERRCODE='23514'; END IF;
  IF current_status='ASSIGNED' AND active_count<>1 THEN RAISE EXCEPTION 'assigned case requires exactly one active assignment' USING ERRCODE='23514'; END IF;
  IF current_status='CLOSED' AND active_count<>0 THEN RAISE EXCEPTION 'closed case cannot have active assignment' USING ERRCODE='23514'; END IF;
  IF active_count>0 AND current_status<>'ASSIGNED' THEN RAISE EXCEPTION 'active assignment requires assigned case' USING ERRCODE='23514'; END IF;
END $$;
CREATE OR REPLACE FUNCTION case_assignment_integrity_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='cases' THEN PERFORM assert_case_assignment_integrity(CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END);
  ELSE
    IF TG_OP IN('UPDATE','DELETE') THEN PERFORM assert_case_assignment_integrity(OLD.case_id); END IF;
    IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.case_id IS DISTINCT FROM OLD.case_id) THEN PERFORM assert_case_assignment_integrity(NEW.case_id); END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER cases_assignment_integrity AFTER INSERT OR UPDATE OR DELETE ON cases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION case_assignment_integrity_trigger();
CREATE CONSTRAINT TRIGGER assignments_case_integrity AFTER INSERT OR UPDATE OR DELETE ON case_assignments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION case_assignment_integrity_trigger();

CREATE OR REPLACE FUNCTION case_schedule_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_active boolean; current_status case_status;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'schedule history cannot be deleted' USING ERRCODE='55000'; END IF;
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

CREATE OR REPLACE FUNCTION case_schedule_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_setting uuid; reason_setting text;
BEGIN
  actor_setting:=NULLIF(current_setting('app.actor_user_id',true),'')::uuid;
  reason_setting:=NULLIF(current_setting('app.schedule_change_reason',true),'');
  IF TG_OP='INSERT' THEN
    INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,previous_schedule_entry_id,performed_by_user_id,reason) VALUES(NEW.id,NEW.case_id,'SCHEDULED',NEW.rescheduled_from_schedule_id,NEW.scheduled_by_user_id,reason_setting);
  ELSIF NEW.status='RESCHEDULED' THEN
    INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,performed_by_user_id,reason) VALUES(NEW.id,NEW.case_id,'RESCHEDULED',COALESCE(actor_setting,NEW.scheduled_by_user_id),reason_setting);
  ELSE
    INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,performed_by_user_id,reason) VALUES(NEW.id,NEW.case_id,'CANCELLED',NEW.cancelled_by_user_id,NEW.cancellation_reason);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION assert_case_schedule_integrity(target_case uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE invalid_count integer;
BEGIN
  SELECT count(*)::integer INTO invalid_count
  FROM case_schedule_entries s
  LEFT JOIN case_assignments a ON a.id=s.case_assignment_id
  LEFT JOIN cases c ON c.id=s.case_id
  WHERE s.case_id=target_case AND s.status='SCHEDULED'
    AND (s.case_assignment_id IS NULL OR a.id IS NULL OR NOT a.is_active OR a.case_id<>s.case_id OR c.status<>'ASSIGNED');
  IF invalid_count>0 THEN RAISE EXCEPTION 'scheduled entry requires active assignment for assigned case' USING ERRCODE='23514'; END IF;
END $$;
CREATE OR REPLACE FUNCTION case_schedule_integrity_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='cases' THEN PERFORM assert_case_schedule_integrity(CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END);
  ELSE
    IF TG_OP IN('UPDATE','DELETE') THEN PERFORM assert_case_schedule_integrity(OLD.case_id); END IF;
    IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.case_id IS DISTINCT FROM OLD.case_id) THEN PERFORM assert_case_schedule_integrity(NEW.case_id); END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER cases_schedule_integrity AFTER INSERT OR UPDATE OR DELETE ON cases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION case_schedule_integrity_trigger();
CREATE CONSTRAINT TRIGGER assignments_schedule_integrity AFTER INSERT OR UPDATE OR DELETE ON case_assignments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION case_schedule_integrity_trigger();
CREATE CONSTRAINT TRIGGER schedules_assignment_integrity AFTER INSERT OR UPDATE OR DELETE ON case_schedule_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION case_schedule_integrity_trigger();
