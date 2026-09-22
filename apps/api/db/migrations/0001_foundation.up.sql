CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE schema_migrations (version integer PRIMARY KEY, name text NOT NULL, checksum_sha256 char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
