DO $$
DECLARE
  company_role_id uuid;
  internal_role_id uuid;
  company_one uuid;
  company_two uuid;
  company_user uuid;
  internal_user uuid;
BEGIN
  SELECT id INTO company_role_id FROM roles WHERE code = 'COMPANY_ADMIN';
  SELECT id INTO internal_role_id FROM roles WHERE code = 'ADMIN';
  INSERT INTO companies(legal_name) VALUES ('Scope Company One') RETURNING id INTO company_one;
  INSERT INTO companies(legal_name) VALUES ('Scope Company Two') RETURNING id INTO company_two;

  INSERT INTO users(role_id, full_name, email, password_hash, status)
  VALUES(company_role_id, 'Scoped User', 'scoped-user@test.local', 'hash', 'PENDING_VALIDATION')
  RETURNING id INTO company_user;
  INSERT INTO user_company_memberships(user_id, company_id) VALUES(company_user, company_one);
  UPDATE users SET status = 'APPROVED' WHERE id = company_user;
  PERFORM validate_user_company_scope(company_user);

  BEGIN
    INSERT INTO user_company_memberships(user_id, company_id) VALUES(company_user, company_two);
    RAISE EXCEPTION 'second active company membership was accepted';
  EXCEPTION WHEN exclusion_violation OR unique_violation THEN NULL;
  END;

  UPDATE user_company_memberships SET effective_to = current_date + 1 WHERE user_id = company_user;
  INSERT INTO user_company_memberships(user_id, company_id, effective_from)
  VALUES(company_user, company_two, current_date + 1);
  PERFORM validate_user_company_scope(company_user);

  INSERT INTO users(role_id, full_name, email, password_hash, status)
  VALUES(internal_role_id, 'Internal User', 'internal-user@test.local', 'hash', 'APPROVED')
  RETURNING id INTO internal_user;
  BEGIN
    INSERT INTO user_company_memberships(user_id, company_id) VALUES(internal_user, company_one);
    PERFORM validate_user_company_scope(internal_user);
    RAISE EXCEPTION 'internal role membership was accepted';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_company_scope_guard')
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'memberships_company_scope_guard') THEN
    RAISE EXCEPTION 'company scope constraint triggers are missing';
  END IF;

  UPDATE users SET status = 'INACTIVE' WHERE id = internal_user;
  IF (SELECT status::text FROM users WHERE id = internal_user) <> 'INACTIVE' THEN
    RAISE EXCEPTION 'INACTIVE status was not stored';
  END IF;
END $$;
