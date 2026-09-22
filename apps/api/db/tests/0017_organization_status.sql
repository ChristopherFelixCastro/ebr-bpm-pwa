DO $$
DECLARE company_id uuid; establishment_id uuid;
BEGIN
  INSERT INTO companies(legal_name) VALUES('Status Test Company') RETURNING id INTO company_id;
  INSERT INTO establishments(company_id,name) VALUES(company_id,'Status Test Establishment') RETURNING id INTO establishment_id;
  IF (SELECT status::text FROM companies WHERE id=company_id)<>'ACTIVE' THEN RAISE EXCEPTION 'company default status invalid'; END IF;
  IF (SELECT status::text FROM establishments WHERE id=establishment_id)<>'ACTIVE' THEN RAISE EXCEPTION 'establishment default status invalid'; END IF;

  BEGIN
    UPDATE companies SET status='INACTIVE' WHERE id=company_id;
    PERFORM validate_company_establishment_status(company_id);
    RAISE EXCEPTION 'inactive company with active establishment accepted';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  UPDATE establishments SET status='INACTIVE' WHERE id=establishment_id;
  UPDATE companies SET status='INACTIVE' WHERE id=company_id;
  PERFORM validate_company_establishment_status(company_id);
END $$;
