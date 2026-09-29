DROP TRIGGER IF EXISTS bpm_guidance_items_version ON bpm_criterion_guidance_items;
DROP TRIGGER IF EXISTS bpm_guidance_items_guard ON bpm_criterion_guidance_items;
DROP FUNCTION IF EXISTS bpm_guidance_item_guard();
DROP TABLE IF EXISTS bpm_criterion_guidance_items;

ALTER TABLE bpm_template_items DROP CONSTRAINT IF EXISTS bpm_template_items_criticality_by_kind;
ALTER TABLE bpm_template_items
  ADD CONSTRAINT bpm_template_items_criticality_required
  CHECK ((item_kind = 'CRITERION' AND default_criticality IS NOT NULL)
    OR (item_kind <> 'CRITERION' AND default_criticality IS NULL));

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
