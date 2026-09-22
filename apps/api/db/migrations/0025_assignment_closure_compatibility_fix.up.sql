CREATE OR REPLACE FUNCTION close_inspection(p_inspection uuid,p_report uuid,p_actor uuid,p_reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE inspection_case uuid; active_assignment uuid; active_schedule uuid; closure_id uuid; normalized_reason text;
BEGIN
  normalized_reason:=COALESCE(NULLIF(btrim(p_reason),''),'Case closed');
  SELECT case_id INTO inspection_case FROM inspections WHERE id=p_inspection FOR UPDATE;
  IF inspection_case IS NULL THEN RAISE EXCEPTION 'inspection not found' USING ERRCODE='23514'; END IF;
  PERFORM 1 FROM cases WHERE id=inspection_case FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM inspection_review_cycles WHERE inspection_id=p_inspection AND status='APPROVED') THEN RAISE EXCEPTION 'closure requires approved review' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM inspection_reports WHERE id=p_report AND inspection_id=p_inspection AND status='OFFICIAL') THEN RAISE EXCEPTION 'closure requires official report' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=inspection_case AND status='ASSIGNED') THEN RAISE EXCEPTION 'case cannot close' USING ERRCODE='23514'; END IF;
  SELECT id INTO active_assignment FROM case_assignments WHERE case_id=inspection_case AND is_active FOR UPDATE;
  IF active_assignment IS NULL THEN RAISE EXCEPTION 'closure requires active assignment' USING ERRCODE='23514'; END IF;
  SELECT id INTO active_schedule FROM case_schedule_entries WHERE case_id=inspection_case AND status='SCHEDULED' FOR UPDATE;
  IF active_schedule IS NOT NULL THEN
    PERFORM set_config('app.actor_user_id',p_actor::text,true);
    PERFORM set_config('app.schedule_change_reason',normalized_reason,true);
    UPDATE case_schedule_entries SET status='CANCELLED',cancellation_reason=normalized_reason,cancelled_at=clock_timestamp(),cancelled_by_user_id=p_actor WHERE id=active_schedule;
  END IF;
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=p_actor,change_reason=normalized_reason WHERE id=active_assignment;
  UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason=normalized_reason WHERE id=inspection_case AND status='ASSIGNED';
  IF NOT FOUND THEN RAISE EXCEPTION 'case cannot close' USING ERRCODE='23514'; END IF;
  INSERT INTO inspection_closures(inspection_id,case_id,official_report_id,closed_by_user_id,closure_reason) VALUES(p_inspection,inspection_case,p_report,p_actor,normalized_reason) RETURNING id INTO closure_id;
  RETURN closure_id;
END $$;
