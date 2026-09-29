DROP TRIGGER IF EXISTS users_last_active_universal_guard ON users;
DROP FUNCTION IF EXISTS prevent_last_active_universal();

CREATE OR REPLACE FUNCTION prevent_last_active_universal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE active_universals integer; removes_active boolean;
BEGIN
  removes_active := EXISTS (SELECT 1 FROM roles WHERE id=OLD.role_id AND code='UNIVERSAL') AND OLD.status='APPROVED'
    AND (TG_OP='DELETE' OR NEW.status <> 'APPROVED' OR NOT EXISTS (SELECT 1 FROM roles WHERE id=NEW.role_id AND code='UNIVERSAL'));
  IF removes_active THEN
    PERFORM pg_advisory_xact_lock(hashtext('ebr-bpm:last-active-universal'));
    SELECT count(*) INTO active_universals FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='UNIVERSAL' AND u.status='APPROVED';
    IF active_universals <= 1 THEN RAISE EXCEPTION 'at least one active UNIVERSAL user is required' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER users_last_active_universal_guard BEFORE UPDATE OF role_id,status OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION prevent_last_active_universal();
