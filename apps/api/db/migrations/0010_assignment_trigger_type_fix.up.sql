CREATE OR REPLACE FUNCTION case_assignment_apply() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior_evaluator uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT evaluator_user_id INTO prior_evaluator FROM case_assignments WHERE case_id = NEW.case_id AND id <> NEW.id ORDER BY assigned_at DESC LIMIT 1;
    UPDATE cases SET status = 'ASSIGNED' WHERE id = NEW.case_id AND status = 'PENDING_ASSIGNMENT';
    INSERT INTO case_assignment_transitions(case_assignment_id,case_id,event_type,from_evaluator_user_id,to_evaluator_user_id,performed_by_user_id,reason)
    VALUES(
      NEW.id,
      NEW.case_id,
      (CASE WHEN prior_evaluator IS NULL THEN 'ASSIGNED' ELSE 'REASSIGNED' END)::case_assignment_event_type,
      prior_evaluator,
      NEW.evaluator_user_id,
      NEW.assigned_by_user_id,
      NEW.change_reason
    );
  ELSE
    INSERT INTO case_assignment_transitions(case_assignment_id,case_id,event_type,from_evaluator_user_id,to_evaluator_user_id,performed_by_user_id,reason)
    VALUES(NEW.id,NEW.case_id,'UNASSIGNED',OLD.evaluator_user_id,NULL,NEW.unassigned_by_user_id,NEW.change_reason);
  END IF;
  RETURN NEW;
END $$;
