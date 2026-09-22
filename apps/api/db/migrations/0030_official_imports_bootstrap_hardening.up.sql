CREATE TYPE official_import_type AS ENUM ('BPM', 'RISK');
CREATE TYPE official_import_mode AS ENUM ('DRY_RUN', 'APPLY');
CREATE TYPE official_import_status AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'REJECTED', 'SKIPPED');

CREATE TABLE official_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type official_import_type NOT NULL,
  mode official_import_mode NOT NULL,
  status official_import_status NOT NULL DEFAULT 'STARTED',
  package_sha256 char(64) NOT NULL,
  functional_sha256 char(64) NOT NULL,
  manifest_sha256 char(64) NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  actor_label varchar(120) NOT NULL,
  correlation_id uuid,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  rows_read integer NOT NULL DEFAULT 0,
  rows_accepted integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  bpm_template_version_id uuid REFERENCES bpm_template_versions(id) ON DELETE RESTRICT,
  catalog_version_id uuid REFERENCES catalog_versions(id) ON DELETE RESTRICT,
  risk_rule_version_id uuid REFERENCES risk_rule_versions(id) ON DELETE RESTRICT,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (package_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (functional_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (btrim(actor_label) <> ''),
  CHECK (rows_read >= 0 AND rows_accepted >= 0 AND rows_skipped >= 0 AND warning_count >= 0 AND rejected_count >= 0),
  CHECK (jsonb_typeof(report) = 'object'),
  CHECK (NOT audit_metadata_has_forbidden_keys(report)),
  CHECK ((status = 'STARTED' AND finished_at IS NULL) OR (status <> 'STARTED' AND finished_at IS NOT NULL)),
  CHECK (mode = 'APPLY' OR (bpm_template_version_id IS NULL AND catalog_version_id IS NULL AND risk_rule_version_id IS NULL)),
  CHECK (status <> 'SUCCEEDED' OR mode = 'DRY_RUN' OR
    (import_type = 'BPM' AND bpm_template_version_id IS NOT NULL AND catalog_version_id IS NULL AND risk_rule_version_id IS NULL) OR
    (import_type = 'RISK' AND bpm_template_version_id IS NULL AND catalog_version_id IS NOT NULL AND risk_rule_version_id IS NOT NULL))
);

CREATE TABLE official_import_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid NOT NULL REFERENCES official_import_runs(id) ON DELETE RESTRICT,
  logical_name varchar(100) NOT NULL,
  file_name varchar(260) NOT NULL,
  content_sha256 char(64) NOT NULL,
  sheet_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (import_run_id, logical_name),
  CHECK (btrim(logical_name) <> '' AND btrim(file_name) <> ''),
  CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(sheet_names) = 'array')
);

CREATE UNIQUE INDEX official_import_runs_applied_package_idx
  ON official_import_runs(package_sha256)
  WHERE mode = 'APPLY' AND status = 'SUCCEEDED';
CREATE INDEX official_import_runs_lookup_idx ON official_import_runs(import_type, package_sha256, started_at DESC);
CREATE INDEX official_import_runs_actor_idx ON official_import_runs(actor_user_id, started_at DESC) WHERE actor_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION official_import_run_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'official import runs are immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD.status <> 'STARTED' THEN
    RAISE EXCEPTION 'completed official import runs are immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.import_type IS DISTINCT FROM OLD.import_type
    OR NEW.mode IS DISTINCT FROM OLD.mode
    OR NEW.package_sha256 IS DISTINCT FROM OLD.package_sha256
    OR NEW.functional_sha256 IS DISTINCT FROM OLD.functional_sha256
    OR NEW.manifest_sha256 IS DISTINCT FROM OLD.manifest_sha256
    OR NEW.actor_user_id IS DISTINCT FROM OLD.actor_user_id
    OR NEW.actor_label IS DISTINCT FROM OLD.actor_label
    OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id
    OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'official import identity is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER official_import_runs_guard BEFORE UPDATE OR DELETE ON official_import_runs FOR EACH ROW EXECUTE FUNCTION official_import_run_guard();

CREATE OR REPLACE FUNCTION official_import_file_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_status official_import_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'official import files are immutable' USING ERRCODE = '55000';
  END IF;
  SELECT status INTO run_status FROM official_import_runs WHERE id = COALESCE(NEW.import_run_id, OLD.import_run_id);
  IF run_status IS DISTINCT FROM 'STARTED' THEN
    RAISE EXCEPTION 'completed official import files are immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER official_import_files_guard BEFORE INSERT OR UPDATE OR DELETE ON official_import_files FOR EACH ROW EXECUTE FUNCTION official_import_file_guard();

REVOKE UPDATE, DELETE ON official_import_files FROM PUBLIC;
REVOKE DELETE ON official_import_runs FROM PUBLIC;
