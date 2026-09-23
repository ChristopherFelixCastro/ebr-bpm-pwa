DO $$
DECLARE
  inspection_id uuid;
  evaluator_id uuid;
  criterion_id uuid;
  foreign_criterion_id uuid;
  section_id uuid;
  evidence_id uuid;
BEGIN
  SELECT id INTO evaluator_id FROM users WHERE email_normalized='evaluator.0026@example.test';
  SELECT i.id INTO inspection_id FROM inspections i
  WHERE i.evaluator_user_id=evaluator_id AND i.status='IN_PROGRESS'
  ORDER BY i.created_at DESC LIMIT 1;
  SELECT id INTO criterion_id FROM bpm_template_items
  WHERE template_version_id=(SELECT bpm_template_version_id FROM inspections WHERE id=inspection_id)
    AND item_kind='CRITERION' AND is_evaluable LIMIT 1;
  SELECT id INTO section_id FROM bpm_template_items
  WHERE template_version_id=(SELECT bpm_template_version_id FROM inspections WHERE id=inspection_id)
    AND item_kind='SECTION' LIMIT 1;
  SELECT id INTO foreign_criterion_id FROM bpm_template_items
  WHERE template_version_id<>(SELECT bpm_template_version_id FROM inspections WHERE id=inspection_id)
    AND item_kind='CRITERION' AND is_evaluable LIMIT 1;
  IF inspection_id IS NULL OR criterion_id IS NULL OR section_id IS NULL OR foreign_criterion_id IS NULL THEN
    RAISE EXCEPTION 'fixture incomplete';
  END IF;
  INSERT INTO inspection_evidence(inspection_id,bpm_item_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id)
  VALUES(inspection_id,criterion_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.pdf','criterion.pdf','application/pdf',10,'UPLOADED',evaluator_id)
  RETURNING id INTO evidence_id;
  IF (SELECT bpm_item_id FROM inspection_evidence WHERE id=evidence_id)<>criterion_id THEN
    RAISE EXCEPTION 'criterion link missing';
  END IF;
  BEGIN
    UPDATE inspection_evidence SET bpm_item_id=section_id WHERE id=evidence_id;
    RAISE EXCEPTION 'criterion link mutation accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO inspection_evidence(inspection_id,bpm_item_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id)
    VALUES(inspection_id,section_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.pdf','section.pdf','application/pdf',10,'UPLOADED',evaluator_id);
    RAISE EXCEPTION 'non-criterion accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO inspection_evidence(inspection_id,bpm_item_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id)
    VALUES(inspection_id,foreign_criterion_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.pdf','foreign.pdf','application/pdf',10,'UPLOADED',evaluator_id);
    RAISE EXCEPTION 'foreign criterion accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id)
  VALUES(inspection_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.pdf','general.pdf','application/pdf',10,'UPLOADED',evaluator_id);
END $$;
