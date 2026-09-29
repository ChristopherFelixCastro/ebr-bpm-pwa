DROP FUNCTION IF EXISTS officialize_inspection_report_with_pdf(uuid,uuid,uuid,text,bigint,text);
CREATE OR REPLACE FUNCTION report_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE generator_role text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'reports are historical' USING ERRCODE='55000'; END IF;
  IF TG_OP='INSERT' THEN
    generator_role:=review_role_of(NEW.generated_by_user_id);
    IF current_setting('app.report_generation_review_id',true) IS DISTINCT FROM NEW.review_cycle_id::text OR generator_role NOT IN('ADMIN','UNIVERSAL','COORDINATOR') OR NEW.status<>'DRAFT' OR NEW.archived_at IS NOT NULL OR EXISTS(SELECT 1 FROM inspection_reports r WHERE r.inspection_id=NEW.inspection_id AND r.status='OFFICIAL') OR EXISTS(SELECT 1 FROM inspection_closures c WHERE c.inspection_id=NEW.inspection_id) OR NOT EXISTS(SELECT 1 FROM inspection_review_cycles r JOIN inspection_calculations c ON c.id=r.current_calculation_id WHERE r.id=NEW.review_cycle_id AND r.inspection_id=NEW.inspection_id AND r.status='APPROVED' AND c.id=NEW.calculation_id AND c.is_current) THEN RAISE EXCEPTION 'report generation prerequisites invalid' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status='OFFICIAL' OR OLD.archived_at IS NOT NULL THEN RAISE EXCEPTION 'official or archived report immutable' USING ERRCODE='55000'; END IF;
  IF NEW.id<>OLD.id OR NEW.inspection_id<>OLD.inspection_id OR NEW.review_cycle_id IS DISTINCT FROM OLD.review_cycle_id OR NEW.verification_id<>OLD.verification_id THEN RAISE EXCEPTION 'report identity immutable' USING ERRCODE='55000'; END IF;
  IF NEW.status='OFFICIAL' THEN
    IF current_setting('app.report_officialize_id',true) IS DISTINCT FROM OLD.id::text OR NEW.official_at IS NULL OR NEW.official_by_user_id IS NULL THEN RAISE EXCEPTION 'invalid officialization' USING ERRCODE='23514'; END IF;
  ELSIF NEW.archived_at IS NOT NULL THEN
    IF current_setting('app.report_archive_calculation_id',true) IS DISTINCT FROM OLD.calculation_id::text OR NEW.archived_by_user_id IS NULL THEN RAISE EXCEPTION 'invalid draft archival' USING ERRCODE='23514'; END IF;
  ELSIF current_setting('app.report_generation_review_id',true) IS DISTINCT FROM OLD.review_cycle_id::text OR NEW.status<>'DRAFT' THEN RAISE EXCEPTION 'invalid draft regeneration' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
