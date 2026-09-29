ALTER TABLE company_requests ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS company_requests_company_status_created_idx ON company_requests(company_id,status,created_at DESC);

ALTER TABLE request_documents
  ADD COLUMN validated_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN rejection_reason text,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT request_documents_state_coherent CHECK (
    (status='PENDING' AND validated_at IS NULL AND validated_by_user_id IS NULL AND rejection_reason IS NULL AND archived_at IS NULL AND archived_by_user_id IS NULL) OR
    (status='VALID' AND validated_at IS NOT NULL AND validated_by_user_id IS NOT NULL AND rejection_reason IS NULL AND archived_at IS NULL AND archived_by_user_id IS NULL) OR
    (status='REJECTED' AND validated_at IS NOT NULL AND validated_by_user_id IS NOT NULL AND rejection_reason IS NOT NULL AND btrim(rejection_reason)<>'' AND archived_at IS NULL AND archived_by_user_id IS NULL) OR
    (status='ARCHIVED' AND archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL)
  );
DROP INDEX IF EXISTS request_active_letter;
CREATE UNIQUE INDEX request_active_letter ON request_documents(request_id) WHERE document_type='AUTHORIZATION_LETTER' AND deleted_at IS NULL AND status<>'ARCHIVED';

ALTER TABLE request_contacts ADD COLUMN removed_at timestamptz, ADD COLUMN removed_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE request_contacts DROP CONSTRAINT IF EXISTS request_contacts_request_id_contact_id_relationship_type_key;
CREATE UNIQUE INDEX request_contacts_active_unique ON request_contacts(request_id,contact_id,relationship_type) WHERE removed_at IS NULL;

CREATE OR REPLACE FUNCTION request_document_limit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE active_count integer; target_request uuid := COALESCE(NEW.request_id,OLD.request_id);
BEGIN
  PERFORM 1 FROM company_requests WHERE id=target_request FOR UPDATE;
  IF NEW.deleted_at IS NULL AND NEW.status<>'ARCHIVED' THEN
    SELECT count(*) INTO active_count FROM request_documents WHERE request_id=target_request AND deleted_at IS NULL AND status<>'ARCHIVED' AND id<>NEW.id;
    IF active_count>=10 THEN RAISE EXCEPTION 'maximum 10 active request documents' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER request_documents_limit_guard BEFORE INSERT OR UPDATE ON request_documents FOR EACH ROW EXECUTE FUNCTION request_document_limit_guard();

CREATE OR REPLACE FUNCTION submitted_request_immutability_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_uuid uuid; request_state request_status;
BEGIN
  IF TG_TABLE_NAME='company_requests' THEN
    IF OLD.status='PENDING_ASSIGNMENT' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'submitted request is immutable' USING ERRCODE='55000'; END IF;
    RETURN NEW;
  END IF;
  request_uuid := COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.request_id ELSE NEW.request_id END),OLD.request_id);
  SELECT status INTO request_state FROM company_requests WHERE id=request_uuid;
  IF request_state='PENDING_ASSIGNMENT' THEN RAISE EXCEPTION 'submitted request children are immutable' USING ERRCODE='55000'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER company_requests_submitted_immutable BEFORE UPDATE ON company_requests FOR EACH ROW EXECUTE FUNCTION submitted_request_immutability_guard();
CREATE TRIGGER request_contacts_submitted_immutable BEFORE INSERT OR UPDATE OR DELETE ON request_contacts FOR EACH ROW EXECUTE FUNCTION submitted_request_immutability_guard();
CREATE TRIGGER request_documents_submitted_immutable BEFORE INSERT OR UPDATE OR DELETE ON request_documents FOR EACH ROW EXECUTE FUNCTION submitted_request_immutability_guard();
