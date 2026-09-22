DO $$
DECLARE
  admin_role uuid; evaluator_role uuid; actor uuid; evaluator uuid;
  alert_proceeds uuid; alert_not_proceeds uuid;
  complaint_proceeds uuid; complaint_not_proceeds uuid; complaint_referred uuid;
  test_case uuid;
BEGIN
  SELECT id INTO admin_role FROM roles WHERE code='ADMIN';
  SELECT id INTO evaluator_role FROM roles WHERE code='EVALUATOR';
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(admin_role,'Decision Integrity Actor','decision.integrity.actor@example.test','hash','APPROVED') RETURNING id INTO actor;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Decision Integrity Evaluator','decision.integrity.evaluator@example.test','hash','APPROVED') RETURNING id INTO evaluator;

  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO test_case;
    INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description,decision,decided_at,decided_by_user_id)
    VALUES(test_case,'I23-INSERT-AP',CURRENT_DATE,'Product','Description','PROCEEDS',clock_timestamp(),actor);
    RAISE EXCEPTION 'decided alert PROCEEDS inserted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO test_case;
    INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description,decision,decision_reason,decided_at,decided_by_user_id)
    VALUES(test_case,'I23-INSERT-AN',CURRENT_DATE,'Product','Description','NOT_PROCEEDS','Reason',clock_timestamp(),actor);
    RAISE EXCEPTION 'decided alert NOT_PROCEEDS inserted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO test_case;
    INSERT INTO complaints(case_id,complaint_type,received_at,description,decision,decided_at,decided_by_user_id)
    VALUES(test_case,'Insert proceeds',clock_timestamp(),'Description','PROCEEDS',clock_timestamp(),actor);
    RAISE EXCEPTION 'decided complaint PROCEEDS inserted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO test_case;
    INSERT INTO complaints(case_id,complaint_type,received_at,description,decision,decision_reason,decided_at,decided_by_user_id)
    VALUES(test_case,'Insert not proceeds',clock_timestamp(),'Description','NOT_PROCEEDS','Reason',clock_timestamp(),actor);
    RAISE EXCEPTION 'decided complaint NOT_PROCEEDS inserted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO test_case;
    INSERT INTO complaints(case_id,complaint_type,received_at,description,decision,referral_reason,referral_destination,decided_at,decided_by_user_id)
    VALUES(test_case,'Insert referred',clock_timestamp(),'Description','REFERRED','Reason','Institution',clock_timestamp(),actor);
    RAISE EXCEPTION 'decided complaint REFERRED inserted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO alert_proceeds;
  INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description,created_by_user_id)
  VALUES(alert_proceeds,'I23-ALERT-PROCEEDS',CURRENT_DATE,'Product A','Alert A',actor);
  INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO alert_not_proceeds;
  INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description,created_by_user_id)
  VALUES(alert_not_proceeds,'I23-ALERT-NOT',CURRENT_DATE,'Product B','Alert B',actor);
  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO complaint_proceeds;
  INSERT INTO complaints(case_id,complaint_type,received_at,description,complainant_data,created_by_user_id)
  VALUES(complaint_proceeds,'Proceeds',clock_timestamp(),'Complaint A','{"preferredContactMethod":"NONE"}'::jsonb,actor);
  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO complaint_not_proceeds;
  INSERT INTO complaints(case_id,complaint_type,received_at,description,created_by_user_id)
  VALUES(complaint_not_proceeds,'Not proceeds',clock_timestamp(),'Complaint B',actor);
  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO complaint_referred;
  INSERT INTO complaints(case_id,complaint_type,received_at,description,created_by_user_id)
  VALUES(complaint_referred,'Referred',clock_timestamp(),'Complaint C',actor);
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  IF EXISTS(SELECT 1 FROM health_alerts WHERE case_id IN(alert_proceeds,alert_not_proceeds) AND decision<>'PENDING') OR EXISTS(SELECT 1 FROM complaints WHERE case_id IN(complaint_proceeds,complaint_not_proceeds,complaint_referred) AND decision<>'PENDING') THEN RAISE EXCEPTION 'pending source insertion failed'; END IF;

  BEGIN
    UPDATE health_alerts SET alert_number='I23-CHANGED',decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=alert_proceeds;
    RAISE EXCEPTION 'alert number changed with decision';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE health_alerts SET description='Changed',decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=alert_proceeds;
    RAISE EXCEPTION 'alert content changed with decision';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE complaints SET complainant_data='{"fullName":"Changed","preferredContactMethod":"NONE"}'::jsonb,decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=complaint_proceeds;
    RAISE EXCEPTION 'complainant data changed with decision';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE complaints SET description='Changed',decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=complaint_proceeds;
    RAISE EXCEPTION 'complaint description changed with decision';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=alert_proceeds; RAISE EXCEPTION 'pending alert moved to pending assignment'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason='Direct' WHERE id=alert_proceeds; RAISE EXCEPTION 'pending alert moved to no action'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE cases SET status='REFERRED',closed_at=clock_timestamp(),closed_reason='Direct' WHERE id=alert_proceeds; RAISE EXCEPTION 'health alert referred'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE cases SET status='PENDING_ASSIGNMENT' WHERE id=complaint_proceeds; RAISE EXCEPTION 'pending complaint moved to pending assignment'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE cases SET status='NO_ACTION',closed_at=clock_timestamp(),closed_reason='Direct' WHERE id=complaint_proceeds; RAISE EXCEPTION 'pending complaint moved to no action'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE cases SET status='REFERRED',closed_at=clock_timestamp(),closed_reason='Direct' WHERE id=complaint_proceeds; RAISE EXCEPTION 'pending complaint referred'; EXCEPTION WHEN check_violation THEN NULL; END;

  UPDATE health_alerts SET decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=alert_proceeds;
  UPDATE health_alerts SET decision='NOT_PROCEEDS',decision_reason='Unsafe product',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=alert_not_proceeds;
  UPDATE complaints SET decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=complaint_proceeds;
  UPDATE complaints SET decision='NOT_PROCEEDS',decision_reason='Insufficient basis',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=complaint_not_proceeds;
  UPDATE complaints SET decision='REFERRED',referral_reason='External jurisdiction',referral_destination='Ministry',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=complaint_referred;

  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=alert_proceeds AND status='PENDING_ASSIGNMENT' AND closed_at IS NULL) THEN RAISE EXCEPTION 'valid alert PROCEEDS failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=alert_not_proceeds AND status='NO_ACTION' AND closed_at IS NOT NULL AND closed_reason='Unsafe product') THEN RAISE EXCEPTION 'alert closure mismatch'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=complaint_proceeds AND status='PENDING_ASSIGNMENT' AND closed_at IS NULL) THEN RAISE EXCEPTION 'valid complaint PROCEEDS failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=complaint_not_proceeds AND status='NO_ACTION' AND closed_at IS NOT NULL AND closed_reason='Insufficient basis') THEN RAISE EXCEPTION 'complaint closure mismatch'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=complaint_referred AND status='REFERRED' AND closed_at IS NOT NULL AND closed_reason='External jurisdiction') THEN RAISE EXCEPTION 'complaint referral closure mismatch'; END IF;

  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(alert_proceeds,evaluator,actor);
  IF (SELECT status FROM cases WHERE id=alert_proceeds)<>'ASSIGNED' THEN RAISE EXCEPTION 'post-decision assignment transition blocked'; END IF;
  UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason='Completed' WHERE id=alert_proceeds;
  IF (SELECT status FROM cases WHERE id=alert_proceeds)<>'CLOSED' THEN RAISE EXCEPTION 'assigned close transition blocked'; END IF;
END $$;
