INSERT INTO roles(code,name,is_universal) VALUES ('REQUESTS_TEST','Pruebas solicitudes',false);
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Decisor de pruebas','requests.decider@example.test','hash','APPROVED' FROM roles WHERE code='REQUESTS_TEST';

DO $$
DECLARE company_uuid uuid; establishment_uuid uuid; request_uuid uuid; contact_uuid uuid;
        alert_case_uuid uuid; complaint_case_uuid uuid; decision_user_uuid uuid;
BEGIN
  SELECT id INTO decision_user_uuid FROM users WHERE email_normalized='requests.decider@example.test';
  INSERT INTO companies(legal_name,rnc) VALUES('Empresa solicitudes','131-99999-9') RETURNING id INTO company_uuid;
  INSERT INTO establishments(company_id,name) VALUES(company_uuid,'Planta solicitudes') RETURNING id INTO establishment_uuid;
  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_uuid,establishment_uuid,'Solicitud de prueba') RETURNING id INTO request_uuid;

  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_uuid;
    RAISE EXCEPTION 'pending authorization letter accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status)
  VALUES(request_uuid,'AUTHORIZATION_LETTER','requests/test.pdf','test.pdf','application/pdf',1024,'PENDING');
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_uuid;
    RAISE EXCEPTION 'pending authorization letter allowed submission';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO contacts(full_name,email) VALUES('Contacto solicitud','request.contact@example.test') RETURNING id INTO contact_uuid;
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_uuid,contact_uuid,'PRIMARY_CONTACT','Contacto solicitud',true);
  BEGIN
    INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot) VALUES(request_uuid,contact_uuid,'PRIMARY_CONTACT','Contacto solicitud');
    RAISE EXCEPTION 'duplicate request contact accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE request_documents SET status='VALID',validated_at=clock_timestamp(),validated_by_user_id=decision_user_uuid WHERE request_id=request_uuid;
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_uuid;
  IF NOT EXISTS(SELECT 1 FROM request_status_transitions WHERE request_id=request_uuid AND from_status='DRAFT' AND to_status='PENDING_ASSIGNMENT') THEN RAISE EXCEPTION 'request transition history missing'; END IF;

  INSERT INTO cases(origin,request_id,company_id,establishment_id,status) VALUES('COMPANY_REQUEST',request_uuid,company_uuid,establishment_uuid,'PENDING_ASSIGNMENT');
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  INSERT INTO cases(origin,company_id,establishment_id,status,priority) VALUES('HEALTH_ALERT',company_uuid,establishment_uuid,'PENDING_REVIEW','HIGH') RETURNING id INTO alert_case_uuid;
  INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description) VALUES(alert_case_uuid,'LAPCH-TEST-1',CURRENT_DATE,'Producto','Alerta de prueba');
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  BEGIN
    UPDATE health_alerts SET decision='PROCEEDS' WHERE case_id=alert_case_uuid;
    RAISE EXCEPTION 'final alert decision without decider accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE health_alerts SET decision='NOT_PROCEEDS',decided_at=clock_timestamp(),decided_by_user_id=decision_user_uuid,decision_reason='No aplica' WHERE case_id=alert_case_uuid;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=alert_case_uuid AND status='NO_ACTION' AND closed_at IS NOT NULL) THEN RAISE EXCEPTION 'alert decision did not close case'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_status_transitions WHERE case_id=alert_case_uuid AND to_status='NO_ACTION') THEN RAISE EXCEPTION 'case transition history missing'; END IF;
  BEGIN
    UPDATE cases SET status='PENDING_REVIEW',closed_at=NULL WHERE id=alert_case_uuid;
    RAISE EXCEPTION 'terminal case reactivated';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invalid case transition' THEN RAISE; END IF;
  END;

  INSERT INTO cases(origin,company_id,establishment_id,status) VALUES('COMPLAINT',company_uuid,establishment_uuid,'PENDING_REVIEW') RETURNING id INTO complaint_case_uuid;
  INSERT INTO complaints(case_id,complaint_type,received_at,description) VALUES(complaint_case_uuid,'Queja',clock_timestamp(),'Denuncia de prueba');
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  BEGIN
    UPDATE complaints SET decision='REFERRED',decided_at=clock_timestamp(),decided_by_user_id=decision_user_uuid WHERE case_id=complaint_case_uuid;
    RAISE EXCEPTION 'referred complaint without reason accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE complaints SET decision='REFERRED',decided_at=clock_timestamp(),decided_by_user_id=decision_user_uuid,referral_reason='Competencia externa',referral_destination='Autoridad competente' WHERE case_id=complaint_case_uuid;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=complaint_case_uuid AND status='REFERRED' AND closed_at IS NOT NULL) THEN RAISE EXCEPTION 'complaint referral did not close case'; END IF;

  BEGIN
    INSERT INTO health_alerts(case_id,alert_number,alert_date,product_description,description) VALUES(complaint_case_uuid,'LAPCH-TEST-WRONG',CURRENT_DATE,'Producto','Origen incorrecto');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'wrong origin child accepted';
  EXCEPTION WHEN check_violation THEN IF SQLERRM <> 'case origin source mismatch' THEN RAISE; END IF;
  END;
END $$;
