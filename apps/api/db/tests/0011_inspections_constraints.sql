INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Creador inspección','inspections.creator@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN';
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Evaluador inspección','inspections.evaluator@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';

DO $$
DECLARE user_uuid uuid; evaluator_uuid uuid; contact_uuid uuid; company_uuid uuid; establishment_uuid uuid; request_uuid uuid; case_uuid uuid; assignment_uuid uuid; inspection_uuid uuid;
        bpm_template_uuid uuid; bpm_version_uuid uuid; bpm_item_uuid uuid; bpm_section uuid; bpm_subsection uuid; other_template_uuid uuid; other_version_uuid uuid; other_item_uuid uuid; other_section uuid; other_subsection uuid;
        risk_set_uuid uuid; risk_version_uuid uuid; risk_factor_uuid uuid; category_uuid uuid; subcategory_uuid uuid; other_risk_set_uuid uuid; other_risk_version_uuid uuid; other_category_uuid uuid; other_subcategory_uuid uuid;
        factor_code text; factor_weight numeric; option_index integer; evidence_index integer; operation_uuid uuid := gen_random_uuid();
        factor_codes text[] := ARRAY['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING'];
        factor_weights numeric[] := ARRAY[0.20,0.20,0.15,0.15,0.15,0.15];
        option_codes text[] := ARRAY['LOW','MEDIUM_LOW','MEDIUM_HIGH','HIGH'];
        option_scores numeric[] := ARRAY[1.00,1.67,2.33,3.00];
BEGIN
  SELECT id INTO user_uuid FROM users WHERE email_normalized='inspections.creator@example.test';
  SELECT id INTO evaluator_uuid FROM users WHERE email_normalized='inspections.evaluator@example.test';
  INSERT INTO bpm_templates(code,name) VALUES('INSPECTIONS_TEST','Plantilla inspecciones') RETURNING id INTO bpm_template_uuid;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(bpm_template_uuid,1) RETURNING id INTO bpm_version_uuid;
  INSERT INTO bpm_template_items(template_version_id,title,sort_order,item_kind) VALUES(bpm_version_uuid,'Sección',1,'SECTION') RETURNING id INTO bpm_section;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind) VALUES(bpm_version_uuid,bpm_section,'Subsección',1,'SUBSECTION') RETURNING id INTO bpm_subsection;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind,is_evaluable,default_criticality) VALUES(bpm_version_uuid,bpm_subsection,'Criterio inspección',1,'CRITERION',true,'MAYOR') RETURNING id INTO bpm_item_uuid;
  UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=user_uuid WHERE id=bpm_version_uuid;
  INSERT INTO bpm_templates(code,name) VALUES('INSPECTIONS_OTHER','Plantilla externa') RETURNING id INTO other_template_uuid;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(other_template_uuid,1) RETURNING id INTO other_version_uuid;
  INSERT INTO bpm_template_items(template_version_id,title,sort_order,item_kind) VALUES(other_version_uuid,'Sección externa',1,'SECTION') RETURNING id INTO other_section;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind) VALUES(other_version_uuid,other_section,'Subsección externa',1,'SUBSECTION') RETURNING id INTO other_subsection;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind,is_evaluable,default_criticality) VALUES(other_version_uuid,other_subsection,'Criterio externo',1,'CRITERION',true,'MENOR') RETURNING id INTO other_item_uuid;

  INSERT INTO risk_rule_sets(code,name) VALUES('INSPECTIONS_TEST','Regla inspecciones') RETURNING id INTO risk_set_uuid;
  INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(risk_set_uuid,1) RETURNING id INTO risk_version_uuid;
  FOR option_index IN 1..6 LOOP
    factor_code:=factor_codes[option_index]; factor_weight:=factor_weights[option_index];
    INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(risk_version_uuid,factor_code,factor_code,factor_weight,option_index) RETURNING id INTO risk_factor_uuid;
    FOR evidence_index IN 1..4 LOOP
      INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES(risk_factor_uuid,option_codes[evidence_index],option_codes[evidence_index],option_scores[evidence_index],evidence_index);
    END LOOP;
  END LOOP;
  INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(risk_version_uuid,'DAIRY','Lácteos',1) RETURNING id INTO category_uuid;
  INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(category_uuid,'Leche pasteurizada','HIGH',3,1) RETURNING id INTO subcategory_uuid;
  UPDATE risk_rule_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=user_uuid WHERE id=risk_version_uuid;
  INSERT INTO risk_rule_sets(code,name) VALUES('INSPECTIONS_OTHER','Regla externa') RETURNING id INTO other_risk_set_uuid;
  INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(other_risk_set_uuid,1) RETURNING id INTO other_risk_version_uuid;
  INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(other_risk_version_uuid,'OTHER_FOOD','Otro alimento',1) RETURNING id INTO other_category_uuid;
  INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(other_category_uuid,'Otro producto','LOW',1,1) RETURNING id INTO other_subcategory_uuid;

  INSERT INTO companies(legal_name,rnc) VALUES('Empresa inspecciones','134-33333-3') RETURNING id INTO company_uuid;
  INSERT INTO establishments(company_id,name) VALUES(company_uuid,'Planta inspecciones') RETURNING id INTO establishment_uuid;
  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_uuid,establishment_uuid,'Solicitud inspección') RETURNING id INTO request_uuid;
  INSERT INTO contacts(full_name) VALUES('Contacto inspecciones') RETURNING id INTO contact_uuid;
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_uuid,contact_uuid,'PRIMARY_CONTACT','Contacto inspecciones',true);
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_uuid,'AUTHORIZATION_LETTER','requests/inspection.pdf','inspection.pdf','application/pdf',1024,'VALID',clock_timestamp(),user_uuid);
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_uuid;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,status) VALUES('COMPANY_REQUEST',request_uuid,company_uuid,establishment_uuid,'PENDING_ASSIGNMENT') RETURNING id INTO case_uuid;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_uuid,evaluator_uuid,user_uuid) RETURNING id INTO assignment_uuid;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id) VALUES(case_uuid,assignment_uuid,evaluator_uuid,bpm_version_uuid,risk_version_uuid,user_uuid) RETURNING id INTO inspection_uuid;
  BEGIN
    INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id) VALUES(case_uuid,assignment_uuid,evaluator_uuid,bpm_version_uuid,risk_version_uuid,user_uuid);
    RAISE EXCEPTION 'second editable inspection accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE inspections SET status='IN_PROGRESS',started_at=clock_timestamp() WHERE id=inspection_uuid;
  BEGIN
    UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_uuid;
    RAISE EXCEPTION 'incomplete inspection finalized';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(inspection_uuid,other_item_uuid,'C');
    RAISE EXCEPTION 'foreign BPM item accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(inspection_uuid,bpm_item_uuid,'C');
  UPDATE inspection_bpm_responses SET response_value='CP' WHERE inspection_id=inspection_uuid AND bpm_item_id=bpm_item_uuid;
  UPDATE inspection_bpm_responses SET response_value='IT' WHERE inspection_id=inspection_uuid AND bpm_item_id=bpm_item_uuid;
  UPDATE inspection_bpm_responses SET response_value='NA' WHERE inspection_id=inspection_uuid AND bpm_item_id=bpm_item_uuid;
  INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(inspection_uuid,subcategory_uuid,'DAIRY','Lácteos','Leche pasteurizada','HIGH',3);
  BEGIN
    INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(inspection_uuid,other_subcategory_uuid,'OTHER_FOOD','Otro alimento','Otro producto','LOW',1);
    RAISE EXCEPTION 'cross-version food snapshot accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,uploaded_by_user_id) VALUES(inspection_uuid,'https://signed.example/evidence','bad.pdf','application/pdf',1024,user_uuid);
    RAISE EXCEPTION 'external evidence URL accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,uploaded_by_user_id) VALUES(inspection_uuid,'private/oversize.mp4','oversize.mp4','video/mp4',5242881,user_uuid);
    RAISE EXCEPTION 'oversize evidence accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  FOR evidence_index IN 1..10 LOOP
    INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,uploaded_by_user_id) VALUES(inspection_uuid,format('private/inspection/%s.jpg',evidence_index),format('evidence-%s.jpg',evidence_index),'image/jpeg',1024,user_uuid);
  END LOOP;
  BEGIN
    INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,uploaded_by_user_id) VALUES(inspection_uuid,'private/inspection/11.jpg','evidence-11.jpg','image/jpeg',1024,user_uuid);
    RAISE EXCEPTION 'eleventh active evidence accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'maximum active evidence reached' THEN RAISE; END IF;
  END;
  UPDATE inspection_evidence SET deleted_at=clock_timestamp(),deleted_by_user_id=user_uuid WHERE id=(SELECT id FROM inspection_evidence WHERE inspection_id=inspection_uuid AND deleted_at IS NULL ORDER BY created_at LIMIT 1);
  INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,uploaded_by_user_id,status) VALUES(inspection_uuid,'private/inspection/11.jpg','evidence-11.jpg','image/jpeg',1024,user_uuid,'REJECTED');
  BEGIN
    INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,uploaded_by_user_id) VALUES(inspection_uuid,'private/inspection/12.jpg','evidence-12.jpg','image/jpeg',1024,user_uuid);
    RAISE EXCEPTION 'rejected active evidence did not count';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'maximum active evidence reached' THEN RAISE; END IF;
  END;
  INSERT INTO inspection_operations(operation_id,inspection_id,operation_type,base_version,resulting_version,payload_sha256,status,actor_user_id,applied_at) VALUES(operation_uuid,inspection_uuid,'UPSERT_BPM_RESPONSE',1,2,repeat('a',64),'APPLIED',user_uuid,clock_timestamp());
  BEGIN
    INSERT INTO inspection_operations(operation_id,inspection_id,operation_type,base_version,resulting_version,payload_sha256,status,actor_user_id,applied_at) VALUES(operation_uuid,inspection_uuid,'UPSERT_BPM_RESPONSE',1,2,repeat('a',64),'APPLIED',user_uuid,clock_timestamp());
    RAISE EXCEPTION 'duplicate operation accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_uuid;
  BEGIN
    UPDATE inspection_bpm_responses SET response_value='C' WHERE inspection_id=inspection_uuid AND bpm_item_id=bpm_item_uuid;
    RAISE EXCEPTION 'pending submission response changed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE inspections SET status='SUBMITTED',submitted_at=clock_timestamp() WHERE id=inspection_uuid;
  BEGIN
    UPDATE inspections SET submitted_at=clock_timestamp() WHERE id=inspection_uuid;
    RAISE EXCEPTION 'submitted inspection changed';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
END $$;
