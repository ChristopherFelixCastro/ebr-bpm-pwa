ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'INACTIVE';

CREATE TABLE user_company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  EXCLUDE USING gist (
    user_id WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  )
);

CREATE UNIQUE INDEX user_company_one_active
  ON user_company_memberships(user_id)
  WHERE effective_to IS NULL;
CREATE INDEX user_company_company_lookup
  ON user_company_memberships(company_id, user_id)
  WHERE effective_to IS NULL;

CREATE OR REPLACE FUNCTION validate_user_company_scope(target_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  current_role text;
  current_status user_status;
  active_count integer;
BEGIN
  SELECT r.code, u.status INTO current_role, current_status
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.id = target_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO active_count
  FROM user_company_memberships
  WHERE user_id = target_user_id AND effective_to IS NULL;

  IF current_role IN ('COMPANY_ADMIN', 'DELEGATE') THEN
    IF current_status = 'APPROVED' AND active_count <> 1 THEN
      RAISE EXCEPTION 'approved company user requires exactly one active company membership';
    END IF;
  ELSIF active_count <> 0 THEN
    RAISE EXCEPTION 'internal role cannot have an active company membership';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION user_company_scope_from_user_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM validate_user_company_scope(NEW.id);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION user_company_scope_from_membership_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM validate_user_company_scope(COALESCE(NEW.user_id, OLD.user_id));
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM validate_user_company_scope(OLD.user_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER users_company_scope_guard
AFTER INSERT OR UPDATE OF role_id, status ON users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION user_company_scope_from_user_guard();

CREATE CONSTRAINT TRIGGER memberships_company_scope_guard
AFTER INSERT OR UPDATE OR DELETE ON user_company_memberships
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION user_company_scope_from_membership_guard();
