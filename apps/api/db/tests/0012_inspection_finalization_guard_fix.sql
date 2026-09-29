INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Usuario finalización','finalization.user@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN';
INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'Evaluador finalización','finalization.evaluator@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR';

DO $$
DECLARE user_uuid uuid; evaluator_uuid uuid; contact_uuid uuid; company_uuid uuid; establishment_uuid uuid; request_uuid uuid; case_uuid uuid; assignment_uuid uuid; inspection_uuid uuid;
        template_uuid uuid; template_version_uuid uuid; section_uuid uuid; subsection_uuid uuid; criterion_one uuid; criterion_two uuid; risk_set_uuid uuid; risk_version_uuid uuid; factor_uuid uuid;
        i integer; j integer; factor_codes text[]:=ARRAY['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING']; factor_weights numeric[]:=ARRAY[0.20,0.20,0.15,0.15,0.15,0.15]; option_codes text[]:=ARRAY['LOW','MEDIUM_LOW','MEDIUM_HIGH','HIGH']; option_scores numeric[]:=ARRAY[1.00,1.67,2.33,3.00];
BEGIN
  SELECT id INTO user_uuid FROM users WHERE email_normalized='finalization.user@example.test';
  SELECT id INTO evaluator_uuid FROM users WHERE email_normalized='finalization.evaluator@example.test';
  INSERT INTO bpm_templates(code,name) VALUES('FINALIZATION_TEST','Plantilla finalización') RETURNING id INTO template_uuid;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_uuid,1) RETURNING id INTO template_version_uuid;
  INSERT INTO bpm_template_items(template_version_id,title,sort_order,item_kind) VALUES(template_version_uuid,'Sección',1,'SECTION') RETURNING id INTO section_uuid;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind) VALUES(template_version_uuid,section_uuid,'Subsección',1,'SUBSECTION') RETURNING id INTO subsection_uuid;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind,is_evaluable,default_criticality) VALUES(template_version_uuid,subsection_uuid,'Criterio uno',1,'CRITERION',true,'MAYOR') RETURNING id INTO criterion_one;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind,is_evaluable,default_criticality) VALUES(template_version_uuid,subsection_uuid,'Criterio dos',2,'CRITERION',true,'MENOR') RETURNING id INTO criterion_two;
  UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=user_uuid WHERE id=template_version_uuid;
  INSERT INTO risk_rule_sets(code,name) VALUES('FINALIZATION_TEST','Regla finalización') RETURNING id INTO risk_set_uuid;
  INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(risk_set_uuid,1) RETURNING id INTO risk_version_uuid;
  FOR i IN 1..6 LOOP
    INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(risk_version_uuid,factor_codes[i],factor_codes[i],factor_weights[i],i) RETURNING id INTO factor_uuid;
    FOR j IN 1..4 LOOP
      INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES(factor_uuid,option_codes[j],option_codes[j],option_scores[j],j);
    END LOOP;
  END LOOP;
  UPDATE risk_rule_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=user_uuid WHERE id=risk_version_uuid;
  INSERT INTO companies(legal_name,rnc) VALUES('Empresa finalización','135-44444-4') RETURNING id INTO company_uuid;
  INSERT INTO establishments(company_id,name) VALUES(company_uuid,'Planta finalización') RETURNING id INTO establishment_uuid;
  INSERT INTO company_requests(company_id,establishment_id,reason) VALUES(company_uuid,establishment_uuid,'Solicitud finalización') RETURNING id INTO request_uuid;
  INSERT INTO contacts(full_name) VALUES('Contacto finalización') RETURNING id INTO contact_uuid;
  INSERT INTO request_contacts(request_id,contact_id,relationship_type,full_name_snapshot,is_primary) VALUES(request_uuid,contact_uuid,'PRIMARY_CONTACT','Contacto finalización',true);
  INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status,validated_at,validated_by_user_id) VALUES(request_uuid,'AUTHORIZATION_LETTER','requests/finalization.pdf','finalization.pdf','application/pdf',1024,'VALID',clock_timestamp(),user_uuid);
  UPDATE company_requests SET status='PENDING_ASSIGNMENT',submitted_at=clock_timestamp() WHERE id=request_uuid;
  INSERT INTO cases(origin,request_id,company_id,establishment_id,status) VALUES('COMPANY_REQUEST',request_uuid,company_uuid,establishment_uuid,'PENDING_ASSIGNMENT') RETURNING id INTO case_uuid;
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(case_uuid,evaluator_uuid,user_uuid) RETURNING id INTO assignment_uuid;
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id) VALUES(case_uuid,assignment_uuid,evaluator_uuid,template_version_uuid,risk_version_uuid,user_uuid) RETURNING id INTO inspection_uuid;
  UPDATE inspections SET status='IN_PROGRESS',started_at=clock_timestamp() WHERE id=inspection_uuid;
  INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(inspection_uuid,criterion_one,'NA');
  BEGIN
    UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_uuid;
    RAISE EXCEPTION 'incomplete inspection finalized';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value) VALUES(inspection_uuid,criterion_two,'NA');
  UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=inspection_uuid;
  IF NOT EXISTS(SELECT 1 FROM inspections WHERE id=inspection_uuid AND status='PENDING_SUBMISSION') THEN RAISE EXCEPTION 'completed inspection with NA responses was not finalized'; END IF;
END $$;
