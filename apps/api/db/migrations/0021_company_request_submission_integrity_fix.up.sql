CREATE OR REPLACE FUNCTION request_children_parent_lock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN parent_id := OLD.request_id; ELSE parent_id := NEW.request_id; END IF;
  PERFORM 1 FROM company_requests WHERE id = parent_id FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER a_request_contacts_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON request_contacts
FOR EACH ROW EXECUTE FUNCTION request_children_parent_lock();
CREATE TRIGGER a_request_documents_parent_lock BEFORE INSERT OR UPDATE OR DELETE ON request_documents
FOR EACH ROW EXECUTE FUNCTION request_children_parent_lock();

CREATE OR REPLACE FUNCTION request_case_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  company_state organization_status;
  establishment_state organization_status;
  actual_company_id uuid;
  active_documents integer;
  valid_letters integer;
  active_contacts integer;
  primary_contacts integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM 1 FROM company_requests WHERE id = NEW.id FOR UPDATE;
  END IF;

  SELECT c.status,e.status,e.company_id
    INTO company_state,establishment_state,actual_company_id
    FROM establishments e JOIN companies c ON c.id=e.company_id
   WHERE e.id=NEW.establishment_id
   FOR SHARE OF c,e;

  IF actual_company_id IS NULL THEN RAISE EXCEPTION 'establishment not found' USING ERRCODE='23514'; END IF;
  IF actual_company_id<>NEW.company_id THEN RAISE EXCEPTION 'establishment company mismatch' USING ERRCODE='23514'; END IF;

  IF NEW.status='PENDING_ASSIGNMENT' AND (TG_OP='INSERT' OR OLD.status='DRAFT') THEN
    IF company_state<>'ACTIVE' THEN RAISE EXCEPTION 'active company required' USING ERRCODE='23514'; END IF;
    IF establishment_state<>'ACTIVE' THEN RAISE EXCEPTION 'active establishment required' USING ERRCODE='23514'; END IF;

    SELECT count(*)::integer,
           count(*) FILTER(WHERE document_type='AUTHORIZATION_LETTER' AND status='VALID')::integer
      INTO active_documents,valid_letters
      FROM request_documents
     WHERE request_id=NEW.id AND deleted_at IS NULL AND status<>'ARCHIVED';
    SELECT count(*)::integer,count(*) FILTER(WHERE is_primary)::integer
      INTO active_contacts,primary_contacts
      FROM request_contacts
     WHERE request_id=NEW.id AND removed_at IS NULL;

    IF active_documents<1 OR active_documents>10 THEN RAISE EXCEPTION 'between 1 and 10 active documents required' USING ERRCODE='23514'; END IF;
    IF valid_letters<>1 THEN RAISE EXCEPTION 'exactly one valid authorization letter required' USING ERRCODE='23514'; END IF;
    IF active_contacts<1 THEN RAISE EXCEPTION 'active request contact required' USING ERRCODE='23514'; END IF;
    IF primary_contacts<>1 THEN RAISE EXCEPTION 'exactly one primary request contact required' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION request_document_status_transition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status='PENDING' AND NEW.status IN('VALID','REJECTED')) OR
    (OLD.status='REJECTED' AND NEW.status='ARCHIVED')
  ) THEN
    RAISE EXCEPTION 'invalid request document status transition' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER request_documents_status_transition_guard BEFORE UPDATE ON request_documents
FOR EACH ROW EXECUTE FUNCTION request_document_status_transition_guard();

CREATE OR REPLACE FUNCTION assert_company_request_case_integrity(target_request uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  request_state request_status;
  request_company uuid;
  request_establishment uuid;
  linked_cases integer;
  linked_origin case_origin;
  linked_company uuid;
  linked_establishment uuid;
BEGIN
  SELECT status,company_id,establishment_id INTO request_state,request_company,request_establishment
    FROM company_requests WHERE id=target_request;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*)::integer,min(origin::text)::case_origin,min(company_id::text)::uuid,min(establishment_id::text)::uuid
    INTO linked_cases,linked_origin,linked_company,linked_establishment
    FROM cases WHERE request_id=target_request;

  IF request_state='DRAFT' AND linked_cases<>0 THEN
    RAISE EXCEPTION 'draft company request cannot have a case' USING ERRCODE='23514';
  END IF;
  IF request_state='PENDING_ASSIGNMENT' THEN
    IF linked_cases<>1 THEN RAISE EXCEPTION 'submitted company request requires exactly one case' USING ERRCODE='23514'; END IF;
    IF linked_origin<>'COMPANY_REQUEST' OR linked_company IS DISTINCT FROM request_company OR linked_establishment IS DISTINCT FROM request_establishment THEN
      RAISE EXCEPTION 'company request case scope mismatch' USING ERRCODE='23514';
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION company_request_case_integrity_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='company_requests' THEN
    PERFORM assert_company_request_case_integrity(NEW.id);
  ELSE
    IF TG_OP IN('UPDATE','DELETE') AND OLD.request_id IS NOT NULL THEN PERFORM assert_company_request_case_integrity(OLD.request_id); END IF;
    IF TG_OP IN('INSERT','UPDATE') AND NEW.request_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.request_id IS DISTINCT FROM OLD.request_id) THEN
      PERFORM assert_company_request_case_integrity(NEW.request_id);
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION company_request_case_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.origin='COMPANY_REQUEST' AND (NEW.request_id IS NULL OR NEW.status<>'PENDING_ASSIGNMENT' OR NEW.priority<>'MEDIUM') THEN
    RAISE EXCEPTION 'company request case must start pending assignment with medium priority' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cases_company_request_insert_guard BEFORE INSERT ON cases
FOR EACH ROW EXECUTE FUNCTION company_request_case_insert_guard();

CREATE CONSTRAINT TRIGGER company_requests_case_integrity AFTER INSERT OR UPDATE ON company_requests
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION company_request_case_integrity_trigger();
CREATE CONSTRAINT TRIGGER cases_company_request_integrity AFTER INSERT OR UPDATE OR DELETE ON cases
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION company_request_case_integrity_trigger();

DO $$ DECLARE request_row record; BEGIN
  FOR request_row IN SELECT id FROM company_requests LOOP
    PERFORM assert_company_request_case_integrity(request_row.id);
  END LOOP;
END $$;
