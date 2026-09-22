DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE status::text = 'INACTIVE') THEN
    RAISE EXCEPTION 'cannot remove INACTIVE while users still use it';
  END IF;
END $$;

DROP TRIGGER IF EXISTS memberships_company_scope_guard ON user_company_memberships;
DROP TRIGGER IF EXISTS users_company_scope_guard ON users;
DROP FUNCTION IF EXISTS user_company_scope_from_membership_guard();
DROP FUNCTION IF EXISTS user_company_scope_from_user_guard();
DROP FUNCTION IF EXISTS validate_user_company_scope(uuid);
DROP TABLE IF EXISTS user_company_memberships;

ALTER TYPE user_status RENAME TO user_status_0015;
CREATE TYPE user_status AS ENUM ('PENDING_VALIDATION', 'APPROVED', 'REJECTED');
ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
ALTER TABLE users ALTER COLUMN status TYPE user_status USING status::text::user_status;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'PENDING_VALIDATION';
DROP TYPE user_status_0015;
