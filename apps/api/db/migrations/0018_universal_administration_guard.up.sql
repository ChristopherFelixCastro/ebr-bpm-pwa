CREATE OR REPLACE FUNCTION prevent_last_active_universal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE active_universals integer;
BEGIN
  IF EXISTS (SELECT 1 FROM roles WHERE id=OLD.role_id AND code='UNIVERSAL')
     AND OLD.status='APPROVED'
     AND (NEW.status <> 'APPROVED' OR NOT EXISTS (SELECT 1 FROM roles WHERE id=NEW.role_id AND code='UNIVERSAL')) THEN
    PERFORM pg_advisory_xact_lock(hashtext('ebr-bpm:last-active-universal'));
    SELECT count(*) INTO active_universals FROM users u JOIN roles r ON r.id=u.role_id
      WHERE r.code='UNIVERSAL' AND u.status='APPROVED';
    IF active_universals <= 1 THEN RAISE EXCEPTION 'at least one active UNIVERSAL user is required' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_last_active_universal_guard
BEFORE UPDATE OF role_id,status ON users
FOR EACH ROW EXECUTE FUNCTION prevent_last_active_universal();
