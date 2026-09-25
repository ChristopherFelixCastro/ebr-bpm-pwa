-- Carta de autorización de la cuenta (distinta de AUTHORIZATION_LETTER de una solicitud BPM).
-- Historial por usuario: como máximo una carta activa (no archivada); reemplazar archiva la anterior.
CREATE TABLE user_authorization_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storage_path text NOT NULL UNIQUE,
  file_name varchar(300) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes bigint NOT NULL,
  sha256 char(64) NOT NULL,
  status document_status NOT NULL DEFAULT 'PENDING',
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  rejection_reason varchar(1000),
  archived_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (btrim(file_name) <> ''),
  CHECK (status NOT IN ('VALID','REJECTED') OR (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (status <> 'REJECTED' OR (rejection_reason IS NOT NULL AND btrim(rejection_reason) <> '')),
  CHECK ((status = 'ARCHIVED') = (archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL))
);
CREATE UNIQUE INDEX user_authorization_documents_one_active ON user_authorization_documents(user_id) WHERE status <> 'ARCHIVED';
CREATE INDEX user_authorization_documents_user_history ON user_authorization_documents(user_id, uploaded_at DESC);
CREATE TRIGGER user_authorization_documents_version BEFORE UPDATE ON user_authorization_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

-- Solo transiciones de revisión permitidas; el contenido del objeto es inmutable.
CREATE OR REPLACE FUNCTION user_authorization_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id OR NEW.storage_path <> OLD.storage_path OR NEW.sha256 <> OLD.sha256
     OR NEW.mime_type <> OLD.mime_type OR NEW.size_bytes <> OLD.size_bytes OR NEW.uploaded_by_user_id <> OLD.uploaded_by_user_id THEN
    RAISE EXCEPTION 'account authorization letter content is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'PENDING' AND NEW.status IN ('VALID','REJECTED','ARCHIVED'))
    OR (OLD.status IN ('VALID','REJECTED') AND NEW.status = 'ARCHIVED')
  ) THEN
    RAISE EXCEPTION 'invalid account authorization letter transition % -> %', OLD.status, NEW.status USING ERRCODE = '23514';
  END IF;
  IF NEW.status IN ('VALID','REJECTED') AND NEW.reviewed_by_user_id = NEW.user_id THEN
    RAISE EXCEPTION 'an account cannot review its own authorization letter' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_authorization_documents_guard BEFORE UPDATE ON user_authorization_documents FOR EACH ROW EXECUTE FUNCTION user_authorization_document_guard();
CREATE OR REPLACE FUNCTION user_authorization_document_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'account authorization letters are archived, never deleted' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER user_authorization_documents_no_delete BEFORE DELETE ON user_authorization_documents FOR EACH ROW EXECUTE FUNCTION user_authorization_document_no_delete();

-- Persistencia: una cuenta solo pasa a APPROVED con una carta activa VALID.
-- No invalida cuentas aprobadas antes de esta migración (solo actúa en la transición).
-- El bootstrap inicial UNIVERSAL crea la cuenta aprobada mediante INSERT controlado y no pasa por esta transición.
CREATE OR REPLACE FUNCTION users_approval_requires_valid_letter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM user_authorization_documents WHERE user_id = NEW.id AND status = 'VALID' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval requires a valid account authorization letter'
      USING ERRCODE = '23514', CONSTRAINT = 'users_approval_requires_valid_letter';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER users_approval_requires_valid_letter BEFORE UPDATE OF status ON users FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED')
  EXECUTE FUNCTION users_approval_requires_valid_letter();
