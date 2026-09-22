DROP TRIGGER IF EXISTS schedules_assignment_integrity ON case_schedule_entries;
DROP TRIGGER IF EXISTS assignments_schedule_integrity ON case_assignments;
DROP TRIGGER IF EXISTS cases_schedule_integrity ON cases;
DROP FUNCTION IF EXISTS case_schedule_integrity_trigger();
DROP FUNCTION IF EXISTS assert_case_schedule_integrity(uuid);
DROP TRIGGER IF EXISTS assignments_case_integrity ON case_assignments;
DROP TRIGGER IF EXISTS cases_assignment_integrity ON cases;
DROP FUNCTION IF EXISTS case_assignment_integrity_trigger();
DROP FUNCTION IF EXISTS assert_case_assignment_integrity(uuid);

CREATE OR REPLACE FUNCTION case_assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status case_status;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'case assignments are historical and cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT status INTO current_status FROM cases WHERE id=NEW.case_id FOR UPDATE;
    IF current_status NOT IN('PENDING_ASSIGNMENT','ASSIGNED') THEN RAISE EXCEPTION 'case is not assignable'; END IF;
    IF current_status='PENDING_ASSIGNMENT' AND EXISTS(SELECT 1 FROM case_assignments WHERE case_id=NEW.case_id) THEN RAISE EXCEPTION 'initial assignment already exists'; END IF;
    IF NOT NEW.is_active THEN RAISE EXCEPTION 'assignments must start active'; END IF;
    RETURN NEW;
  END IF;
  IF NOT OLD.is_active THEN RAISE EXCEPTION 'inactive assignment is immutable'; END IF;
  IF NEW.is_active THEN RAISE EXCEPTION 'active assignment may only be closed once'; END IF;
  IF NEW.case_id<>OLD.case_id OR NEW.evaluator_user_id<>OLD.evaluator_user_id OR NEW.assigned_by_user_id<>OLD.assigned_by_user_id OR NEW.assigned_at<>OLD.assigned_at THEN RAISE EXCEPTION 'assignment identity is immutable'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION case_schedule_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_active boolean; current_status case_status;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'schedule history cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'SCHEDULED' THEN RAISE EXCEPTION 'new schedules must start scheduled'; END IF;
    SELECT status INTO current_status FROM cases WHERE id=NEW.case_id;
    IF current_status<>'ASSIGNED' THEN RAISE EXCEPTION 'case must be assigned before scheduling'; END IF;
    IF NEW.case_assignment_id IS NOT NULL THEN SELECT case_id,is_active INTO assignment_case,assignment_active FROM case_assignments WHERE id=NEW.case_assignment_id; IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'schedule assignment must be active and belong to case'; END IF; END IF;
    IF NEW.rescheduled_from_schedule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=NEW.rescheduled_from_schedule_id AND case_id=NEW.case_id AND status='RESCHEDULED') THEN RAISE EXCEPTION 'rescheduled schedule predecessor is invalid'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status<>'SCHEDULED' THEN RAISE EXCEPTION 'inactive schedule is immutable'; END IF;
  IF NEW.status NOT IN('RESCHEDULED','CANCELLED') THEN RAISE EXCEPTION 'scheduled entry must be closed by reschedule or cancellation'; END IF;
  IF NEW.case_id<>OLD.case_id OR NEW.case_assignment_id IS DISTINCT FROM OLD.case_assignment_id OR NEW.rescheduled_from_schedule_id IS DISTINCT FROM OLD.rescheduled_from_schedule_id OR NEW.scheduled_start_at<>OLD.scheduled_start_at OR NEW.scheduled_end_at<>OLD.scheduled_end_at OR NEW.timezone<>OLD.timezone OR NEW.scheduled_by_user_id<>OLD.scheduled_by_user_id OR NEW.notes IS DISTINCT FROM OLD.notes THEN RAISE EXCEPTION 'schedule details are immutable'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION case_schedule_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,previous_schedule_entry_id,performed_by_user_id,reason) VALUES(NEW.id,NEW.case_id,'SCHEDULED',NEW.rescheduled_from_schedule_id,NEW.scheduled_by_user_id,NULL);
  ELSIF NEW.status='RESCHEDULED' THEN INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,performed_by_user_id) VALUES(NEW.id,NEW.case_id,'RESCHEDULED',NEW.scheduled_by_user_id);
  ELSE INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,performed_by_user_id,reason) VALUES(NEW.id,NEW.case_id,'CANCELLED',NEW.cancelled_by_user_id,NEW.cancellation_reason); END IF;
  RETURN NEW;
END $$;
