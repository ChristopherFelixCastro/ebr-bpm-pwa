-- Local development only. It preserves prior objects and refuses to discard ASSIGNED history.
DROP TABLE IF EXISTS case_schedule_transitions;
DROP TABLE IF EXISTS case_schedule_entries;
DROP TABLE IF EXISTS case_assignment_transitions;
DROP TABLE IF EXISTS case_assignments;
DROP FUNCTION IF EXISTS reject_case_schedule_transition_mutation();
DROP FUNCTION IF EXISTS reject_case_assignment_transition_mutation();
DROP FUNCTION IF EXISTS case_schedule_history();
DROP FUNCTION IF EXISTS case_schedule_guard();
DROP FUNCTION IF EXISTS case_assignment_apply();
DROP FUNCTION IF EXISTS case_assignment_guard();
DROP TRIGGER IF EXISTS cases_state_guard ON cases;
DROP TRIGGER IF EXISTS cases_status_history ON cases;
DROP TRIGGER IF EXISTS health_alerts_case_sync ON health_alerts;
DROP TRIGGER IF EXISTS complaints_case_sync ON complaints;
DROP FUNCTION IF EXISTS case_state_guard();
DROP FUNCTION IF EXISTS record_case_status_transition();
DROP FUNCTION IF EXISTS sync_case_from_health_alert();
DROP FUNCTION IF EXISTS sync_case_from_complaint();
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_check;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_check1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cases WHERE status = 'ASSIGNED')
    OR EXISTS (SELECT 1 FROM case_status_transitions WHERE from_status = 'ASSIGNED' OR to_status = 'ASSIGNED') THEN
    RAISE EXCEPTION 'cannot revert 0009 while ASSIGNED case history exists';
  END IF;
END $$;

CREATE TYPE case_status_0008 AS ENUM ('PENDING_REVIEW','PENDING_ASSIGNMENT','NO_ACTION','REFERRED','CLOSED');
ALTER TABLE case_status_transitions ALTER COLUMN from_status TYPE case_status_0008 USING from_status::text::case_status_0008;
ALTER TABLE case_status_transitions ALTER COLUMN to_status TYPE case_status_0008 USING to_status::text::case_status_0008;
ALTER TABLE cases ALTER COLUMN status TYPE case_status_0008 USING status::text::case_status_0008;
DROP TYPE case_status;
ALTER TYPE case_status_0008 RENAME TO case_status;

ALTER TABLE cases ADD CONSTRAINT cases_check CHECK ((status IN ('PENDING_REVIEW','PENDING_ASSIGNMENT') AND closed_at IS NULL) OR (status IN ('NO_ACTION','REFERRED','CLOSED') AND closed_at IS NOT NULL));
ALTER TABLE cases ADD CONSTRAINT cases_check1 CHECK (status NOT IN('NO_ACTION','REFERRED') OR (closed_reason IS NOT NULL AND btrim(closed_reason)<>''));
CREATE OR REPLACE FUNCTION case_state_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='INSERT' THEN IF (NEW.origin IN('COMPANY_REQUEST','INSTITUTIONAL_PROGRAM') AND NEW.status<>'PENDING_ASSIGNMENT') OR (NEW.origin IN('HEALTH_ALERT','COMPLAINT') AND NEW.status<>'PENDING_REVIEW') THEN RAISE EXCEPTION 'invalid initial case status'; END IF; RETURN NEW; END IF; IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status='PENDING_REVIEW' AND NEW.status IN('PENDING_ASSIGNMENT','NO_ACTION','REFERRED')) OR (OLD.status='PENDING_ASSIGNMENT' AND NEW.status='CLOSED')) THEN RAISE EXCEPTION 'invalid case transition'; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION record_case_status_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO case_status_transitions(case_id,from_status,to_status,reason) VALUES(NEW.id,OLD.status,NEW.status,CASE WHEN NEW.status IN('NO_ACTION','REFERRED','CLOSED') THEN NEW.closed_reason ELSE NULL END); END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION sync_case_from_health_alert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.decision='PROCEEDS' THEN UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=NEW.case_id AND status='PENDING_REVIEW'; ELSIF NEW.decision='NOT_PROCEEDS' THEN UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason=COALESCE(NULLIF(btrim(NEW.decision_reason),''),'Alerta no procede') WHERE id=NEW.case_id AND status='PENDING_REVIEW'; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION sync_case_from_complaint() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.decision='PROCEEDS' THEN UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=NEW.case_id AND status='PENDING_REVIEW'; ELSIF NEW.decision='NOT_PROCEEDS' THEN UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason='Denuncia no procede' WHERE id=NEW.case_id AND status='PENDING_REVIEW'; ELSIF NEW.decision='REFERRED' THEN UPDATE cases SET status='REFERRED',closed_at=clock_timestamp(),closed_reason=NEW.referral_reason WHERE id=NEW.case_id AND status='PENDING_REVIEW'; END IF; RETURN NEW; END $$;
CREATE TRIGGER cases_state_guard BEFORE INSERT OR UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION case_state_guard();
CREATE TRIGGER cases_status_history AFTER UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION record_case_status_transition();
CREATE TRIGGER health_alerts_case_sync AFTER INSERT OR UPDATE ON health_alerts FOR EACH ROW EXECUTE FUNCTION sync_case_from_health_alert();
CREATE TRIGGER complaints_case_sync AFTER INSERT OR UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION sync_case_from_complaint();
DROP TYPE IF EXISTS case_schedule_event_type;
DROP TYPE IF EXISTS case_schedule_status;
DROP TYPE IF EXISTS case_assignment_event_type;
