DROP TRIGGER IF EXISTS cases_company_request_integrity ON cases;
DROP TRIGGER IF EXISTS company_requests_case_integrity ON company_requests;
DROP TRIGGER IF EXISTS cases_company_request_insert_guard ON cases;
DROP FUNCTION IF EXISTS company_request_case_insert_guard();
DROP FUNCTION IF EXISTS company_request_case_integrity_trigger();
DROP FUNCTION IF EXISTS assert_company_request_case_integrity(uuid);

DROP TRIGGER IF EXISTS request_documents_status_transition_guard ON request_documents;
DROP FUNCTION IF EXISTS request_document_status_transition_guard();

DROP TRIGGER IF EXISTS a_request_documents_parent_lock ON request_documents;
DROP TRIGGER IF EXISTS a_request_contacts_parent_lock ON request_contacts;
DROP FUNCTION IF EXISTS request_children_parent_lock();

CREATE OR REPLACE FUNCTION request_case_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM establishments e WHERE e.id=NEW.establishment_id AND e.company_id<>NEW.company_id) THEN RAISE EXCEPTION 'establishment company mismatch'; END IF;
  IF NEW.status='PENDING_ASSIGNMENT' AND NOT EXISTS(SELECT 1 FROM request_documents WHERE request_id=NEW.id AND document_type='AUTHORIZATION_LETTER' AND status='VALID' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'valid authorization letter required'; END IF;
  RETURN NEW;
END $$;
