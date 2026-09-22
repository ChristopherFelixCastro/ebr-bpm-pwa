CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_status AS ENUM ('PENDING_VALIDATION', 'APPROVED', 'REJECTED');
CREATE TYPE contact_relationship_type AS ENUM ('LEGAL_REPRESENTATIVE', 'QUALITY_CONTACT', 'PRIMARY_CONTACT', 'OWNER', 'REPRESENTATIVE');

CREATE OR REPLACE FUNCTION normalize_identifier(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT NULLIF(regexp_replace(upper(btrim(value)), '[^A-Z0-9]', '', 'g'), '')
$$;
CREATE OR REPLACE FUNCTION set_updated_at_and_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = clock_timestamp(); NEW.version = OLD.version + 1; RETURN NEW; END; $$;

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
  is_universal boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(code) <> ''), CHECK (code = upper(btrim(code))), CHECK (btrim(name) <> ''), CHECK ((code = 'UNIVERSAL') = is_universal)
);
CREATE UNIQUE INDEX roles_one_universal ON roles (is_universal) WHERE is_universal;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  full_name text NOT NULL, identity_document text, identity_document_normalized text GENERATED ALWAYS AS (normalize_identifier(identity_document)) STORED,
  email text NOT NULL, email_normalized text GENERATED ALWAYS AS (NULLIF(lower(btrim(email)), '')) STORED,
  phone text, password_hash text NOT NULL, status user_status NOT NULL DEFAULT 'PENDING_VALIDATION',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(full_name) <> ''), CHECK (btrim(email) <> ''), CHECK (btrim(password_hash) <> '')
);
CREATE UNIQUE INDEX users_email_normalized_unique ON users(email_normalized) WHERE email_normalized IS NOT NULL;
CREATE UNIQUE INDEX users_document_normalized_unique ON users(identity_document_normalized) WHERE identity_document_normalized IS NOT NULL;
CREATE INDEX users_role_status_idx ON users(role_id, status);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz,
  replaced_by_id uuid REFERENCES refresh_tokens(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(token_hash) <> ''), CHECK (expires_at > created_at), CHECK (replaced_by_id IS NULL OR replaced_by_id <> id)
);
CREATE INDEX refresh_tokens_active_idx ON refresh_tokens(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_name text NOT NULL, rnc text,
  rnc_normalized text GENERATED ALWAYS AS (normalize_identifier(rnc)) STORED, trade_name text, address_text text, phone text, email text,
  email_normalized text GENERATED ALWAYS AS (NULLIF(lower(btrim(email)), '')) STORED, economic_activity_code text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(legal_name) <> '')
);
CREATE UNIQUE INDEX companies_rnc_normalized_unique ON companies(rnc_normalized) WHERE rnc_normalized IS NOT NULL;
CREATE INDEX companies_legal_name_idx ON companies(lower(btrim(legal_name)));

CREATE TABLE establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  name text NOT NULL, establishment_type_code text, address_text text, province_code text, municipality_code text, health_jurisdiction_code text,
  sanitary_permit_number text, sanitary_permit_expires_at date, operations_started_at date,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (btrim(name) <> '')
);
CREATE INDEX establishments_company_idx ON establishments(company_id);
CREATE INDEX establishments_permit_idx ON establishments(sanitary_permit_number) WHERE sanitary_permit_number IS NOT NULL;

CREATE TABLE establishment_operational_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE RESTRICT,
  annual_production numeric, market_target text, commercialization_scope text, employee_count integer, male_employee_count integer, female_employee_count integer,
  haccp_status text, haccp_implementation_level text, sampling_plan_status text, sampling_plan_scope text, inabie_supplier_status text, inabie_distribution_scope text,
  effective_from date NOT NULL, effective_to date, version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (annual_production IS NULL OR annual_production >= 0), CHECK (employee_count IS NULL OR employee_count >= 0), CHECK (male_employee_count IS NULL OR male_employee_count >= 0), CHECK (female_employee_count IS NULL OR female_employee_count >= 0),
  CHECK (employee_count IS NULL OR COALESCE(male_employee_count,0) + COALESCE(female_employee_count,0) <= employee_count), CHECK (effective_to IS NULL OR effective_to > effective_from),
  EXCLUDE USING gist (establishment_id WITH =, daterange(effective_from,effective_to,'[)') WITH &&)
);

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, identity_document text,
  identity_document_normalized text GENERATED ALWAYS AS (normalize_identifier(identity_document)) STORED, phone text, email text,
  email_normalized text GENERATED ALWAYS AS (NULLIF(lower(btrim(email)), '')) STORED,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (btrim(full_name) <> '')
);
CREATE UNIQUE INDEX contacts_document_normalized_unique ON contacts(identity_document_normalized) WHERE identity_document_normalized IS NOT NULL;
CREATE INDEX contacts_email_normalized_idx ON contacts(email_normalized) WHERE email_normalized IS NOT NULL;

CREATE TABLE company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT, contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  relationship_type contact_relationship_type NOT NULL, is_primary boolean NOT NULL DEFAULT false, effective_from date NOT NULL, effective_to date,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (effective_to IS NULL OR effective_to > effective_from),
  EXCLUDE USING gist (company_id WITH =, contact_id WITH =, relationship_type WITH =, daterange(effective_from,effective_to,'[)') WITH &&),
  EXCLUDE USING gist (company_id WITH =, relationship_type WITH =, daterange(effective_from,effective_to,'[)') WITH &&) WHERE (is_primary)
);
CREATE INDEX company_contacts_lookup_idx ON company_contacts(company_id, relationship_type);

CREATE TABLE establishment_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE RESTRICT, contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  relationship_type contact_relationship_type NOT NULL, is_primary boolean NOT NULL DEFAULT false, effective_from date NOT NULL, effective_to date,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (effective_to IS NULL OR effective_to > effective_from),
  EXCLUDE USING gist (establishment_id WITH =, contact_id WITH =, relationship_type WITH =, daterange(effective_from,effective_to,'[)') WITH &&),
  EXCLUDE USING gist (establishment_id WITH =, relationship_type WITH =, daterange(effective_from,effective_to,'[)') WITH &&) WHERE (is_primary)
);
CREATE INDEX establishment_contacts_lookup_idx ON establishment_contacts(establishment_id, relationship_type);

CREATE TRIGGER users_version BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER companies_version BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER establishments_version BEFORE UPDATE ON establishments FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER profiles_version BEFORE UPDATE ON establishment_operational_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER contacts_version BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER company_contacts_version BEFORE UPDATE ON company_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER establishment_contacts_version BEFORE UPDATE ON establishment_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
