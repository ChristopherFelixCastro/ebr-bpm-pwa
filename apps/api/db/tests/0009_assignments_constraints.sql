INSERT INTO roles(code,name,is_universal) VALUES ('ASSIGNMENTS_TEST','Pruebas asignaciones',false);
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Coordinador de pruebas','assignments.coordinator@example.test','hash','APPROVED' FROM roles WHERE code='ASSIGNMENTS_TEST';
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Evaluador de pruebas','assignments.evaluator@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Evaluador alterno','assignments.evaluator.two@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';

DO $$
DECLARE company_uuid uuid; establishment_uuid uuid; request_one uuid; request_two uuid; contact_uuid uuid;
        case_one uuid; case_two uuid; assignment_one uuid; assignment_two uuid; assignment_three uuid;
        schedule_one uuid; schedule_two uuid; coordinator_uuid uuid; evaluator_uuid uuid; evaluator_two_uuid uuid;
BEGIN
  SELECT id INTO coordinator_uuid FROM users WHERE email_normalized='assignments.coordinator@example.test';
  SELECT id INTO evaluator_uuid FROM users WHERE email_normalized='assignments.evaluator@example.test';
  SELECT id INTO evaluator_two_uuid FROM users WHERE email_normalized='assignments.evaluator.two@example.test';
  INSERT INTO companies(legal_name,rnc) VALUES('Empresa asignaciones','132-11111-1') RETURNING id INTO company_uuid;
  INSERT INTO establishments(company_id,name) VALUES(company_uuid,'Planta asignaciones') RETURNING id INTO establishment_uuid;
  INSERT INTO contacts(full_name) VALUES('Contacto asignaciones') RETURNING id INTO contact_uuid;

  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_uuid,establishment_uuid,'Solicitud uno') RETURNING id INTO request_one;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_one,'AUTHORIZATION_LETTER','requests/one.pdf','one.pdf','application/pdf',1024,'VALID',clock_timestamp(),coordinator_uuid);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_one,contact_uuid,'PRIMARY_CONTACT','Contacto asignaciones',true);
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_one;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,status) VALUES('COMPANY_REQUEST',request_one,company_uuid,establishment_uuid,'PENDING_ASSIGNMENT') RETURNING id INTO case_one;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id,change_reason) VALUES(case_one,evaluator_uuid,coordinator_uuid,'Asignación inicial') RETURNING id INTO assignment_one;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_one AND status='ASSIGNED') THEN RAISE EXCEPTION 'assignment did not transition case to assigned'; END IF;
  BEGIN
    INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_one,evaluator_uuid,coordinator_uuid);
    RAISE EXCEPTION 'second active assignment accepted';
  EXCEPTION WHEN unique_violation OR check_violation THEN NULL;
  END;
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=coordinator_uuid,change_reason='Reasignación' WHERE id=assignment_one;
  IF NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_one AND version=2 AND updated_at>created_at) THEN RAISE EXCEPTION 'assignment version timestamp not updated'; END IF;
  BEGIN
    UPDATE case_assignments SET change_reason='Cambio posterior' WHERE id=assignment_one;
    RAISE EXCEPTION 'inactive assignment changed';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN IF SQLERRM <> 'inactive assignment is immutable' THEN RAISE; END IF;
  END;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id,change_reason) VALUES(case_one,evaluator_two_uuid,coordinator_uuid,'Nueva asignación') RETURNING id INTO assignment_two;
  IF NOT EXISTS(SELECT 1 FROM case_assignment_transitions WHERE case_id=case_one AND event_type='REASSIGNED') THEN RAISE EXCEPTION 'reassignment history missing'; END IF;
  BEGIN
    UPDATE case_assignment_transitions SET reason='Cambio' WHERE id=(SELECT id FROM case_assignment_transitions WHERE case_id=case_one LIMIT 1);
    RAISE EXCEPTION 'assignment transition changed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'assignment transitions are immutable' THEN RAISE; END IF;
  END;

  INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id,notes)
  VALUES(case_one,assignment_two,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 1 hour',coordinator_uuid,'Agenda inicial') RETURNING id INTO schedule_one;
  BEGIN
    INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id)
    VALUES(case_one,assignment_two,clock_timestamp()+interval '2 days',clock_timestamp()+interval '2 days 1 hour',coordinator_uuid);
    RAISE EXCEPTION 'second active schedule accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_uuid,establishment_uuid,'Solicitud dos') RETURNING id INTO request_two;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_two,'AUTHORIZATION_LETTER','requests/two.pdf','two.pdf','application/pdf',1024,'VALID',clock_timestamp(),coordinator_uuid);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_two,contact_uuid,'PRIMARY_CONTACT','Contacto asignaciones',true);
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_two;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,status) VALUES('COMPANY_REQUEST',request_two,company_uuid,establishment_uuid,'PENDING_ASSIGNMENT') RETURNING id INTO case_two;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_two,evaluator_uuid,coordinator_uuid) RETURNING id INTO assignment_three;
  BEGIN
    INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id)
    VALUES(case_two,assignment_two,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 1 hour',coordinator_uuid);
    RAISE EXCEPTION 'cross-case assignment accepted for schedule';
  EXCEPTION WHEN check_violation THEN IF SQLERRM <> 'schedule assignment must be active and belong to case' THEN RAISE; END IF;
  END;

  UPDATE case_schedule_entries SET status='RESCHEDULED' WHERE id=schedule_one;
  INSERT INTO case_schedule_entries(case_id,case_assignment_id,rescheduled_from_schedule_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id)
  VALUES(case_one,assignment_two,schedule_one,clock_timestamp()+interval '3 days',clock_timestamp()+interval '3 days 1 hour',coordinator_uuid) RETURNING id INTO schedule_two;
  BEGIN
    UPDATE case_schedule_entries SET status='SCHEDULED' WHERE id=schedule_one;
    RAISE EXCEPTION 'rescheduled entry reactivated';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN IF SQLERRM <> 'inactive schedule is immutable' THEN RAISE; END IF;
  END;
  INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id)
  VALUES(case_two,assignment_three,clock_timestamp()+interval '3 days',clock_timestamp()+interval '3 days 1 hour',coordinator_uuid);
  UPDATE case_schedule_entries SET status='CANCELLED',cancelled_at=clock_timestamp(),cancelled_by_user_id=coordinator_uuid,cancellation_reason='Reprogramación operativa' WHERE id=schedule_two;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=schedule_two AND version=2 AND updated_at>created_at) THEN RAISE EXCEPTION 'schedule version timestamp not updated'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_one AND status='ASSIGNED') THEN RAISE EXCEPTION 'cancelling schedule changed assignment state'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_transitions WHERE schedule_entry_id=schedule_two AND event_type='CANCELLED') THEN RAISE EXCEPTION 'schedule cancellation history missing'; END IF;
  BEGIN
    UPDATE case_schedule_transitions SET reason='Cambio' WHERE id=(SELECT id FROM case_schedule_transitions WHERE schedule_entry_id=schedule_two LIMIT 1);
    RAISE EXCEPTION 'schedule transition changed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'schedule transitions are immutable' THEN RAISE; END IF;
  END;
END $$;
