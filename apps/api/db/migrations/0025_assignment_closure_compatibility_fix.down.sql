CREATE OR REPLACE FUNCTION close_inspection(p_inspection uuid,p_report uuid,p_actor uuid,p_reason text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE c uuid; x uuid;
BEGIN
  SELECT case_id INTO c FROM inspections WHERE id=p_inspection FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM inspection_review_cycles WHERE inspection_id=p_inspection AND status='APPROVED') OR NOT EXISTS(SELECT 1 FROM inspection_reports WHERE id=p_report AND inspection_id=p_inspection AND status='OFFICIAL') THEN RAISE EXCEPTION 'closure requires approved review and official report'; END IF;
  UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason=coalesce(p_reason,'Inspection closed') WHERE id=c AND status='ASSIGNED';
  IF NOT FOUND THEN RAISE EXCEPTION 'case cannot close'; END IF;
  INSERT INTO inspection_closures(inspection_id,case_id,official_report_id,closed_by_user_id,closure_reason) VALUES(p_inspection,c,p_report,p_actor,p_reason) RETURNING id INTO x;
  RETURN x;
END $$;
