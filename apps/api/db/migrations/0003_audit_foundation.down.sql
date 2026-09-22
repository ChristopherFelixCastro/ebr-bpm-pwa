DROP TABLE IF EXISTS audit_events;
DROP FUNCTION IF EXISTS reject_audit_event_mutation();
DROP FUNCTION IF EXISTS audit_metadata_has_forbidden_keys(jsonb);
