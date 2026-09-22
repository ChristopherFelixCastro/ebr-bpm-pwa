CREATE OR REPLACE FUNCTION audit_metadata_has_forbidden_keys(payload jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text; v jsonb; forbidden text[] := ARRAY['password','password_hash','token','refresh_token','authorization','signed_url','identity_document','rnc','coordinates','latitude','longitude','binary','file_content','cedula','cédula','passport','pasaporte','document','document_number','geolocation','location','email','phone','address'];
BEGIN
  IF jsonb_typeof(payload) = 'object' THEN
    FOR k,v IN SELECT key,value FROM jsonb_each(payload) LOOP
      IF lower(k) = ANY(forbidden) OR audit_metadata_has_forbidden_keys(v) THEN RETURN true; END IF;
    END LOOP;
  ELSIF jsonb_typeof(payload) = 'array' THEN
    FOR v IN SELECT value FROM jsonb_array_elements(payload) LOOP
      IF audit_metadata_has_forbidden_keys(v) THEN RETURN true; END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT, actor_type varchar(10) NOT NULL,
  correlation_id uuid NOT NULL, action varchar(100) NOT NULL, entity_type varchar(80), entity_id uuid,
  outcome varchar(10) NOT NULL, source varchar(16) NOT NULL, ip_address inet, user_agent varchar(512),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (actor_type IN ('USER','SYSTEM')),
  CHECK ((actor_type = 'USER' AND actor_user_id IS NOT NULL) OR (actor_type = 'SYSTEM' AND actor_user_id IS NULL)),
  CHECK (outcome IN ('SUCCESS','FAILURE','DENIED')),
  CHECK (source IN ('HTTP','SYNC','SYSTEM')),
  CHECK (btrim(action) <> '' AND action = upper(btrim(action))),
  CHECK (entity_type IS NULL OR (btrim(entity_type) <> '' AND entity_type = upper(btrim(entity_type)))),
  CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (NOT audit_metadata_has_forbidden_keys(metadata))
);
CREATE INDEX audit_events_occurred_idx ON audit_events(occurred_at DESC);
CREATE INDEX audit_events_actor_occurred_idx ON audit_events(actor_user_id, occurred_at DESC);
CREATE INDEX audit_events_correlation_idx ON audit_events(correlation_id);
CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_events_action_occurred_idx ON audit_events(action, occurred_at DESC);
CREATE INDEX audit_events_non_success_idx ON audit_events(outcome, occurred_at DESC) WHERE outcome <> 'SUCCESS';

CREATE OR REPLACE FUNCTION reject_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events are immutable' USING ERRCODE = '55000'; END; $$;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();
REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC;
