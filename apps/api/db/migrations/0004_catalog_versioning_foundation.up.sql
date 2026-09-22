CREATE TYPE catalog_version_status AS ENUM ('DRAFT','PUBLISHED');
CREATE TABLE catalog_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) NOT NULL UNIQUE, name varchar(160) NOT NULL, description text, supports_hierarchy boolean NOT NULL DEFAULT false, current_published_version_id uuid,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(btrim(code)<>'' AND code=upper(btrim(code))), CHECK(btrim(name)<>'')
);
CREATE TABLE catalog_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_id uuid NOT NULL REFERENCES catalog_definitions(id) ON DELETE RESTRICT, version_number integer NOT NULL CHECK(version_number>0), status catalog_version_status NOT NULL DEFAULT 'DRAFT', publication_note text, published_at timestamptz, published_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(catalog_id,version_number),
 CHECK((status='DRAFT' AND published_at IS NULL AND published_by_user_id IS NULL) OR (status='PUBLISHED' AND published_at IS NOT NULL AND published_by_user_id IS NOT NULL))
);
ALTER TABLE catalog_definitions ADD CONSTRAINT catalog_definitions_current_version_fk FOREIGN KEY(current_published_version_id) REFERENCES catalog_versions(id) ON DELETE RESTRICT;
CREATE TABLE catalog_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_version_id uuid NOT NULL REFERENCES catalog_versions(id) ON DELETE RESTRICT, code varchar(120) NOT NULL, name varchar(300) NOT NULL, description text, parent_entry_id uuid, entry_type varchar(50) NOT NULL, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, source_reference varchar(500), attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(catalog_version_id,code), UNIQUE(id,catalog_version_id), CHECK(btrim(code)<>'' AND code=upper(btrim(code))), CHECK(btrim(name)<>''), CHECK(entry_type IN ('NODE','LEAF')), CHECK(sort_order>=0), CHECK(jsonb_typeof(attributes)='object'),
 FOREIGN KEY(parent_entry_id,catalog_version_id) REFERENCES catalog_entries(id,catalog_version_id) ON DELETE RESTRICT
);
CREATE INDEX catalog_versions_lookup_idx ON catalog_versions(catalog_id,status,version_number DESC);
CREATE INDEX catalog_entries_parent_order_idx ON catalog_entries(catalog_version_id,parent_entry_id,sort_order);
CREATE INDEX catalog_entries_name_idx ON catalog_entries(catalog_version_id,lower(btrim(name)));

CREATE OR REPLACE FUNCTION catalog_definition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.code IS DISTINCT FROM OLD.code THEN RAISE EXCEPTION 'catalog code is immutable'; END IF;
 IF TG_OP='UPDATE' AND NEW.supports_hierarchy IS DISTINCT FROM OLD.supports_hierarchy AND EXISTS(SELECT 1 FROM catalog_versions WHERE catalog_id=OLD.id) THEN RAISE EXCEPTION 'supports_hierarchy is immutable after version creation'; END IF;
 IF NEW.current_published_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM catalog_versions v WHERE v.id=NEW.current_published_version_id AND v.catalog_id=COALESCE(NEW.id,OLD.id) AND v.status='PUBLISHED') THEN RAISE EXCEPTION 'current version must be published and belong to catalog'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER catalog_definitions_guard BEFORE INSERT OR UPDATE ON catalog_definitions FOR EACH ROW EXECUTE FUNCTION catalog_definition_guard();

CREATE OR REPLACE FUNCTION catalog_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND OLD.status='PUBLISHED' THEN RAISE EXCEPTION 'published catalog version is immutable'; END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.status='PUBLISHED' THEN RAISE EXCEPTION 'published catalog version is immutable'; END IF;
   IF NEW.status='DRAFT' THEN RETURN NEW; END IF;
   IF NEW.status<>'PUBLISHED' OR NEW.catalog_id IS DISTINCT FROM OLD.catalog_id OR NEW.version_number IS DISTINCT FROM OLD.version_number OR NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'invalid catalog publication transition'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION catalog_entry_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_type varchar(50); hierarchical boolean; has_child boolean;
BEGIN
 IF EXISTS(SELECT 1 FROM catalog_versions WHERE id=COALESCE(NEW.catalog_version_id,OLD.catalog_version_id) AND status='PUBLISHED') THEN RAISE EXCEPTION 'published catalog entries are immutable'; END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
   SELECT d.supports_hierarchy INTO hierarchical FROM catalog_versions v JOIN catalog_definitions d ON d.id=v.catalog_id WHERE v.id=NEW.catalog_version_id;
   IF NEW.parent_entry_id IS NOT NULL THEN
     IF NOT hierarchical THEN RAISE EXCEPTION 'catalog does not support hierarchy'; END IF;
     IF NEW.parent_entry_id=NEW.id THEN RAISE EXCEPTION 'entry cannot parent itself'; END IF;
     SELECT entry_type INTO parent_type FROM catalog_entries WHERE id=NEW.parent_entry_id AND catalog_version_id=NEW.catalog_version_id;
     IF parent_type IS DISTINCT FROM 'NODE' THEN RAISE EXCEPTION 'parent must be NODE in same version'; END IF;
     IF EXISTS(WITH RECURSIVE ancestors AS (SELECT parent_entry_id FROM catalog_entries WHERE id=NEW.parent_entry_id AND catalog_version_id=NEW.catalog_version_id UNION ALL SELECT e.parent_entry_id FROM catalog_entries e JOIN ancestors a ON e.id=a.parent_entry_id WHERE e.catalog_version_id=NEW.catalog_version_id) SELECT 1 FROM ancestors WHERE parent_entry_id=NEW.id) THEN RAISE EXCEPTION 'catalog hierarchy cycle'; END IF;
   END IF;
   IF NEW.entry_type='LEAF' THEN SELECT EXISTS(SELECT 1 FROM catalog_entries WHERE parent_entry_id=NEW.id) INTO has_child; IF has_child THEN RAISE EXCEPTION 'LEAF cannot be parent'; END IF; END IF;
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER catalog_entries_guard BEFORE INSERT OR UPDATE OR DELETE ON catalog_entries FOR EACH ROW EXECUTE FUNCTION catalog_entry_guard();
CREATE TRIGGER catalog_definitions_version BEFORE UPDATE ON catalog_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER catalog_versions_version BEFORE UPDATE ON catalog_versions FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
CREATE TRIGGER catalog_entries_version BEFORE UPDATE ON catalog_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();
