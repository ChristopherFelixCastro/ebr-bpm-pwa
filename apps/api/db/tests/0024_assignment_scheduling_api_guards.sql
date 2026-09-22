DO $$
DECLARE
  admin_role uuid; universal_role uuid; coordinator_role uuid; evaluator_role uuid; company_admin_role uuid; delegate_role uuid;
  actor uuid; evaluator_one uuid; evaluator_two uuid; evaluator_pending uuid; evaluator_rejected uuid; evaluator_inactive uuid; wrong_user uuid;
  membership_company uuid;
  case_main uuid; case_invalid uuid; case_other uuid; case_closed uuid; case_no_action uuid; case_referred uuid;
  assignment_one uuid; assignment_two uuid; other_assignment uuid; closed_assignment uuid;
  schedule_one uuid; schedule_two uuid; schedule_three uuid; replacement uuid;
BEGIN
  SELECT id INTO admin_role FROM roles WHERE code='ADMIN'; SELECT id INTO universal_role FROM roles WHERE code='UNIVERSAL'; SELECT id INTO coordinator_role FROM roles WHERE code='COORDINATOR'; SELECT id INTO evaluator_role FROM roles WHERE code='EVALUATOR'; SELECT id INTO company_admin_role FROM roles WHERE code='COMPANY_ADMIN'; SELECT id INTO delegate_role FROM roles WHERE code='DELEGATE';
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(admin_role,'Scheduling Actor','scheduling.actor@example.test','hash','APPROVED') RETURNING id INTO actor;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Evaluator One','scheduling.eval1@example.test','hash','APPROVED') RETURNING id INTO evaluator_one;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Evaluator Two','scheduling.eval2@example.test','hash','APPROVED') RETURNING id INTO evaluator_two;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Evaluator Pending','scheduling.pending@example.test','hash','PENDING_VALIDATION') RETURNING id INTO evaluator_pending;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Evaluator Rejected','scheduling.rejected@example.test','hash','REJECTED') RETURNING id INTO evaluator_rejected;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(evaluator_role,'Evaluator Inactive','scheduling.inactive@example.test','hash','INACTIVE') RETURNING id INTO evaluator_inactive;
  INSERT INTO companies(legal_name,rnc) VALUES('Scheduling Membership Company','999024001') RETURNING id INTO membership_company;

  INSERT INTO cases(origin,status,priority) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT','MEDIUM') RETURNING id INTO case_main;
  INSERT INTO institutional_program_cases(case_id,reason) VALUES(case_main,'Assignment API main case');
  INSERT INTO cases(origin,status,priority) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT','MEDIUM') RETURNING id INTO case_invalid;
  INSERT INTO institutional_program_cases(case_id,reason) VALUES(case_invalid,'Assignment API invalid evaluator case');

  FOR wrong_user IN
    INSERT INTO users(role_id,full_name,email,password_hash,status)
    VALUES
      (admin_role,'Wrong Admin','scheduling.wrong.admin@example.test','hash','APPROVED'),
      (coordinator_role,'Wrong Coordinator','scheduling.wrong.coordinator@example.test','hash','APPROVED'),
      (universal_role,'Wrong Universal','scheduling.wrong.universal@example.test','hash','APPROVED'),
      (company_admin_role,'Wrong Company Admin','scheduling.wrong.company@example.test','hash','APPROVED'),
      (delegate_role,'Wrong Delegate','scheduling.wrong.delegate@example.test','hash','APPROVED')
    RETURNING id
  LOOP
    IF EXISTS(SELECT 1 FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=wrong_user AND r.code IN('COMPANY_ADMIN','DELEGATE')) THEN INSERT INTO user_company_memberships(user_id,company_id) VALUES(wrong_user,membership_company); END IF;
    BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_invalid,wrong_user,actor); RAISE EXCEPTION 'incorrect role assigned'; EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_invalid,evaluator_pending,actor); RAISE EXCEPTION 'pending evaluator assigned'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_invalid,evaluator_rejected,actor); RAISE EXCEPTION 'rejected evaluator assigned'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_invalid,evaluator_inactive,actor); RAISE EXCEPTION 'inactive evaluator assigned'; EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_main,evaluator_one,actor) RETURNING id INTO assignment_one;
  IF (SELECT status FROM cases WHERE id=case_main)<>'ASSIGNED' THEN RAISE EXCEPTION 'initial assignment did not assign case'; END IF;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_main,evaluator_two,actor); RAISE EXCEPTION 'second active assignment accepted'; EXCEPTION WHEN check_violation OR unique_violation THEN NULL; END;
  BEGIN UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Isolated close' WHERE id=assignment_one; SET CONSTRAINTS ALL IMMEDIATE; RAISE EXCEPTION 'isolated unassignment committed'; EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED; END;

  BEGIN
    UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Same evaluator' WHERE id=assignment_one;
    INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id,change_reason) VALUES(case_main,evaluator_one,actor,'Same evaluator');
    RAISE EXCEPTION 'same evaluator reassignment accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Temporary' WHERE id=assignment_one;
    INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_main,evaluator_two,actor);
    RAISE EXCEPTION 'reassignment without reason accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Workload balance' WHERE id=assignment_one;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id,change_reason) VALUES(case_main,evaluator_two,actor,'Workload balance') RETURNING id INTO assignment_two;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_one AND NOT is_active) OR NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_two AND is_active) THEN RAISE EXCEPTION 'atomic reassignment failed'; END IF;

  INSERT INTO cases(origin,status,priority) VALUES('HEALTH_ALERT','PENDING_REVIEW','HIGH') RETURNING id INTO case_other;
  INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description) VALUES(case_other,'SCHED-INVALID-STATE',CURRENT_DATE,'Product','Description');
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_other,evaluator_one,actor); RAISE EXCEPTION 'pending review case assigned'; EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE health_alerts SET decision='NOT_PROCEEDS',decision_reason='No action',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_other;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_other,evaluator_one,actor); RAISE EXCEPTION 'no action case assigned'; EXCEPTION WHEN check_violation THEN NULL; END;
  case_no_action:=case_other;

  INSERT INTO cases(origin,status,priority) VALUES('COMPLAINT','PENDING_REVIEW','MEDIUM') RETURNING id INTO case_referred;
  INSERT INTO complaints(case_id,complaint_type,received_at,description) VALUES(case_referred,'Referral',clock_timestamp(),'Description');
  UPDATE complaints SET decision='REFERRED',referral_reason='Jurisdiction',referral_destination='Authority',decided_at=clock_timestamp(),decided_by_user_id=actor WHERE case_id=case_referred;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_referred,evaluator_one,actor); RAISE EXCEPTION 'referred case assigned'; EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO cases(origin,status,priority) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT','MEDIUM') RETURNING id INTO case_closed;
  INSERT INTO institutional_program_cases(case_id,reason) VALUES(case_closed,'Closed case');
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_closed,evaluator_one,actor) RETURNING id INTO closed_assignment;
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Case completed' WHERE id=closed_assignment;
  UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason='Completed' WHERE id=case_closed;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  BEGIN INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_closed,evaluator_two,actor); RAISE EXCEPTION 'closed case assigned'; EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id) VALUES(case_main,assignment_two,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour',actor); RAISE EXCEPTION 'past schedule accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id) VALUES(case_main,assignment_two,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 10 minutes',actor); RAISE EXCEPTION 'short schedule accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id) VALUES(case_main,assignment_two,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 13 hours',actor); RAISE EXCEPTION 'long schedule accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,timezone,scheduled_by_user_id) VALUES(case_main,assignment_two,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 1 hour','UTC',actor); RAISE EXCEPTION 'foreign timezone accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id) VALUES(case_main,closed_assignment,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 1 hour',actor); RAISE EXCEPTION 'other case assignment accepted'; EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id,notes) VALUES(case_main,assignment_two,clock_timestamp()+interval '2 days',clock_timestamp()+interval '2 days 1 hour',actor,'Original notes') RETURNING id INTO schedule_one;
  PERFORM set_config('app.actor_user_id',actor::text,true); PERFORM set_config('app.schedule_change_reason','New visit date',true);
  UPDATE case_schedule_entries SET status='RESCHEDULED' WHERE id=schedule_one;
  INSERT INTO case_schedule_entries(case_id,case_assignment_id,rescheduled_from_schedule_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id,notes) VALUES(case_main,assignment_two,schedule_one,clock_timestamp()+interval '3 days',clock_timestamp()+interval '3 days 1 hour',actor,'New notes') RETURNING id INTO schedule_two;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=schedule_one AND status='RESCHEDULED') OR NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=schedule_two AND status='SCHEDULED' AND rescheduled_from_schedule_id=schedule_one) THEN RAISE EXCEPTION 'reschedule history failed'; END IF;
  UPDATE case_schedule_entries SET status='CANCELLED',cancellation_reason='Visit cancelled',cancelled_at=clock_timestamp(),cancelled_by_user_id=actor WHERE id=schedule_two;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=schedule_two AND status='CANCELLED' AND cancelled_at IS NOT NULL) THEN RAISE EXCEPTION 'cancellation failed'; END IF;
  BEGIN UPDATE case_schedule_entries SET notes='Mutated' WHERE id=schedule_one; RAISE EXCEPTION 'historical schedule changed'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;

  INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id,notes) VALUES(case_main,assignment_two,clock_timestamp()+interval '4 days',clock_timestamp()+interval '4 days 1 hour',actor,'Replacement notes') RETURNING id INTO schedule_three;
  BEGIN UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Unsafe reassignment' WHERE id=assignment_two; SET CONSTRAINTS ALL IMMEDIATE; RAISE EXCEPTION 'scheduled entry left on inactive assignment'; EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED; END;
  PERFORM set_config('app.actor_user_id',actor::text,true); PERFORM set_config('app.schedule_change_reason','Atomic reassignment',true);
  UPDATE case_schedule_entries SET status='RESCHEDULED' WHERE id=schedule_three;
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Atomic reassignment' WHERE id=assignment_two;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id,change_reason) VALUES(case_main,evaluator_one,actor,'Atomic reassignment') RETURNING id INTO assignment_one;
  INSERT INTO case_schedule_entries(case_id,case_assignment_id,rescheduled_from_schedule_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id,notes)
  SELECT case_id,assignment_one,id,scheduled_start_at,scheduled_end_at,actor,notes FROM case_schedule_entries WHERE id=schedule_three RETURNING id INTO replacement;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=replacement AND status='SCHEDULED' AND case_assignment_id=assignment_one) THEN RAISE EXCEPTION 'automatic schedule replacement failed'; END IF;

  INSERT INTO cases(origin,status,priority) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT','MEDIUM') RETURNING id INTO case_other;
  INSERT INTO institutional_program_cases(case_id,reason) VALUES(case_other,'Overlap case');
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_other,evaluator_one,actor) RETURNING id INTO other_assignment;
  INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id)
  SELECT case_other,other_assignment,scheduled_start_at+interval '30 minutes',scheduled_end_at+interval '30 minutes',actor FROM case_schedule_entries WHERE id=replacement;
  IF (SELECT count(*) FROM case_schedule_entries s JOIN case_assignments a ON a.id=s.case_assignment_id WHERE a.evaluator_user_id=evaluator_one AND s.status='SCHEDULED')<>2 THEN RAISE EXCEPTION 'database blocked evaluator overlap'; END IF;

  BEGIN UPDATE case_assignment_transitions SET reason='Mutated' WHERE case_id=case_main; RAISE EXCEPTION 'assignment transition history changed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='assignment transition history changed' THEN RAISE; END IF; END;
  BEGIN UPDATE case_schedule_transitions SET reason='Mutated' WHERE case_id=case_main; RAISE EXCEPTION 'schedule transition history changed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='schedule transition history changed' THEN RAISE; END IF; END;
END $$;
