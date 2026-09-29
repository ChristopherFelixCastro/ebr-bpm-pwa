DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'bpm_template_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%default_criticality%'
  LOOP
    EXECUTE format('ALTER TABLE bpm_template_items DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE bpm_template_items
  ADD CONSTRAINT bpm_template_items_criticality_by_kind
  CHECK (item_kind = 'CRITERION' OR default_criticality IS NULL);

CREATE TABLE bpm_criterion_guidance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES bpm_template_versions(id) ON DELETE RESTRICT,
  criterion_item_id uuid NOT NULL,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  criticality bpm_criticality,
  source_reference varchar(500),
  source_row_number integer,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, template_version_id),
  UNIQUE (criterion_item_id, sort_order),
  CHECK (btrim(text) <> ''),
  CHECK (sort_order >= 0),
  CHECK (source_row_number IS NULL OR source_row_number > 0),
  FOREIGN KEY (criterion_item_id, template_version_id)
    REFERENCES bpm_template_items(id, template_version_id) ON DELETE RESTRICT
);

CREATE INDEX bpm_guidance_version_criterion_order_idx
  ON bpm_criterion_guidance_items(template_version_id, criterion_item_id, sort_order);

CREATE OR REPLACE FUNCTION bpm_guidance_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_version_id uuid;
  target_kind bpm_item_kind;
BEGIN
  target_version_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.template_version_id ELSE NEW.template_version_id END;
  IF EXISTS (
    SELECT 1 FROM bpm_template_versions
    WHERE id = target_version_id AND status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'published BPM guidance is immutable' USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.template_version_id IS DISTINCT FROM NEW.template_version_id
    AND EXISTS (SELECT 1 FROM bpm_template_versions WHERE id = OLD.template_version_id AND status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'published BPM guidance is immutable' USING ERRCODE = '55000';
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT item_kind INTO target_kind
    FROM bpm_template_items
    WHERE id = NEW.criterion_item_id
      AND template_version_id = NEW.template_version_id;
    IF target_kind IS DISTINCT FROM 'CRITERION' THEN
      RAISE EXCEPTION 'guidance requires criterion' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE TRIGGER bpm_guidance_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON bpm_criterion_guidance_items
  FOR EACH ROW EXECUTE FUNCTION bpm_guidance_item_guard();
CREATE TRIGGER bpm_guidance_items_version
  BEFORE UPDATE ON bpm_criterion_guidance_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

CREATE OR REPLACE FUNCTION bpm_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_kind bpm_item_kind;
BEGIN
  IF EXISTS (
    SELECT 1 FROM bpm_template_versions
    WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.template_version_id ELSE NEW.template_version_id END
      AND status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'published BPM items are immutable' USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.parent_item_id = NEW.id THEN
    RAISE EXCEPTION 'self parent' USING ERRCODE = '23514';
  END IF;

  IF NEW.parent_item_id IS NOT NULL THEN
    SELECT item_kind INTO parent_kind
    FROM bpm_template_items
    WHERE id = NEW.parent_item_id AND template_version_id = NEW.template_version_id;
    IF parent_kind IS NULL OR parent_kind = 'CRITERION' THEN
      RAISE EXCEPTION 'invalid parent' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.item_kind = 'SECTION' AND NEW.parent_item_id IS NOT NULL THEN
    RAISE EXCEPTION 'SECTION must be root' USING ERRCODE = '23514';
  ELSIF NEW.item_kind = 'SUBSECTION' AND parent_kind NOT IN ('SECTION', 'SUBSECTION') THEN
    RAISE EXCEPTION 'invalid SUBSECTION parent' USING ERRCODE = '23514';
  ELSIF NEW.item_kind = 'GROUP' AND parent_kind NOT IN ('SECTION', 'SUBSECTION', 'GROUP') THEN
    RAISE EXCEPTION 'invalid GROUP parent' USING ERRCODE = '23514';
  ELSIF NEW.item_kind = 'CRITERION' AND parent_kind NOT IN ('SECTION', 'SUBSECTION', 'GROUP') THEN
    RAISE EXCEPTION 'invalid CRITERION parent' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT parent_item_id
      FROM bpm_template_items
      WHERE id = NEW.parent_item_id AND template_version_id = NEW.template_version_id
      UNION ALL
      SELECT item.parent_item_id
      FROM bpm_template_items item
      JOIN ancestors ON item.id = ancestors.parent_item_id
      WHERE item.template_version_id = NEW.template_version_id
    )
    SELECT 1 FROM ancestors WHERE parent_item_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'cycle' USING ERRCODE = '23514';
  END IF;

  IF NEW.item_kind = 'CRITERION'
    AND EXISTS (SELECT 1 FROM bpm_template_items WHERE parent_item_id = NEW.id) THEN
    RAISE EXCEPTION 'criterion cannot parent' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION bpm_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'published or retired BPM version is historical' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.template_id <> OLD.template_id
      OR NEW.version_number <> OLD.version_number OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'BPM version identity immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'PUBLISHED' THEN
      IF current_setting('app.versioned_admin_transition', true) NOT IN ('adjust', 'retire')
        OR NEW.status <> 'PUBLISHED' OR NEW.published_at <> OLD.published_at
        OR NEW.published_by_user_id <> OLD.published_by_user_id
        OR NEW.effective_from <> OLD.effective_from
        OR NEW.publication_note IS DISTINCT FROM OLD.publication_note THEN
        RAISE EXCEPTION 'published BPM version is immutable' USING ERRCODE = '55000';
      END IF;
      IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM bpm_template_versions version
        WHERE version.template_id = OLD.template_id AND version.id <> OLD.id
          AND version.status = 'PUBLISHED' AND version.retired_at IS NULL
          AND (version.effective_to IS NULL OR version.effective_to > clock_timestamp())
      ) THEN
        RAISE EXCEPTION 'cannot retire the only available BPM version' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'PUBLISHED' THEN
      NEW.effective_from := COALESCE(NEW.effective_from, NEW.published_at, clock_timestamp());
      IF NEW.published_at IS NULL OR NEW.published_by_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM bpm_template_items
        WHERE template_version_id = NEW.id AND item_kind = 'CRITERION' AND is_evaluable
      ) THEN
        RAISE EXCEPTION 'BPM publication incomplete' USING ERRCODE = '23514';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM bpm_template_items item
        LEFT JOIN bpm_template_items parent
          ON parent.id = item.parent_item_id AND parent.template_version_id = item.template_version_id
        WHERE item.template_version_id = NEW.id AND (
          (item.item_kind = 'SECTION' AND item.parent_item_id IS NOT NULL)
          OR (item.item_kind <> 'SECTION' AND item.parent_item_id IS NULL)
          OR (item.item_kind = 'SUBSECTION' AND (parent.item_kind IS NULL OR parent.item_kind NOT IN ('SECTION','SUBSECTION')))
          OR (item.item_kind = 'GROUP' AND (parent.item_kind IS NULL OR parent.item_kind NOT IN ('SECTION','SUBSECTION','GROUP')))
          OR (item.item_kind = 'CRITERION' AND (parent.item_kind IS NULL OR parent.item_kind NOT IN ('SECTION','SUBSECTION','GROUP')))
        )
      ) THEN
        RAISE EXCEPTION 'BPM hierarchy incomplete' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE DELETE ON bpm_criterion_guidance_items FROM PUBLIC;
