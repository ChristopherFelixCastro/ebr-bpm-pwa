DO $$
DECLARE
  test_role uuid; test_user uuid; contact_one uuid; contact_two uuid;
  company_one uuid; establishment_one uuid; company_two uuid; establishment_two uuid;
  inactive_company uuid; inactive_company_establishment uuid; inactive_establishment_company uuid; inactive_establishment uuid;
  request_one uuid; request_test uuid; request_contact_one uuid; request_contact_two uuid;
  pending_document uuid; valid_document uuid; rejected_document uuid;
BEGIN
  SELECT id INTO test_role FROM roles WHERE code='ADMIN';
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(test_role,'Integrity Guard','request.integrity@example.test','hash','APPROVED') RETURNING id INTO test_user;
  INSERT INTO contacts(full_name) VALUES('Primary Contact') RETURNING id INTO contact_one;
  INSERT INTO contacts(full_name) VALUES('Secondary Contact') RETURNING id INTO contact_two;
  INSERT INTO companies(legal_name,rnc) VALUES('Integrity Company One','999003001') RETURNING id INTO company_one;
  INSERT INTO establishments(company_id,name) VALUES(company_one,'Integrity Establishment One') RETURNING id INTO establishment_one;
  INSERT INTO companies(legal_name,rnc) VALUES('Integrity Company Two','999003002') RETURNING id INTO company_two;
  INSERT INTO establishments(company_id,name) VALUES(company_two,'Integrity Establishment Two') RETURNING id INTO establishment_two;

  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id)
  VALUES(company_one,establishment_one,'REGISTRATION','Integrity request',test_user) RETURNING id INTO request_one;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id)
  VALUES(request_one,'AUTHORIZATION_LETTER','requests/integrity-letter.pdf','letter.pdf','application/pdf',10,'VALID',clock_timestamp(),test_user);

  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_one;
    RAISE EXCEPTION 'valid letter without contacts accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary)
  VALUES(request_one,contact_one,'PRIMARY_CONTACT','Primary Contact',false) RETURNING id INTO request_contact_one;
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_one;
    RAISE EXCEPTION 'contacts without primary accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE request_contacts SET is_primary=true WHERE id=request_contact_one;
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary)
  VALUES(request_one,contact_two,'OWNER','Secondary Contact',true) RETURNING id INTO request_contact_two;
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_one;
    RAISE EXCEPTION 'two primary contacts accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE request_contacts SET is_primary=false WHERE id=request_contact_two;
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_one;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,priority,status)
  VALUES('COMPANY_REQUEST',request_one,company_one,establishment_one,'MEDIUM','PENDING_ASSIGNMENT');
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;

  INSERT INTO companies(legal_name,rnc) VALUES('Inactive Integrity Company','999003003') RETURNING id INTO inactive_company;
  INSERT INTO establishments(company_id,name) VALUES(inactive_company,'Inactive Company Establishment') RETURNING id INTO inactive_company_establishment;
  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(inactive_company,inactive_company_establishment,'REGISTRATION','Inactive company',test_user) RETURNING id INTO request_test;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_test,'AUTHORIZATION_LETTER','requests/inactive-company.pdf','letter.pdf','application/pdf',10,'VALID',clock_timestamp(),test_user);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_test,contact_one,'PRIMARY_CONTACT','Primary Contact',true);
  UPDATE establishments SET status='INACTIVE' WHERE id=inactive_company_establishment;
  UPDATE companies SET status='INACTIVE' WHERE id=inactive_company;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_test;
    RAISE EXCEPTION 'inactive company accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO companies(legal_name,rnc) VALUES('Inactive Establishment Company','999003004') RETURNING id INTO inactive_establishment_company;
  INSERT INTO establishments(company_id,name) VALUES(inactive_establishment_company,'Inactive Integrity Establishment') RETURNING id INTO inactive_establishment;
  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(inactive_establishment_company,inactive_establishment,'REGISTRATION','Inactive establishment',test_user) RETURNING id INTO request_test;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_test,'AUTHORIZATION_LETTER','requests/inactive-establishment.pdf','letter.pdf','application/pdf',10,'VALID',clock_timestamp(),test_user);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_test,contact_one,'PRIMARY_CONTACT','Primary Contact',true);
  UPDATE establishments SET status='INACTIVE' WHERE id=inactive_establishment;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_test;
    RAISE EXCEPTION 'inactive establishment accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(company_one,establishment_one,'REGISTRATION','Wrong establishment',test_user) RETURNING id INTO request_test;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_test,'AUTHORIZATION_LETTER','requests/wrong-establishment.pdf','letter.pdf','application/pdf',10,'VALID',clock_timestamp(),test_user);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_test,contact_one,'PRIMARY_CONTACT','Primary Contact',true);
  BEGIN
    UPDATE company_requests SET establishment_id=establishment_two,status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_test;
    RAISE EXCEPTION 'establishment from another company accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(company_one,establishment_one,'REGISTRATION','Missing case',test_user) RETURNING id INTO request_test;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_test,'AUTHORIZATION_LETTER','requests/missing-case.pdf','letter.pdf','application/pdf',10,'VALID',clock_timestamp(),test_user);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_test,contact_one,'PRIMARY_CONTACT','Primary Contact',true);
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_test;
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'submitted request without case accepted';
  EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED;
  END;

  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(company_one,establishment_one,'REGISTRATION','Draft case',test_user) RETURNING id INTO request_test;
  BEGIN
    INSERT INTO cases(origin,request_id,company_id,establishment_id,priority,status) VALUES('COMPANY_REQUEST',request_test,company_one,establishment_one,'MEDIUM','PENDING_ASSIGNMENT');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'case for draft request accepted';
  EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED;
  END;

  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(company_one,establishment_one,'REGISTRATION','Mismatched case',test_user) RETURNING id INTO request_test;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_test,'AUTHORIZATION_LETTER','requests/mismatched-case.pdf','letter.pdf','application/pdf',10,'VALID',clock_timestamp(),test_user);
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_test,contact_one,'PRIMARY_CONTACT','Primary Contact',true);
  BEGIN
    UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_test;
    INSERT INTO cases(origin,request_id,company_id,establishment_id,priority,status) VALUES('COMPANY_REQUEST',request_test,company_two,establishment_two,'MEDIUM','PENDING_ASSIGNMENT');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'case scope mismatch accepted';
  EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED;
  END;

  INSERT INTO company_requests(company_id,establishment_id,request_type,reason,created_by_user_id) VALUES(company_one,establishment_one,'REGISTRATION','Document transitions',test_user) RETURNING id INTO request_test;
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes) VALUES(request_test,'SUPPORTING_DOCUMENT','requests/pending.pdf','pending.pdf','application/pdf',10) RETURNING id INTO pending_document;
  BEGIN
    UPDATE request_documents SET status='ARCHIVED',archived_at=clock_timestamp(),archived_by_user_id=test_user,deleted_at=clock_timestamp() WHERE id=pending_document;
    RAISE EXCEPTION 'PENDING to ARCHIVED accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes) VALUES(request_test,'SUPPORTING_DOCUMENT','requests/valid.pdf','valid.pdf','application/pdf',10) RETURNING id INTO valid_document;
  UPDATE request_documents SET status='VALID',validated_at=clock_timestamp(),validated_by_user_id=test_user WHERE id=valid_document;
  BEGIN
    UPDATE request_documents SET status='ARCHIVED',archived_at=clock_timestamp(),archived_by_user_id=test_user,deleted_at=clock_timestamp() WHERE id=valid_document;
    RAISE EXCEPTION 'VALID to ARCHIVED accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes) VALUES(request_test,'SUPPORTING_DOCUMENT','requests/rejected.pdf','rejected.pdf','application/pdf',10) RETURNING id INTO rejected_document;
  UPDATE request_documents SET status='REJECTED',validated_at=clock_timestamp(),validated_by_user_id=test_user,rejection_reason='Rejected for test' WHERE id=rejected_document;
  UPDATE request_documents SET status='ARCHIVED',archived_at=clock_timestamp(),archived_by_user_id=test_user,deleted_at=clock_timestamp() WHERE id=rejected_document;
  BEGIN
    UPDATE request_documents SET status='REJECTED',archived_at=NULL,archived_by_user_id=NULL,deleted_at=NULL WHERE id=rejected_document;
    RAISE EXCEPTION 'ARCHIVED document left terminal state';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
