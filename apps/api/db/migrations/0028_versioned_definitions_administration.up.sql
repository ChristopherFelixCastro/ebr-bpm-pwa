ALTER TABLE catalog_versions ADD COLUMN effective_from timestamptz, ADD COLUMN effective_to timestamptz, ADD COLUMN retired_at timestamptz, ADD COLUMN retired_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE bpm_template_versions ADD COLUMN effective_from timestamptz, ADD COLUMN effective_to timestamptz, ADD COLUMN retired_at timestamptz, ADD COLUMN retired_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE risk_rule_versions ADD COLUMN effective_from timestamptz, ADD COLUMN effective_to timestamptz, ADD COLUMN retired_at timestamptz, ADD COLUMN retired_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;

DROP TRIGGER IF EXISTS catalog_versions_guard ON catalog_versions;
ALTER TABLE bpm_template_versions DISABLE TRIGGER bpm_versions_guard;
ALTER TABLE risk_rule_versions DISABLE TRIGGER risk_versions_guard;
WITH periods AS (SELECT id,published_at,lead(published_at) OVER(PARTITION BY catalog_id ORDER BY published_at,version_number,id) finish FROM catalog_versions WHERE status='PUBLISHED') UPDATE catalog_versions v SET effective_from=p.published_at,effective_to=p.finish FROM periods p WHERE p.id=v.id;
WITH periods AS (SELECT id,published_at,lead(published_at) OVER(PARTITION BY template_id ORDER BY published_at,version_number,id) finish FROM bpm_template_versions WHERE status='PUBLISHED') UPDATE bpm_template_versions v SET effective_from=p.published_at,effective_to=p.finish FROM periods p WHERE p.id=v.id;
WITH periods AS (SELECT id,published_at,lead(published_at) OVER(PARTITION BY risk_rule_set_id ORDER BY published_at,version_number,id) finish FROM risk_rule_versions WHERE status='PUBLISHED') UPDATE risk_rule_versions v SET effective_from=p.published_at,effective_to=p.finish FROM periods p WHERE p.id=v.id;
ALTER TABLE bpm_template_versions ENABLE TRIGGER bpm_versions_guard;
ALTER TABLE risk_rule_versions ENABLE TRIGGER risk_versions_guard;

ALTER TABLE catalog_versions ADD CONSTRAINT catalog_versions_administration_state CHECK((status='DRAFT' AND effective_from IS NULL AND effective_to IS NULL AND retired_at IS NULL AND retired_by_user_id IS NULL) OR (status='PUBLISHED' AND effective_from IS NOT NULL AND (effective_to IS NULL OR effective_to>=effective_from) AND ((retired_at IS NULL AND retired_by_user_id IS NULL) OR (retired_at IS NOT NULL AND retired_by_user_id IS NOT NULL))));
ALTER TABLE bpm_template_versions ADD CONSTRAINT bpm_versions_administration_state CHECK((status='DRAFT' AND effective_from IS NULL AND effective_to IS NULL AND retired_at IS NULL AND retired_by_user_id IS NULL) OR (status='PUBLISHED' AND effective_from IS NOT NULL AND (effective_to IS NULL OR effective_to>=effective_from) AND ((retired_at IS NULL AND retired_by_user_id IS NULL) OR (retired_at IS NOT NULL AND retired_by_user_id IS NOT NULL))));
ALTER TABLE risk_rule_versions ADD CONSTRAINT risk_versions_administration_state CHECK((status='DRAFT' AND effective_from IS NULL AND effective_to IS NULL AND retired_at IS NULL AND retired_by_user_id IS NULL) OR (status='PUBLISHED' AND effective_from IS NOT NULL AND (effective_to IS NULL OR effective_to>=effective_from) AND ((retired_at IS NULL AND retired_by_user_id IS NULL) OR (retired_at IS NOT NULL AND retired_by_user_id IS NOT NULL))));
ALTER TABLE food_risk_subcategories ADD CONSTRAINT food_risk_subcategories_null_pair CHECK((microbiological_risk IS NULL)=(risk_score IS NULL));

CREATE UNIQUE INDEX catalog_versions_one_draft_idx ON catalog_versions(catalog_id) WHERE status='DRAFT';
CREATE UNIQUE INDEX bpm_versions_one_draft_idx ON bpm_template_versions(template_id) WHERE status='DRAFT';
CREATE UNIQUE INDEX risk_versions_one_draft_idx ON risk_rule_versions(risk_rule_set_id) WHERE status='DRAFT';
CREATE UNIQUE INDEX catalog_entries_sibling_order_idx ON catalog_entries(catalog_version_id,COALESCE(parent_entry_id,'00000000-0000-0000-0000-000000000000'::uuid),sort_order);
CREATE UNIQUE INDEX food_risk_categories_order_idx ON food_risk_categories(risk_rule_version_id,sort_order);
CREATE UNIQUE INDEX food_risk_subcategories_order_idx ON food_risk_subcategories(category_id,sort_order);

ALTER TABLE catalog_versions ADD CONSTRAINT catalog_versions_no_effective_overlap EXCLUDE USING gist(catalog_id WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(status='PUBLISHED');
ALTER TABLE bpm_template_versions ADD CONSTRAINT bpm_versions_no_effective_overlap EXCLUDE USING gist(template_id WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(status='PUBLISHED');
ALTER TABLE risk_rule_versions ADD CONSTRAINT risk_versions_no_effective_overlap EXCLUDE USING gist(risk_rule_set_id WITH =,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE(status='PUBLISHED');

CREATE OR REPLACE FUNCTION catalog_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.status<>'DRAFT' THEN RAISE EXCEPTION 'published or retired catalog version is historical' USING ERRCODE='55000'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.id<>OLD.id OR NEW.catalog_id<>OLD.catalog_id OR NEW.version_number<>OLD.version_number OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'catalog version identity immutable' USING ERRCODE='55000'; END IF;
   IF OLD.status='PUBLISHED' THEN
     IF current_setting('app.versioned_admin_transition',true) NOT IN('adjust','retire') OR NEW.status<>'PUBLISHED' OR NEW.published_at<>OLD.published_at OR NEW.published_by_user_id<>OLD.published_by_user_id OR NEW.effective_from<>OLD.effective_from OR NEW.publication_note IS DISTINCT FROM OLD.publication_note THEN RAISE EXCEPTION 'published catalog version is immutable' USING ERRCODE='55000'; END IF;
     IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM catalog_versions v WHERE v.catalog_id=OLD.catalog_id AND v.id<>OLD.id AND v.status='PUBLISHED' AND v.retired_at IS NULL AND (v.effective_to IS NULL OR v.effective_to>clock_timestamp())) THEN RAISE EXCEPTION 'cannot retire the only available catalog version' USING ERRCODE='23514'; END IF;
   ELSIF NEW.status='PUBLISHED' THEN
     NEW.effective_from:=COALESCE(NEW.effective_from,NEW.published_at,clock_timestamp());
     IF NEW.published_at IS NULL OR NEW.published_by_user_id IS NULL THEN RAISE EXCEPTION 'catalog publication actor required' USING ERRCODE='23514'; END IF;
     IF NOT EXISTS(SELECT 1 FROM catalog_entries WHERE catalog_version_id=NEW.id) THEN RAISE EXCEPTION 'catalog publication requires entries' USING ERRCODE='23514'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS catalog_versions_guard ON catalog_versions;
CREATE TRIGGER catalog_versions_guard BEFORE UPDATE OR DELETE ON catalog_versions FOR EACH ROW EXECUTE FUNCTION catalog_version_guard();

CREATE OR REPLACE FUNCTION bpm_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.status<>'DRAFT' THEN RAISE EXCEPTION 'published or retired BPM version is historical' USING ERRCODE='55000'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.id<>OLD.id OR NEW.template_id<>OLD.template_id OR NEW.version_number<>OLD.version_number OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'BPM version identity immutable' USING ERRCODE='55000'; END IF;
   IF OLD.status='PUBLISHED' THEN
     IF current_setting('app.versioned_admin_transition',true) NOT IN('adjust','retire') OR NEW.status<>'PUBLISHED' OR NEW.published_at<>OLD.published_at OR NEW.published_by_user_id<>OLD.published_by_user_id OR NEW.effective_from<>OLD.effective_from OR NEW.publication_note IS DISTINCT FROM OLD.publication_note THEN RAISE EXCEPTION 'published BPM version is immutable' USING ERRCODE='55000'; END IF;
     IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM bpm_template_versions v WHERE v.template_id=OLD.template_id AND v.id<>OLD.id AND v.status='PUBLISHED' AND v.retired_at IS NULL AND (v.effective_to IS NULL OR v.effective_to>clock_timestamp())) THEN RAISE EXCEPTION 'cannot retire the only available BPM version' USING ERRCODE='23514'; END IF;
   ELSIF NEW.status='PUBLISHED' THEN
     NEW.effective_from:=COALESCE(NEW.effective_from,NEW.published_at,clock_timestamp());
     IF NEW.published_at IS NULL OR NEW.published_by_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM bpm_template_items WHERE template_version_id=NEW.id AND item_kind='CRITERION' AND is_evaluable) THEN RAISE EXCEPTION 'BPM publication incomplete' USING ERRCODE='23514'; END IF;
     IF EXISTS(SELECT 1 FROM bpm_template_items i LEFT JOIN bpm_template_items p ON p.id=i.parent_item_id AND p.template_version_id=i.template_version_id WHERE i.template_version_id=NEW.id AND (i.item_kind='GROUP' OR (i.item_kind='SECTION' AND i.parent_item_id IS NOT NULL) OR (i.item_kind='SUBSECTION' AND p.item_kind IS DISTINCT FROM 'SECTION') OR (i.item_kind='CRITERION' AND p.item_kind IS DISTINCT FROM 'SUBSECTION'))) THEN RAISE EXCEPTION 'BPM hierarchy incomplete' USING ERRCODE='23514'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION risk_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.status<>'DRAFT' THEN RAISE EXCEPTION 'published or retired risk version is historical' USING ERRCODE='55000'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.id<>OLD.id OR NEW.risk_rule_set_id<>OLD.risk_rule_set_id OR NEW.version_number<>OLD.version_number OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'risk version identity immutable' USING ERRCODE='55000'; END IF;
   IF OLD.status='PUBLISHED' THEN
     IF current_setting('app.versioned_admin_transition',true) NOT IN('adjust','retire') OR NEW.status<>'PUBLISHED' OR NEW.published_at<>OLD.published_at OR NEW.published_by_user_id<>OLD.published_by_user_id OR NEW.effective_from<>OLD.effective_from OR NEW.publication_note IS DISTINCT FROM OLD.publication_note THEN RAISE EXCEPTION 'published risk version is immutable' USING ERRCODE='55000'; END IF;
     IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM risk_rule_versions v WHERE v.risk_rule_set_id=OLD.risk_rule_set_id AND v.id<>OLD.id AND v.status='PUBLISHED' AND v.retired_at IS NULL AND (v.effective_to IS NULL OR v.effective_to>clock_timestamp())) THEN RAISE EXCEPTION 'cannot retire the only available risk version' USING ERRCODE='23514'; END IF;
   ELSIF NEW.status='PUBLISHED' THEN
     NEW.effective_from:=COALESCE(NEW.effective_from,NEW.published_at,clock_timestamp());
     IF NEW.published_at IS NULL OR NEW.published_by_user_id IS NULL THEN RAISE EXCEPTION 'risk publication actor required' USING ERRCODE='23514'; END IF;
     IF (SELECT count(*) FROM risk_factors WHERE risk_rule_version_id=NEW.id)<>6 OR (SELECT array_agg(code::text ORDER BY code) FROM risk_factors WHERE risk_rule_version_id=NEW.id)<>ARRAY['BPM','HACCP','INABIE','REJECTIONS','SAMPLING','VOLUME']::text[] OR (SELECT sum(weight) FROM risk_factors WHERE risk_rule_version_id=NEW.id)<>1.0000 THEN RAISE EXCEPTION 'invalid factors' USING ERRCODE='23514'; END IF;
     IF EXISTS(SELECT 1 FROM risk_factors f WHERE f.risk_rule_version_id=NEW.id AND (SELECT array_agg(score ORDER BY score) FROM risk_factor_options WHERE risk_factor_id=f.id)<>ARRAY[1.00::numeric,1.67::numeric,2.33::numeric,3.00::numeric]) THEN RAISE EXCEPTION 'invalid options' USING ERRCODE='23514'; END IF;
     IF NOT EXISTS(SELECT 1 FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE c.risk_rule_version_id=NEW.id AND s.microbiological_risk IS NOT NULL AND s.risk_score IS NOT NULL) THEN RAISE EXCEPTION 'risk matrix requires applicable subcategory' USING ERRCODE='23514'; END IF;
     IF NOT EXISTS(SELECT 1 FROM inspection_frequency_ranges WHERE risk_rule_version_id=NEW.id) OR (SELECT min(lower_bound) FROM inspection_frequency_ranges WHERE risk_rule_version_id=NEW.id) NOT IN(0,1) OR NOT EXISTS(SELECT 1 FROM inspection_frequency_ranges WHERE risk_rule_version_id=NEW.id AND upper_bound IS NULL) OR EXISTS(SELECT 1 FROM (SELECT upper_bound,upper_inclusive,lead(lower_bound) OVER(ORDER BY sort_order) next_lower,lead(lower_inclusive) OVER(ORDER BY sort_order) next_inclusive FROM inspection_frequency_ranges WHERE risk_rule_version_id=NEW.id) r WHERE r.next_lower IS NOT NULL AND (r.upper_bound IS DISTINCT FROM r.next_lower OR r.upper_inclusive=r.next_inclusive)) THEN RAISE EXCEPTION 'frequency ranges must provide continuous exclusive coverage' USING ERRCODE='23514'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION bpm_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE typ bpm_item_kind;
BEGIN
 IF EXISTS(SELECT 1 FROM bpm_template_versions WHERE id=COALESCE(NEW.template_version_id,OLD.template_version_id) AND status='PUBLISHED') THEN RAISE EXCEPTION 'published BPM items are immutable' USING ERRCODE='55000'; END IF;
 IF TG_OP IN('INSERT','UPDATE') THEN
   IF NEW.parent_item_id=NEW.id THEN RAISE EXCEPTION 'self parent' USING ERRCODE='23514'; END IF;
   IF NEW.parent_item_id IS NOT NULL THEN SELECT item_kind INTO typ FROM bpm_template_items WHERE id=NEW.parent_item_id AND template_version_id=NEW.template_version_id; IF typ IS NULL OR typ='CRITERION' THEN RAISE EXCEPTION 'invalid parent' USING ERRCODE='23514'; END IF; END IF;
   IF EXISTS(WITH RECURSIVE a AS(SELECT parent_item_id FROM bpm_template_items WHERE id=NEW.parent_item_id AND template_version_id=NEW.template_version_id UNION ALL SELECT e.parent_item_id FROM bpm_template_items e JOIN a ON e.id=a.parent_item_id WHERE e.template_version_id=NEW.template_version_id) SELECT 1 FROM a WHERE parent_item_id=NEW.id) THEN RAISE EXCEPTION 'cycle' USING ERRCODE='23514'; END IF;
   IF NEW.item_kind='CRITERION' AND EXISTS(SELECT 1 FROM bpm_template_items WHERE parent_item_id=NEW.id) THEN RAISE EXCEPTION 'criterion cannot parent' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION effective_bpm_template_version(at_time timestamptz DEFAULT clock_timestamp()) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM bpm_template_versions WHERE status='PUBLISHED' AND retired_at IS NULL AND effective_from<=at_time AND (effective_to IS NULL OR effective_to>at_time) ORDER BY effective_from DESC,version_number DESC,id DESC LIMIT 1 $$;
CREATE OR REPLACE FUNCTION effective_risk_rule_version(at_time timestamptz DEFAULT clock_timestamp()) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM risk_rule_versions WHERE status='PUBLISHED' AND retired_at IS NULL AND effective_from<=at_time AND (effective_to IS NULL OR effective_to>at_time) ORDER BY effective_from DESC,version_number DESC,id DESC LIMIT 1 $$;
