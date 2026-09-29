DO $$
DECLARE admin_role uuid; evaluator_role uuid; actor uuid; evaluator uuid; company_one uuid; company_two uuid; establishment_one uuid; establishment_two uuid; inactive_company uuid; inactive_establishment uuid; case_program uuid; case_alert uuid; case_complaint uuid; case_test uuid;
BEGIN
  SELECT id INTO admin_role FROM roles WHERE code='ADMIN'; SELECT id INTO evaluator_role FROM roles WHERE code='EVALUATOR';
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(admin_role,'Intake Actor','intake.actor@example.test','hash','APPROVED') RETURNING id INTO actor;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Intake Evaluator','intake.evaluator@example.test','hash','APPROVED') RETURNING id INTO evaluator;
  INSERT INTO companies(legal_name,rnc) VALUES('Intake Company One','999004001') RETURNING id INTO company_one;
  INSERT INTO establishments(company_id,name) VALUES(company_one,'Intake Establishment One') RETURNING id INTO establishment_one;
  INSERT INTO companies(legal_name,rnc) VALUES('Intake Company Two','999004002') RETURNING id INTO company_two;
  INSERT INTO establishments(company_id,name) VALUES(company_two,'Intake Establishment Two') RETURNING id INTO establishment_two;

  INSERT INTO cases(origin,status,priority,company_id,establishment_id) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT','MEDIUM',company_one,establishment_one) RETURNING id INTO case_program;
  INSERT INTO institutional_program_cases(case_id,program_reference,planned_date,reason,created_by_user_id) VALUES(case_program,'PROGRAM-1',CURRENT_DATE,'Program reason',actor);
  INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO case_alert;
  INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description,created_by_user_id) VALUES(case_alert,'ALERT-001',CURRENT_DATE,'Product','Alert description',actor);
  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO case_complaint;
  INSERT INTO complaints(case_id,complaint_type,received_at,description,created_by_user_id) VALUES(case_complaint,'Sanitary',clock_timestamp(),'Complaint description',actor);
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF (SELECT status FROM cases WHERE id=case_program)<>'PENDING_ASSIGNMENT' OR (SELECT priority FROM cases WHERE id=case_program)<>'MEDIUM' THEN RAISE EXCEPTION 'institutional initial state invalid'; END IF;
  IF (SELECT status FROM cases WHERE id=case_alert)<>'PENDING_REVIEW' OR (SELECT priority FROM cases WHERE id=case_alert)<>'HIGH' THEN RAISE EXCEPTION 'alert initial state invalid'; END IF;
  IF (SELECT status FROM cases WHERE id=case_complaint)<>'PENDING_REVIEW' OR (SELECT priority FROM cases WHERE id=case_complaint)<>'MEDIUM' THEN RAISE EXCEPTION 'complaint initial state invalid'; END IF;

  BEGIN INSERT INTO cases(origin,status,priority,establishment_id) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH',establishment_one); RAISE EXCEPTION 'establishment without company accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO cases(origin,status,priority,company_id,establishment_id) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM',company_one,establishment_two); RAISE EXCEPTION 'foreign establishment accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO companies(legal_name,rnc) VALUES('Inactive Intake Company','999004003') RETURNING id INTO inactive_company;
  INSERT INTO establishments(company_id,name,status) VALUES(inactive_company,'Inactive Intake Establishment','INACTIVE') RETURNING id INTO inactive_establishment;
  UPDATE companies SET status='INACTIVE' WHERE id=inactive_company; SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  BEGIN INSERT INTO cases(origin,status,priority,company_id) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH',inactive_company); RAISE EXCEPTION 'inactive company accepted'; EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO case_test;
    INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description) VALUES(case_test,'  alert-001  ',CURRENT_DATE,'Other product','Other alert');
    RAISE EXCEPTION 'normalized duplicate alert number accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO case_test;
    INSERT INTO institutional_program_cases(case_id,reason) VALUES(case_test,'Wrong source');
    RAISE EXCEPTION 'wrong source origin accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'case without source accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM='case without source accepted' THEN RAISE; END IF; SET CONSTRAINTS ALL DEFERRED;
  END;

  UPDATE health_alerts SET decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_alert;
  IF (SELECT status FROM cases WHERE id=case_alert)<>'PENDING_ASSIGNMENT' THEN RAISE EXCEPTION 'alert proceeds did not synchronize'; END IF;
  BEGIN UPDATE health_alerts SET description='Changed' WHERE case_id=case_alert; RAISE EXCEPTION 'final alert changed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;

  INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO case_test;
  INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description) VALUES(case_test,'ALERT-002',CURRENT_DATE,'Product','Description');
  BEGIN UPDATE health_alerts SET decision='NOT_PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_test; RAISE EXCEPTION 'alert reason omission accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE health_alerts SET decision='NOT_PROCEEDS',decision_reason='Does not proceed',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_test;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_test AND status='NO_ACTION' AND closed_at IS NOT NULL AND closed_reason='Does not proceed') THEN RAISE EXCEPTION 'alert not-proceeds did not close case'; END IF;

  UPDATE complaints SET decision='PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_complaint;
  IF (SELECT status FROM cases WHERE id=case_complaint)<>'PENDING_ASSIGNMENT' THEN RAISE EXCEPTION 'complaint proceeds did not synchronize'; END IF;
  BEGIN UPDATE complaints SET decision='PENDING',decided_at=NULL,decided_by_user_id=NULL WHERE case_id=case_complaint; RAISE EXCEPTION 'complaint reactivated'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;

  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO case_test;
  INSERT INTO complaints(case_id,complaint_type,received_at,description) VALUES(case_test,'Sanitary',clock_timestamp(),'Description');
  BEGIN UPDATE complaints SET decision='NOT_PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_test; RAISE EXCEPTION 'complaint reason omission accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE complaints SET decision='NOT_PROCEEDS',decision_reason='No action',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_test;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_test AND status='NO_ACTION' AND closed_at IS NOT NULL AND closed_reason='No action') THEN RAISE EXCEPTION 'complaint not-proceeds did not close case'; END IF;

  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO case_test;
  INSERT INTO complaints(case_id,complaint_type,received_at,description) VALUES(case_test,'Referral',clock_timestamp(),'Description');
  BEGIN UPDATE complaints SET decision='REFERRED',referral_reason='Other authority',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_test; RAISE EXCEPTION 'referral destination omission accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE complaints SET decision='REFERRED',referral_reason='Other authority',referral_destination='Ministry',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_test;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_test AND status='REFERRED' AND closed_at IS NOT NULL AND closed_reason='Other authority') THEN RAISE EXCEPTION 'complaint referral did not synchronize'; END IF;
  BEGIN UPDATE complaints SET decision='NOT_PROCEEDS',decision_reason='Changed',referral_reason=NULL,referral_destination=NULL WHERE case_id=case_test; RAISE EXCEPTION 'final complaint decision changed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;

  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_program,evaluator,actor);
  BEGIN UPDATE institutional_program_cases SET reason='Changed' WHERE case_id=case_program; RAISE EXCEPTION 'assigned program changed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN DELETE FROM institutional_program_cases WHERE case_id=case_program; RAISE EXCEPTION 'program deleted'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN DELETE FROM health_alerts WHERE case_id=case_alert; RAISE EXCEPTION 'alert deleted'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN DELETE FROM complaints WHERE case_id=case_complaint; RAISE EXCEPTION 'complaint deleted'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $$;
