CREATE TYPE organization_status AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE companies
  ADD COLUMN status organization_status NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE establishments
  ADD COLUMN status organization_status NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX companies_status_idx ON companies(status);
CREATE INDEX establishments_company_status_idx ON establishments(company_id, status);

CREATE OR REPLACE FUNCTION validate_company_establishment_status(target_company_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id=target_company_id AND c.status='INACTIVE'
      AND EXISTS (SELECT 1 FROM establishments e WHERE e.company_id=c.id AND e.status='ACTIVE')
  ) THEN
    RAISE EXCEPTION 'inactive company cannot have active establishments';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION company_status_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM validate_company_establishment_status(NEW.id); RETURN NULL; END;
$$;
CREATE OR REPLACE FUNCTION establishment_status_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM validate_company_establishment_status(COALESCE(NEW.company_id,OLD.company_id));
  IF TG_OP='UPDATE' AND OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    PERFORM validate_company_establishment_status(OLD.company_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER companies_status_guard
AFTER UPDATE OF status ON companies DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION company_status_guard();
CREATE CONSTRAINT TRIGGER establishments_status_guard
AFTER INSERT OR UPDATE OF company_id,status OR DELETE ON establishments DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION establishment_status_guard();
