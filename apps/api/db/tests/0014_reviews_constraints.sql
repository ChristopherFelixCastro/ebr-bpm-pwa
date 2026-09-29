-- The review test is intentionally executed after the inspection/calculation fixtures.
DO $$
DECLARE ins uuid; item uuid; reviewer uuid; cycle uuid; report uuid; draft_ins uuid;
BEGIN
  SELECT i.id,i.created_by_user_id,i.bpm_template_version_id INTO ins,reviewer,cycle FROM inspections i JOIN bpm_template_versions v ON v.id=i.bpm_template_version_id JOIN bpm_templates t ON t.id=v.template_id WHERE i.status='SUBMITTED' AND t.code='CALCULATIONS_TEST' ORDER BY i.created_at LIMIT 1;
  IF ins IS NULL THEN RAISE EXCEPTION 'submitted inspection fixture required'; END IF;
  SELECT id INTO item FROM bpm_template_items WHERE template_version_id=(SELECT bpm_template_version_id FROM inspections WHERE id=ins) AND item_kind='CRITERION' AND is_evaluable LIMIT 1;
  SELECT id INTO draft_ins FROM inspections WHERE status<>'SUBMITTED' ORDER BY created_at DESC LIMIT 1;
  IF draft_ins IS NULL THEN RAISE EXCEPTION 'non-submitted inspection fixture required'; END IF;
  BEGIN PERFORM open_inspection_review(draft_ins,reviewer); RAISE EXCEPTION 'non-submitted review accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  cycle:=open_inspection_review(ins,reviewer);
  PERFORM approve_inspection_review(ins,cycle,reviewer,NULL);
  BEGIN UPDATE inspection_review_cycles SET status='PENDING_REVIEW' WHERE id=cycle; RAISE EXCEPTION 'approved review changed'; EXCEPTION WHEN object_not_in_prerequisite_state OR raise_exception THEN NULL; END;
END $$;
