-- Local-only reversal to the original 0015 implementation.
CREATE OR REPLACE FUNCTION validate_user_company_scope(target_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_role text; current_status user_status; active_count integer;
BEGIN
  SELECT r.code, u.status INTO current_role, current_status FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=target_user_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*) INTO active_count FROM user_company_memberships WHERE user_id=target_user_id AND effective_to IS NULL;
  IF current_role IN ('COMPANY_ADMIN','DELEGATE') THEN
    IF current_status='APPROVED' AND active_count<>1 THEN RAISE EXCEPTION 'approved company user requires exactly one active company membership'; END IF;
  ELSIF active_count<>0 THEN RAISE EXCEPTION 'internal role cannot have an active company membership'; END IF;
END;
$$;
