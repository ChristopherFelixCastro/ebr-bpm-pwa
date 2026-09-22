-- Rebuild the enum in one transaction: PostgreSQL does not permit safely using an
-- enum value added in the same transaction in a new constraint or trigger.
DROP TRIGGER cases_state_guard ON cases;
DROP TRIGGER cases_status_history ON cases;
DROP TRIGGER health_alerts_case_sync ON health_alerts;
DROP TRIGGER complaints_case_sync ON complaints;
DROP FUNCTION case_state_guard();
DROP FUNCTION record_case_status_transition();
DROP FUNCTION sync_case_from_health_alert();
DROP FUNCTION sync_case_from_complaint();
ALTER TABLE cases DROP CONSTRAINT cases_check;
ALTER TABLE cases DROP CONSTRAINT cases_check1;
CREATE TYPE case_status_0009 AS ENUM ('PENDING_REVIEW','PENDING_ASSIGNMENT','ASSIGNED','NO_ACTION','REFERRED','CLOSED');
ALTER TABLE case_status_transitions ALTER COLUMN from_status TYPE case_status_0009 USING from_status::text::case_status_0009;
ALTER TABLE case_status_transitions ALTER COLUMN to_status TYPE case_status_0009 USING to_status::text::case_status_0009;
ALTER TABLE cases ALTER COLUMN status TYPE case_status_0009 USING status::text::case_status_0009;
DROP TYPE case_status;
ALTER TYPE case_status_0009 RENAME TO case_status;
ALTER TABLE cases ADD CONSTRAINT cases_check CHECK (
  (status IN ('PENDING_REVIEW','PENDING_ASSIGNMENT','ASSIGNED') AND closed_at IS NULL)
  OR (status IN ('NO_ACTION','REFERRED','CLOSED') AND closed_at IS NOT NULL)
);
ALTER TABLE cases ADD CONSTRAINT cases_check1 CHECK (status NOT IN('NO_ACTION','REFERRED') OR (closed_reason IS NOT NULL AND btrim(closed_reason)<>''));

CREATE TYPE case_assignment_event_type AS ENUM ('ASSIGNED','REASSIGNED','UNASSIGNED');
CREATE TYPE case_schedule_status AS ENUM ('SCHEDULED','RESCHEDULED','CANCELLED');
CREATE TYPE case_schedule_event_type AS ENUM ('SCHEDULED','RESCHEDULED','CANCELLED');

CREATE TABLE case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  evaluator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  unassigned_at timestamptz,
  unassigned_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  change_reason text,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_active AND unassigned_at IS NULL AND unassigned_by_user_id IS NULL)
      OR (NOT is_active AND unassigned_at IS NOT NULL AND unassigned_by_user_id IS NOT NULL AND unassigned_at >= assigned_at))
);
CREATE UNIQUE INDEX case_assignments_one_active_idx ON case_assignments(case_id) WHERE is_active;
CREATE INDEX case_assignments_evaluator_active_idx ON case_assignments(evaluator_user_id, assigned_at DESC) WHERE is_active;

CREATE TABLE case_assignment_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_assignment_id uuid NOT NULL REFERENCES case_assignments(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  event_type case_assignment_event_type NOT NULL,
  from_evaluator_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  to_evaluator_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  performed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((event_type = 'ASSIGNED' AND from_evaluator_user_id IS NULL AND to_evaluator_user_id IS NOT NULL)
      OR (event_type = 'REASSIGNED' AND from_evaluator_user_id IS NOT NULL AND to_evaluator_user_id IS NOT NULL)
      OR (event_type = 'UNASSIGNED' AND from_evaluator_user_id IS NOT NULL AND to_evaluator_user_id IS NULL))
);

CREATE TABLE case_schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  case_assignment_id uuid REFERENCES case_assignments(id) ON DELETE RESTRICT,
  rescheduled_from_schedule_id uuid REFERENCES case_schedule_entries(id) ON DELETE RESTRICT,
  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz NOT NULL,
  timezone varchar(64) NOT NULL DEFAULT 'America/Santo_Domingo',
  status case_schedule_status NOT NULL DEFAULT 'SCHEDULED',
  scheduled_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scheduled_end_at > scheduled_start_at),
  CHECK ((status IN ('SCHEDULED','RESCHEDULED') AND cancellation_reason IS NULL AND cancelled_at IS NULL AND cancelled_by_user_id IS NULL)
      OR (status = 'CANCELLED' AND cancellation_reason IS NOT NULL AND btrim(cancellation_reason) <> '' AND cancelled_at IS NOT NULL AND cancelled_by_user_id IS NOT NULL))
);
CREATE UNIQUE INDEX case_schedule_one_active_idx ON case_schedule_entries(case_id) WHERE status = 'SCHEDULED';
CREATE INDEX case_schedule_assignment_window_idx ON case_schedule_entries(case_assignment_id, scheduled_start_at, scheduled_end_at) WHERE status = 'SCHEDULED';
CREATE INDEX case_schedule_active_window_idx ON case_schedule_entries(scheduled_start_at, scheduled_end_at) WHERE status = 'SCHEDULED';

CREATE TABLE case_schedule_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_entry_id uuid NOT NULL REFERENCES case_schedule_entries(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  event_type case_schedule_event_type NOT NULL,
  previous_schedule_entry_id uuid REFERENCES case_schedule_entries(id) ON DELETE RESTRICT,
  performed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION case_state_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (NEW.origin IN ('COMPANY_REQUEST','INSTITUTIONAL_PROGRAM') AND NEW.status <> 'PENDING_ASSIGNMENT')
      OR (NEW.origin IN ('HEALTH_ALERT','COMPLAINT') AND NEW.status <> 'PENDING_REVIEW') THEN
      RAISE EXCEPTION 'invalid initial case status';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('PENDING_ASSIGNMENT','NO_ACTION','REFERRED'))
    OR (OLD.status = 'PENDING_ASSIGNMENT' AND NEW.status = 'ASSIGNED')
    OR (OLD.status = 'ASSIGNED' AND NEW.status = 'CLOSED')
  ) THEN
    RAISE EXCEPTION 'invalid case transition';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION record_case_status_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO case_status_transitions(case_id,from_status,to_status,reason)
    VALUES(NEW.id,OLD.status,NEW.status,CASE WHEN NEW.status IN('NO_ACTION','REFERRED','CLOSED') THEN NEW.closed_reason ELSE NULL END);
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION sync_case_from_health_alert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.decision='PROCEEDS' THEN
    UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=NEW.case_id AND status='PENDING_REVIEW';
  ELSIF NEW.decision='NOT_PROCEEDS' THEN
    UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason=COALESCE(NULLIF(btrim(NEW.decision_reason),''),'Alerta no procede') WHERE id=NEW.case_id AND status='PENDING_REVIEW';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION sync_case_from_complaint() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.decision='PROCEEDS' THEN
    UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=NEW.case_id AND status='PENDING_REVIEW';
  ELSIF NEW.decision='NOT_PROCEEDS' THEN
    UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason='Denuncia no procede' WHERE id=NEW.case_id AND status='PENDING_REVIEW';
  ELSIF NEW.decision='REFERRED' THEN
    UPDATE cases SET status='REFERRED',closed_at=clock_timestamp(),closed_reason=NEW.referral_reason WHERE id=NEW.case_id AND status='PENDING_REVIEW';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION case_assignment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status case_status;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'case assignments are historical and cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO current_status FROM cases WHERE id = NEW.case_id FOR UPDATE;
    IF current_status NOT IN ('PENDING_ASSIGNMENT','ASSIGNED') THEN RAISE EXCEPTION 'case is not assignable'; END IF;
    IF current_status = 'PENDING_ASSIGNMENT' AND EXISTS (SELECT 1 FROM case_assignments WHERE case_id = NEW.case_id) THEN RAISE EXCEPTION 'initial assignment already exists'; END IF;
    IF NOT NEW.is_active THEN RAISE EXCEPTION 'assignments must start active'; END IF;
    RETURN NEW;
  END IF;
  IF NOT OLD.is_active THEN RAISE EXCEPTION 'inactive assignment is immutable'; END IF;
  IF NEW.is_active THEN RAISE EXCEPTION 'active assignment may only be closed once'; END IF;
  IF NEW.case_id <> OLD.case_id OR NEW.evaluator_user_id <> OLD.evaluator_user_id OR NEW.assigned_by_user_id <> OLD.assigned_by_user_id OR NEW.assigned_at <> OLD.assigned_at THEN
    RAISE EXCEPTION 'assignment identity is immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION case_assignment_apply() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior_evaluator uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT evaluator_user_id INTO prior_evaluator FROM case_assignments WHERE case_id = NEW.case_id AND id <> NEW.id ORDER BY assigned_at DESC LIMIT 1;
    UPDATE cases SET status = 'ASSIGNED' WHERE id = NEW.case_id AND status = 'PENDING_ASSIGNMENT';
    INSERT INTO case_assignment_transitions(case_assignment_id,case_id,event_type,from_evaluator_user_id,to_evaluator_user_id,performed_by_user_id,reason)
    VALUES(NEW.id,NEW.case_id,CASE WHEN prior_evaluator IS NULL THEN 'ASSIGNED' ELSE 'REASSIGNED' END,prior_evaluator,NEW.evaluator_user_id,NEW.assigned_by_user_id,NEW.change_reason);
  ELSE
    INSERT INTO case_assignment_transitions(case_assignment_id,case_id,event_type,from_evaluator_user_id,to_evaluator_user_id,performed_by_user_id,reason)
    VALUES(NEW.id,NEW.case_id,'UNASSIGNED',OLD.evaluator_user_id,NULL,NEW.unassigned_by_user_id,NEW.change_reason);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION case_schedule_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignment_case uuid; assignment_active boolean; current_status case_status;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'schedule history cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SCHEDULED' THEN RAISE EXCEPTION 'new schedules must start scheduled'; END IF;
    SELECT status INTO current_status FROM cases WHERE id = NEW.case_id;
    IF current_status <> 'ASSIGNED' THEN RAISE EXCEPTION 'case must be assigned before scheduling'; END IF;
    IF NEW.case_assignment_id IS NOT NULL THEN
      SELECT case_id,is_active INTO assignment_case,assignment_active FROM case_assignments WHERE id = NEW.case_assignment_id;
      IF assignment_case IS DISTINCT FROM NEW.case_id OR assignment_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'schedule assignment must be active and belong to case'; END IF;
    END IF;
    IF NEW.rescheduled_from_schedule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM case_schedule_entries WHERE id = NEW.rescheduled_from_schedule_id AND case_id = NEW.case_id AND status = 'RESCHEDULED') THEN
      RAISE EXCEPTION 'rescheduled schedule predecessor is invalid';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'SCHEDULED' THEN RAISE EXCEPTION 'inactive schedule is immutable'; END IF;
  IF NEW.status NOT IN ('RESCHEDULED','CANCELLED') THEN RAISE EXCEPTION 'scheduled entry must be closed by reschedule or cancellation'; END IF;
  IF NEW.case_id <> OLD.case_id OR NEW.case_assignment_id IS DISTINCT FROM OLD.case_assignment_id OR NEW.rescheduled_from_schedule_id IS DISTINCT FROM OLD.rescheduled_from_schedule_id OR NEW.scheduled_start_at <> OLD.scheduled_start_at OR NEW.scheduled_end_at <> OLD.scheduled_end_at OR NEW.timezone <> OLD.timezone OR NEW.scheduled_by_user_id <> OLD.scheduled_by_user_id OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    RAISE EXCEPTION 'schedule details are immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION case_schedule_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,previous_schedule_entry_id,performed_by_user_id,reason)
    VALUES(NEW.id,NEW.case_id,'SCHEDULED',NEW.rescheduled_from_schedule_id,NEW.scheduled_by_user_id,NULL);
  ELSIF NEW.status = 'RESCHEDULED' THEN
    INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,performed_by_user_id)
    VALUES(NEW.id,NEW.case_id,'RESCHEDULED',NEW.scheduled_by_user_id);
  ELSE
    INSERT INTO case_schedule_transitions(schedule_entry_id,case_id,event_type,performed_by_user_id,reason)
    VALUES(NEW.id,NEW.case_id,'CANCELLED',NEW.cancelled_by_user_id,NEW.cancellation_reason);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION reject_case_assignment_transition_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'assignment transitions are immutable'; END $$;
CREATE OR REPLACE FUNCTION reject_case_schedule_transition_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'schedule transitions are immutable'; END $$;

CREATE TRIGGER case_assignments_guard BEFORE INSERT OR UPDATE OR DELETE ON case_assignments FOR EACH ROW EXECUTE FUNCTION case_assignment_guard();
CREATE TRIGGER cases_state_guard BEFORE INSERT OR UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION case_state_guard();
CREATE TRIGGER cases_status_history AFTER UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION record_case_status_transition();
CREATE TRIGGER health_alerts_case_sync AFTER INSERT OR UPDATE ON health_alerts FOR EACH ROW EXECUTE FUNCTION sync_case_from_health_alert();
CREATE TRIGGER complaints_case_sync AFTER INSERT OR UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION sync_case_from_complaint();
CREATE TRIGGER case_assignments_apply AFTER INSERT OR UPDATE ON case_assignments FOR EACH ROW EXECUTE FUNCTION case_assignment_apply();
CREATE TRIGGER case_assignments_version BEFORE UPDATE ON case_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER case_assignment_transitions_immutable BEFORE UPDATE OR DELETE ON case_assignment_transitions FOR EACH ROW EXECUTE FUNCTION reject_case_assignment_transition_mutation();
CREATE TRIGGER case_schedule_guard_trigger BEFORE INSERT OR UPDATE OR DELETE ON case_schedule_entries FOR EACH ROW EXECUTE FUNCTION case_schedule_guard();
CREATE TRIGGER case_schedule_history_trigger AFTER INSERT OR UPDATE ON case_schedule_entries FOR EACH ROW EXECUTE FUNCTION case_schedule_history();
CREATE TRIGGER case_schedule_version BEFORE UPDATE ON case_schedule_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER case_schedule_transitions_immutable BEFORE UPDATE OR DELETE ON case_schedule_transitions FOR EACH ROW EXECUTE FUNCTION reject_case_schedule_transition_mutation();
