INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Admin 0026','admin.0026@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN';
INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Evaluator 0026','evaluator.0026@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';

DO $$
#variable_conflict use_variable
DECLARE
  actor uuid; evaluator uuid; company_id uuid; establishment_id uuid; request_id uuid; contact_id uuid; case_id uuid; assignment_id uuid;
  template_id uuid; template_version uuid; item_id uuid; section_id uuid; subsection_id uuid; foreign_item uuid; rule_set uuid; rule_version uuid; category_id uuid; food_id uuid; low_food_id uuid; na_food_id uuid; foreign_rule uuid; foreign_category uuid; foreign_food uuid;
  inspection_id uuid; na_inspection_id uuid; calculation_id uuid; evidence_id uuid; factor_id uuid; option_id uuid; before_revision integer; after_revision integer; i integer;
  codes text[]:=ARRAY['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING'];
  responses bpm_response_value[]:=ARRAY['C','CP','IT','NA']; item_ids uuid[]:=ARRAY[]::uuid[];
BEGIN
  SELECT id INTO actor FROM users WHERE email_normalized='admin.0026@example.test';
  SELECT id INTO evaluator FROM users WHERE email_normalized='evaluator.0026@example.test';

  INSERT INTO bpm_templates(code,name) VALUES('EXECUTION_0026','Execution 0026') RETURNING id INTO template_id;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,1) RETURNING id INTO template_version;
  INSERT INTO bpm_template_items(template_version_id,item_kind,title,display_code,sort_order) VALUES(template_version,'SECTION','Section','S1',1) RETURNING id INTO section_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order) VALUES(template_version,section_id,'SUBSECTION','Subsection','SS1',1) RETURNING id INTO subsection_id;
  FOR i IN 1..4 LOOP
    INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order,is_evaluable,default_criticality) VALUES(template_version,subsection_id,'CRITERION','Criterion '||i,'C'||i,i,true,'MAYOR') RETURNING id INTO item_id;
    item_ids:=array_append(item_ids,item_id);
  END LOOP;
  UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=template_version;
  INSERT INTO bpm_templates(code,name) VALUES('FOREIGN_0026','Foreign') RETURNING id INTO template_id;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,1) RETURNING id INTO template_id;
  INSERT INTO bpm_template_items(template_version_id,item_kind,title,display_code,sort_order) VALUES(template_id,'SECTION','Foreign section','FS1',1) RETURNING id INTO section_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order) VALUES(template_id,section_id,'SUBSECTION','Foreign subsection','FSS1',1) RETURNING id INTO subsection_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order,is_evaluable,default_criticality) VALUES(template_id,subsection_id,'CRITERION','Foreign criterion','F1',1,true,'MAYOR') RETURNING id INTO foreign_item;
  UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=template_id;

  INSERT INTO risk_rule_sets(code,name) VALUES('EXECUTION_0026','Execution 0026') RETURNING id INTO rule_set;
  INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(rule_set,1) RETURNING id INTO rule_version;
  FOR i IN 1..6 LOOP
    INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(rule_version,codes[i],codes[i],CASE WHEN i<=4 THEN .17 ELSE .16 END,i) RETURNING id INTO factor_id;
    INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES(factor_id,'LOW','Low',1,1),(factor_id,'MEDIUM_LOW','Medium low',1.67,2),(factor_id,'MEDIUM_HIGH','Medium high',2.33,3),(factor_id,'HIGH','High',3,4);
  END LOOP;
  INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(rule_version,'FOOD_0026','Food',1) RETURNING id INTO category_id;
  INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(category_id,'Applicable','HIGH',3,1) RETURNING id INTO food_id;
  INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(category_id,'Low product','LOW',1,2) RETURNING id INTO low_food_id;
  INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(category_id,'NA',NULL,NULL,3) RETURNING id INTO na_food_id;
  INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES(rule_version,0,3,true,true,'ANNUAL','Annual',1),(rule_version,3,NULL,false,false,'QUARTERLY','Open',2);
  UPDATE risk_rule_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=rule_version;
  INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(rule_set,2) RETURNING id INTO foreign_rule;
  INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(foreign_rule,'FOREIGN_FOOD','Foreign food',1) RETURNING id INTO foreign_category;
  INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(foreign_category,'Foreign product','LOW',1,1) RETURNING id INTO foreign_food;

  INSERT INTO companies(legal_name,rnc) VALUES('Company 0026','0026-1') RETURNING id INTO company_id;
  INSERT INTO establishments(company_id,name) VALUES(company_id,'Plant 0026') RETURNING id INTO establishment_id;
  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_id,establishment_id,'Execution') RETURNING id INTO request_id;
  INSERT INTO contacts(full_name) VALUES('Contact 0026') RETURNING id INTO contact_id;
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_id,contact_id,'PRIMARY_CONTACT','Contact 0026',true);
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_id,'AUTHORIZATION_LETTER','request/0026.pdf','0026.pdf','application/pdf',1,'VALID',clock_timestamp(),actor);
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_id;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,status) VALUES('COMPANY_REQUEST',request_id,company_id,establishment_id,'PENDING_ASSIGNMENT') RETURNING id INTO case_id;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_id,evaluator,actor) RETURNING id INTO assignment_id;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;

  INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id) VALUES(case_id,assignment_id,evaluator,template_version,rule_version,evaluator) RETURNING id INTO inspection_id;
  IF (SELECT content_revision FROM inspections WHERE id=inspection_id)<>1 THEN RAISE EXCEPTION 'initial content revision invalid'; END IF;
  BEGIN
    UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Reassign' WHERE id=assignment_id;
    RAISE EXCEPTION 'editable inspection did not block reassignment';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE inspections SET status='IN_PROGRESS',started_at=clock_timestamp() WHERE id=inspection_id;
  SELECT content_revision INTO before_revision FROM inspections WHERE id=inspection_id;
  FOR i IN 1..4 LOOP INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(inspection_id,item_ids[i],responses[i]); END LOOP;
  SELECT content_revision INTO after_revision FROM inspections WHERE id=inspection_id;
  IF after_revision<>before_revision+4 THEN RAISE EXCEPTION 'BPM content revision must increment once per operation'; END IF;
  BEGIN INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(inspection_id,foreign_item,'C'); RAISE EXCEPTION 'foreign BPM item accepted'; EXCEPTION WHEN check_violation OR raise_exception THEN NULL; END;

  FOR factor_id IN SELECT id FROM risk_factors WHERE risk_rule_version_id=rule_version ORDER BY sort_order LOOP
    SELECT o.id INTO option_id FROM risk_factor_options o WHERE o.risk_factor_id=factor_id AND o.code='LOW';
    INSERT INTO inspection_risk_factor_selections(inspection_id,risk_factor_id,risk_factor_option_id) VALUES(inspection_id,factor_id,option_id);
  END LOOP;
  BEGIN
    SELECT id INTO factor_id FROM risk_factors WHERE risk_rule_version_id=rule_version ORDER BY sort_order LIMIT 1;
    SELECT o.id INTO option_id FROM risk_factor_options o JOIN risk_factors f ON f.id=o.risk_factor_id WHERE f.risk_rule_version_id=rule_version AND f.id<>factor_id LIMIT 1;
    UPDATE inspection_risk_factor_selections s SET risk_factor_option_id=option_id WHERE s.inspection_id=inspection_id AND s.risk_factor_id=factor_id;
    RAISE EXCEPTION 'option from another factor accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(inspection_id,food_id,'FOOD_0026','Food','Applicable','HIGH',3);
  INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(inspection_id,low_food_id,'FOOD_0026','Food','Low product','LOW',1);
  BEGIN INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(inspection_id,food_id,'BAD','Bad','Bad','LOW',1); RAISE EXCEPTION 'forged or duplicate food snapshot accepted'; EXCEPTION WHEN unique_violation OR check_violation THEN NULL; END;
  BEGIN INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(inspection_id,foreign_food,'FOREIGN_FOOD','Foreign food','Foreign product','LOW',1); RAISE EXCEPTION 'food snapshot from another rule version accepted'; EXCEPTION WHEN check_violation OR raise_exception THEN NULL; END;

  INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id) VALUES(inspection_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.pdf','evidence.pdf','application/pdf',10,'UPLOADED',evaluator) RETURNING id INTO evidence_id;
  BEGIN INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id) VALUES(inspection_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.mp4','video.mp4','video/mp4',10,'UPLOADED',evaluator); RAISE EXCEPTION 'video MIME accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE inspection_evidence SET status='REJECTED',validated_at=clock_timestamp(),validated_by_user_id=actor,rejection_reason='Invalid evidence' WHERE id=evidence_id;
  FOR i IN 2..10 LOOP INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id) VALUES(inspection_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.png','evidence.png','image/png',10,'UPLOADED',evaluator); END LOOP;
  BEGIN INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id) VALUES(inspection_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.png','overflow.png','image/png',10,'UPLOADED',evaluator); RAISE EXCEPTION 'evidence limit not enforced'; EXCEPTION WHEN raise_exception THEN NULL; END;
  UPDATE inspection_evidence SET status='ARCHIVED',deleted_at=clock_timestamp(),deleted_by_user_id=evaluator,archived_at=clock_timestamp() WHERE id=evidence_id;
  INSERT INTO inspection_evidence(inspection_id,storage_path,original_file_name,mime_type,size_bytes,status,uploaded_by_user_id) VALUES(inspection_id,'inspection-evidence/'||inspection_id||'/'||gen_random_uuid()||'.webp','replacement.webp','image/webp',10,'UPLOADED',evaluator);

  INSERT INTO inspection_operations(operation_id,inspection_id,operation_type,base_version,resulting_version,payload_sha256,status,actor_user_id,result_payload,applied_at,completed_at) VALUES('26000000-0000-4000-8000-000000000001',inspection_id,'UPSERT_BPM_RESPONSE',1,2,repeat('a',64),'APPLIED',evaluator,'{"resultingVersion":2}',clock_timestamp(),clock_timestamp());
  IF NOT EXISTS(SELECT 1 FROM inspection_operations WHERE operation_id='26000000-0000-4000-8000-000000000001' AND payload_sha256=repeat('a',64)) THEN RAISE EXCEPTION 'idempotent operation lookup failed'; END IF;
  BEGIN INSERT INTO inspection_operations(operation_id,inspection_id,operation_type,base_version,resulting_version,payload_sha256,status,actor_user_id,result_payload,applied_at,completed_at) VALUES('26000000-0000-4000-8000-000000000001',inspection_id,'UPSERT_BPM_RESPONSE',1,3,repeat('b',64),'APPLIED',evaluator,'{}',clock_timestamp(),clock_timestamp()); RAISE EXCEPTION 'reused UUID accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN UPDATE inspection_operations SET result_payload='{}' WHERE operation_id='26000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'operation mutation accepted'; EXCEPTION WHEN raise_exception THEN NULL; END;
  INSERT INTO inspection_operations(operation_id,inspection_id,operation_type,base_version,payload_sha256,status,actor_user_id,conflict_reason,result_payload,conflict_current_version,completed_at) VALUES('26000000-0000-4000-8000-000000000002',inspection_id,'DELETE_BPM_RESPONSE',1,repeat('c',64),'CONFLICT',evaluator,'VERSION_CONFLICT','{"currentValue":null}',(SELECT version FROM inspections WHERE id=inspection_id),clock_timestamp());

  BEGIN
    UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_id;
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'pending inspection without calculation accepted';
  EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED; END;
  UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_id;
  calculation_id:=recalculate_inspection(inspection_id,actor,'Finalize');
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF NOT EXISTS(SELECT 1 FROM inspection_calculations WHERE id=calculation_id AND inspection_content_revision=(SELECT content_revision FROM inspections WHERE id=inspection_id) AND bpm_numerator=1.5 AND bpm_denominator=3 AND bpm_percentage=50 AND product_risk_score=3 AND establishment_risk_score=1 AND total_risk_score=3 AND frequency='ANNUAL') THEN RAISE EXCEPTION 'calculation formula invalid'; END IF;
  IF (SELECT count(*) FROM inspection_calculation_bpm_snapshots s WHERE s.calculation_id=calculation_id)<>4 OR (SELECT count(*) FROM inspection_calculation_factor_snapshots s WHERE s.calculation_id=calculation_id)<>6 OR (SELECT count(*) FROM inspection_calculation_food_snapshots s WHERE s.calculation_id=calculation_id)<>2 THEN RAISE EXCEPTION 'calculation snapshots incomplete'; END IF;

  UPDATE inspections SET status='IN_PROGRESS',finalized_at=NULL,content_revision=content_revision+1 WHERE id=inspection_id;
  UPDATE inspection_calculations SET status='SUPERSEDED',is_current=false,superseded_at=clock_timestamp(),superseded_by_user_id=actor WHERE id=calculation_id;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF EXISTS(SELECT 1 FROM inspection_calculations WHERE id=calculation_id AND is_current) THEN RAISE EXCEPTION 'unlock did not supersede calculation'; END IF;
  UPDATE inspection_risk_factor_selections s SET risk_factor_option_id=o.id FROM risk_factor_options o WHERE s.inspection_id=inspection_id AND o.risk_factor_id=s.risk_factor_id AND o.code='HIGH';
  UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_id;
  PERFORM recalculate_inspection(inspection_id,actor,'Second finalize');
  UPDATE inspections SET status='SUBMITTED',submitted_at=clock_timestamp() WHERE id=inspection_id;
  PERFORM recalculate_inspection(inspection_id,actor,'Administrative correction');
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF (SELECT max(c.calculation_number) FROM inspection_calculations c WHERE c.inspection_id=inspection_id)<>3 OR (SELECT count(*) FROM inspection_calculations c WHERE c.inspection_id=inspection_id AND c.is_current)<>1 THEN RAISE EXCEPTION 'recalculation serialization/current invalid'; END IF;
  IF NOT EXISTS(SELECT 1 FROM inspection_calculations c WHERE c.inspection_id=inspection_id AND c.is_current AND c.product_risk_score=3 AND c.establishment_risk_score=3 AND c.total_risk_score=9 AND c.frequency='QUARTERLY') THEN RAISE EXCEPTION 'maximum product risk, weighted sum or open range invalid'; END IF;
  BEGIN UPDATE inspection_calculation_bpm_snapshots s SET response_value='IT' WHERE s.calculation_id=calculation_id; RAISE EXCEPTION 'snapshot mutation accepted'; EXCEPTION WHEN raise_exception THEN NULL; END;

  INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id) VALUES(case_id,assignment_id,evaluator,template_version,rule_version,evaluator) RETURNING id INTO na_inspection_id;
  UPDATE inspections SET status='IN_PROGRESS',started_at=clock_timestamp() WHERE id=na_inspection_id;
  FOR i IN 1..4 LOOP INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(na_inspection_id,item_ids[i],'C'); END LOOP;
  FOR factor_id IN SELECT id FROM risk_factors WHERE risk_rule_version_id=rule_version ORDER BY sort_order LOOP
    SELECT o.id INTO option_id FROM risk_factor_options o WHERE o.risk_factor_id=factor_id AND o.code='LOW';
    INSERT INTO inspection_risk_factor_selections(inspection_id,risk_factor_id,risk_factor_option_id) VALUES(na_inspection_id,factor_id,option_id);
  END LOOP;
  INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) VALUES(na_inspection_id,na_food_id,'FOOD_0026','Food','NA',NULL,NULL);
  BEGIN
    UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=na_inspection_id;
    PERFORM recalculate_inspection(na_inspection_id,actor,'All NA');
    RAISE EXCEPTION 'all NA food risk accepted';
  EXCEPTION WHEN check_violation THEN IF SQLERRM<>'NO_APPLICABLE_FOOD_RISK' THEN RAISE; END IF; END;
END $$;
