DO $$
DECLARE
  reviewer_id uuid;
  applicant_id uuid;
  legacy_id uuid;
  letter_id uuid;
  second_id uuid;
  suffix text := substr(replace(gen_random_uuid()::text,'-',''),1,12);
BEGIN
  INSERT INTO roles(code,name,is_universal) VALUES('ADMIN','Administrator',false),('EVALUATOR','Evaluator',false) ON CONFLICT(code) DO NOTHING;
  INSERT INTO users(role_id,full_name,email,password_hash,status)
    SELECT id,'Reviewer','letters.reviewer.'||suffix||'@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN' RETURNING id INTO reviewer_id;
  INSERT INTO users(role_id,full_name,email,password_hash,status)
    SELECT id,'Applicant','letters.applicant.'||suffix||'@example.test','hash','PENDING_VALIDATION' FROM roles WHERE code='EVALUATOR' RETURNING id INTO applicant_id;

  -- Sin carta: la transición a APPROVED se rechaza.
  BEGIN
    UPDATE users SET status='APPROVED' WHERE id=applicant_id;
    RAISE EXCEPTION 'approval without letter accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO user_authorization_documents(user_id,storage_path,file_name,mime_type,size_bytes,sha256,uploaded_by_user_id)
    VALUES(applicant_id,'account-authorization-letter/'||applicant_id||'/'||gen_random_uuid()||'.pdf','carta.pdf','application/pdf',100,repeat('a',64),applicant_id)
    RETURNING id INTO letter_id;

  -- Carta pendiente: no habilita aprobación.
  BEGIN
    UPDATE users SET status='APPROVED' WHERE id=applicant_id;
    RAISE EXCEPTION 'approval with pending letter accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Solo una carta activa por cuenta.
  BEGIN
    INSERT INTO user_authorization_documents(user_id,storage_path,file_name,mime_type,size_bytes,sha256,uploaded_by_user_id)
      VALUES(applicant_id,'account-authorization-letter/'||applicant_id||'/'||gen_random_uuid()||'.pdf','otra.pdf','application/pdf',100,repeat('b',64),applicant_id);
    RAISE EXCEPTION 'second active letter accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- MIME, tamaño y hash se validan.
  BEGIN
    INSERT INTO user_authorization_documents(user_id,storage_path,file_name,mime_type,size_bytes,sha256,uploaded_by_user_id)
      VALUES(reviewer_id,'account-authorization-letter/'||reviewer_id||'/'||gen_random_uuid()||'.pdf','x.gif','image/gif',100,repeat('c',64),reviewer_id);
    RAISE EXCEPTION 'unsupported mime accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO user_authorization_documents(user_id,storage_path,file_name,mime_type,size_bytes,sha256,uploaded_by_user_id)
      VALUES(reviewer_id,'account-authorization-letter/'||reviewer_id||'/'||gen_random_uuid()||'.pdf','x.pdf','application/pdf',5242881,repeat('c',64),reviewer_id);
    RAISE EXCEPTION 'oversized letter accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- La propia cuenta no revisa su carta; el rechazo exige motivo.
  BEGIN
    UPDATE user_authorization_documents SET status='VALID',reviewed_by_user_id=applicant_id,reviewed_at=clock_timestamp() WHERE id=letter_id;
    RAISE EXCEPTION 'self review accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE user_authorization_documents SET status='REJECTED',reviewed_by_user_id=reviewer_id,reviewed_at=clock_timestamp() WHERE id=letter_id;
    RAISE EXCEPTION 'rejection without reason accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Rechazada: no habilita; luego se archiva y se reemplaza.
  UPDATE user_authorization_documents SET status='REJECTED',reviewed_by_user_id=reviewer_id,reviewed_at=clock_timestamp(),rejection_reason='Firma ilegible' WHERE id=letter_id;
  BEGIN
    UPDATE users SET status='APPROVED' WHERE id=applicant_id;
    RAISE EXCEPTION 'approval with rejected letter accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE user_authorization_documents SET status='VALID' WHERE id=letter_id;
    RAISE EXCEPTION 'rejected letter revalidated';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE user_authorization_documents SET sha256=repeat('d',64) WHERE id=letter_id;
    RAISE EXCEPTION 'letter content changed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE user_authorization_documents SET status='ARCHIVED',archived_by_user_id=reviewer_id,archived_at=clock_timestamp() WHERE id=letter_id;
  IF (SELECT version FROM user_authorization_documents WHERE id=letter_id) <> 3 THEN RAISE EXCEPTION 'letter version not advanced'; END IF;
  BEGIN
    DELETE FROM user_authorization_documents WHERE id=letter_id;
    RAISE EXCEPTION 'letter deleted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO user_authorization_documents(user_id,storage_path,file_name,mime_type,size_bytes,sha256,uploaded_by_user_id)
    VALUES(applicant_id,'account-authorization-letter/'||applicant_id||'/'||gen_random_uuid()||'.png','carta.png','image/png',100,repeat('e',64),reviewer_id)
    RETURNING id INTO second_id;
  UPDATE user_authorization_documents SET status='VALID',reviewed_by_user_id=reviewer_id,reviewed_at=clock_timestamp() WHERE id=second_id;
  UPDATE users SET status='APPROVED' WHERE id=applicant_id;
  IF (SELECT status FROM users WHERE id=applicant_id) <> 'APPROVED' THEN RAISE EXCEPTION 'approval with valid letter failed'; END IF;

  -- Cuentas aprobadas antes de la carta no se invalidan; una reactivación sí exige carta.
  INSERT INTO users(role_id,full_name,email,password_hash,status)
    SELECT id,'Legacy','letters.legacy.'||suffix||'@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR' RETURNING id INTO legacy_id;
  UPDATE users SET full_name='Legacy renamed' WHERE id=legacy_id;
  UPDATE users SET status='INACTIVE' WHERE id=legacy_id;
  BEGIN
    UPDATE users SET status='APPROVED' WHERE id=legacy_id;
    RAISE EXCEPTION 'reactivation without letter accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
