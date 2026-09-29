DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM company_requests WHERE created_by_user_id IS NOT NULL) OR EXISTS(SELECT 1 FROM request_documents WHERE validated_by_user_id IS NOT NULL OR rejection_reason IS NOT NULL OR archived_at IS NOT NULL OR archived_by_user_id IS NOT NULL) OR EXISTS(SELECT 1 FROM request_contacts WHERE removed_at IS NOT NULL OR removed_by_user_id IS NOT NULL) THEN RAISE EXCEPTION '0020 down would discard API data; clean it explicitly in local environment'; END IF;
END $$;
DROP TRIGGER IF EXISTS request_documents_submitted_immutable ON request_documents; DROP TRIGGER IF EXISTS request_contacts_submitted_immutable ON request_contacts; DROP TRIGGER IF EXISTS company_requests_submitted_immutable ON company_requests; DROP FUNCTION IF EXISTS submitted_request_immutability_guard();
DROP TRIGGER IF EXISTS request_documents_limit_guard ON request_documents; DROP FUNCTION IF EXISTS request_document_limit_guard();
DROP INDEX IF EXISTS request_contacts_active_unique; ALTER TABLE request_contacts DROP COLUMN removed_by_user_id,DROP COLUMN removed_at; ALTER TABLE request_contacts ADD CONSTRAINT request_contacts_request_id_contact_id_relationship_type_key UNIQUE(request_id,contact_id,relationship_type);
DROP INDEX IF EXISTS request_active_letter; CREATE UNIQUE INDEX request_active_letter ON request_documents(request_id) WHERE document_type='AUTHORIZATION_LETTER' AND deleted_at IS NULL AND status IN('PENDING','VALID');
ALTER TABLE request_documents DROP CONSTRAINT request_documents_state_coherent,DROP COLUMN archived_by_user_id,DROP COLUMN archived_at,DROP COLUMN rejection_reason,DROP COLUMN validated_by_user_id;
DROP INDEX IF EXISTS company_requests_company_status_created_idx; ALTER TABLE company_requests DROP COLUMN created_by_user_id;
