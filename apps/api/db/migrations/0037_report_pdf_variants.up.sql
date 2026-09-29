CREATE OR REPLACE FUNCTION report_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE generator_role text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'reports are historical' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    generator_role:=review_role_of(NEW.generated_by_user_id);
    IF current_setting('app.report_generation_review_id',true) IS DISTINCT FROM NEW.review_cycle_id::text OR generator_role NOT IN('ADMIN','UNIVERSAL','COORDINATOR') OR NEW.status<>'DRAFT' OR NEW.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM inspection_reports r WHERE r.inspection_id=NEW.inspection_id AND r.status='OFFICIAL') OR EXISTS(SELECT 1 FROM inspection_closures c WHERE c.inspection_id=NEW.inspection_id) OR NOT EXISTS(SELECT 1 FROM inspection_review_cycles r JOIN inspection_calculations c ON c.id=r.current_calculation_id WHERE r.id=NEW.review_cycle_id AND r.inspection_id=NEW.inspection_id AND r.status='APPROVED' AND c.id=NEW.calculation_id AND c.is_current) THEN RAISE EXCEPTION 'report generation prerequisites invalid' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='OFFICIAL' THEN
    IF current_setting('app.report_pdf_replace_id',true) IS DISTINCT FROM OLD.id::text OR NEW.status<>'OFFICIAL' OR NEW.storage_path=OLD.storage_path OR NEW.size_bytes<=0 OR NEW.content_sha256 !~ '^[0-9a-f]{64}$' OR to_jsonb(NEW)-ARRAY['storage_path','size_bytes','content_sha256','updated_at','version'] IS DISTINCT FROM to_jsonb(OLD)-ARRAY['storage_path','size_bytes','content_sha256','updated_at','version'] THEN RAISE EXCEPTION 'official report immutable' USING ERRCODE='55000'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.archived_at IS NOT NULL THEN RAISE EXCEPTION 'archived report immutable' USING ERRCODE='55000'; END IF;
  IF NEW.id<>OLD.id OR NEW.inspection_id<>OLD.inspection_id OR NEW.review_cycle_id IS DISTINCT FROM OLD.review_cycle_id OR NEW.verification_id<>OLD.verification_id THEN RAISE EXCEPTION 'report identity immutable' USING ERRCODE='55000'; END IF;
  IF NEW.status='OFFICIAL' THEN
    IF current_setting('app.report_officialize_id',true) IS DISTINCT FROM OLD.id::text OR NEW.official_at IS NULL OR NEW.official_by_user_id IS NULL THEN RAISE EXCEPTION 'invalid officialization' USING ERRCODE='23514'; END IF;
  ELSIF NEW.archived_at IS NOT NULL THEN
    IF current_setting('app.report_archive_calculation_id',true) IS DISTINCT FROM OLD.calculation_id::text OR NEW.archived_by_user_id IS NULL THEN RAISE EXCEPTION 'invalid draft archival' USING ERRCODE='23514'; END IF;
  ELSIF current_setting('app.report_generation_review_id',true) IS DISTINCT FROM OLD.review_cycle_id::text OR NEW.status<>'DRAFT' THEN RAISE EXCEPTION 'invalid draft regeneration' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION officialize_inspection_report_with_pdf(p_inspection uuid,p_report uuid,p_actor uuid,p_storage_path text,p_size_bytes bigint,p_sha256 text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_storage_path IS NULL OR p_storage_path !~ ('^official-report/' || p_inspection::text || '/[0-9a-f-]{36}\.pdf$') OR p_size_bytes<=0 OR p_size_bytes>5242880 OR p_sha256 !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid official PDF' USING ERRCODE='23514'; END IF;
  PERFORM officialize_inspection_report(p_inspection,p_report,p_actor);
  PERFORM set_config('app.report_pdf_replace_id',p_report::text,true);
  UPDATE inspection_reports SET storage_path=p_storage_path,size_bytes=p_size_bytes,content_sha256=p_sha256,updated_at=clock_timestamp() WHERE id=p_report AND inspection_id=p_inspection;
END $$;
