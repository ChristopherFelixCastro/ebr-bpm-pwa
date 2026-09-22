INSERT INTO roles(code,name,is_universal) VALUES ('ASSIGN_TYPE_FIX_TEST','Pruebas tipo de asignación',false);
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Coordinador tipo','assignment.type.coordinator@example.test','hash','APPROVED' FROM roles WHERE code='ASSIGN_TYPE_FIX_TEST';
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Evaluador tipo','assignment.type.evaluator@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Evaluador tipo alterno','assignment.type.evaluator.two@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';

DO $$
DECLARE company_uuid uuid; establishment_uuid uuid; request_uuid uuid; case_uuid uuid; contact_uuid uuid;
        coordinator_uuid uuid; evaluator_uuid uuid; evaluator_two_uuid uuid; first_assignment uuid;
BEGIN
  SELECT id INTO coordinator_uuid FROM users WHERE email_normalized='assignment.type.coordinator@example.test';
  SELECT id INTO evaluator_uuid FROM users WHERE email_normalized='assignment.type.evaluator@example.test';
  SELECT id INTO evaluator_two_uuid FROM users WHERE email_normalized='assignment.type.evaluator.two@example.test';
  INSERT INTO companies(legal_name,rnc) VALUES('Empresa tipo asignación','133-22222-2') RETURNING id INTO company_uuid;
  INSERT INTO establishments(company_id,name) VALUES(company_uuid,'Planta tipo asignación') RETURNING id INTO establishment_uuid;
  INSERT INTO contacts(full_name) VALUES('Contacto tipo asignación') RETURNING id INTO contact_uuid;
  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_uuid,establishment_uuid,'Prueba de tipo de evento') RETURNING id INTO request_uuid;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id)
  VALUES(request_uuid,'AUTHORIZATION_LETTER','requests/type.pdf','type.pdf','application/pdf',1024,'VALID',clock_timestamp(),coordinator_uuid);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_uuid,contact_uuid,'PRIMARY_CONTACT','Contacto tipo asignación',true);
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_uuid;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,status)
  VALUES('COMPANY_REQUEST',request_uuid,company_uuid,establishment_uuid,'PENDING_ASSIGNMENT') RETURNING id INTO case_uuid;

  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_uuid,evaluator_uuid,coordinator_uuid) RETURNING id INTO first_assignment;
  IF NOT EXISTS(SELECT 1 FROM case_assignment_transitions WHERE case_assignment_id=first_assignment AND event_type='ASSIGNED') THEN
    RAISE EXCEPTION 'initial assignment event was not recorded';
  END IF;
  UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=coordinator_uuid,change_reason='Reasignación de prueba' WHERE id=first_assignment;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id,change_reason) VALUES(case_uuid,evaluator_two_uuid,coordinator_uuid,'Reasignación de prueba');
  IF NOT EXISTS(SELECT 1 FROM case_assignment_transitions WHERE case_id=case_uuid AND event_type='REASSIGNED') THEN
    RAISE EXCEPTION 'reassignment event was not recorded';
  END IF;
END $$;
