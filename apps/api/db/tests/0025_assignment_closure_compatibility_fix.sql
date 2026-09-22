CREATE OR REPLACE FUNCTION create_0025_closure_fixture(p_actor uuid,p_evaluator uuid,p_bpm uuid,p_risk uuid,p_range uuid,p_review boolean,p_report boolean) RETURNS uuid[] LANGUAGE plpgsql AS $$
DECLARE c uuid; a uuid; i uuid; calc uuid; review_id uuid; report_id uuid;
BEGIN
  INSERT INTO cases(origin,status,priority) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT','MEDIUM') RETURNING id INTO c;
  INSERT INTO institutional_program_cases(case_id,reason,created_by_user_id) VALUES(c,'Closure compatibility fixture',p_actor);
  INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES(c,p_evaluator,p_actor) RETURNING id INTO a;
  INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,status,started_at,finalized_at,submitted_at,created_by_user_id)
  VALUES(c,a,p_evaluator,p_bpm,p_risk,'SUBMITTED',clock_timestamp(),clock_timestamp(),clock_timestamp(),p_actor) RETURNING id INTO i;
  INSERT INTO inspection_calculations(inspection_id,calculation_number,bpm_template_version_id,risk_rule_version_id,inspection_content_revision,bpm_numerator,bpm_denominator,bpm_percentage,product_risk_score,establishment_risk_score,total_risk_score,frequency,frequency_range_id,calculated_by_user_id)
  VALUES(i,1,p_bpm,p_risk,(SELECT content_revision FROM inspections WHERE id=i),1,1,100,1,1,1,'ANNUAL',p_range,p_actor) RETURNING id INTO calc;
  IF p_review THEN
    review_id:=open_inspection_review(i,p_actor);
    PERFORM approve_inspection_review(i,review_id,p_actor,NULL);
  END IF;
  IF p_report AND p_review THEN
    PERFORM set_config('app.report_generation_review_id',review_id::text,true);
    INSERT INTO inspection_reports(inspection_id,review_cycle_id,calculation_id,status,storage_path,file_name,mime_type,size_bytes,content_sha256,generated_by_user_id)
    VALUES(i,review_id,calc,'DRAFT','official-report/'||i||'/'||gen_random_uuid()||'.pdf','closure.pdf','application/pdf',1024,repeat('a',64),p_actor) RETURNING id INTO report_id;
    INSERT INTO inspection_report_participants(report_id,participant_role,user_id,display_name_snapshot,role_name_snapshot,participation_snapshot)
    SELECT report_id,'EVALUATOR',p_evaluator,u.full_name,r.name,'Evaluator responsible' FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=p_evaluator;
    INSERT INTO inspection_report_participants(report_id,participant_role,user_id,display_name_snapshot,role_name_snapshot,participation_snapshot)
    SELECT report_id,'COORDINATOR_APPROVER',p_actor,u.full_name,r.name,'Review approval' FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=p_actor;
    PERFORM officialize_inspection_report(i,report_id,p_actor);
  END IF;
  RETURN ARRAY[c,a,i,report_id];
END $$;

DO $$
DECLARE
  actor uuid; evaluator uuid; template_id uuid; bpm_version uuid; bpm_section uuid; bpm_subsection uuid; risk_set uuid; risk_version uuid; factor uuid; range_id uuid;
  fixture uuid[]; case_one uuid; assignment_one uuid; inspection_one uuid; report_one uuid; closure_one uuid;
  case_two uuid; assignment_two uuid; inspection_two uuid; report_two uuid; schedule_two uuid; closure_two uuid;
  case_missing_review uuid; assignment_missing_review uuid; inspection_missing_review uuid; report_missing_review uuid;
  case_missing_report uuid; assignment_missing_report uuid; inspection_missing_report uuid;
  x integer; y integer; codes text[]:=ARRAY['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING']; weights numeric[]:=ARRAY[.2,.2,.15,.15,.15,.15]; options text[]:=ARRAY['LOW','MEDIUM_LOW','MEDIUM_HIGH','HIGH']; scores numeric[]:=ARRAY[1,1.67,2.33,3];
BEGIN
  INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Closure Actor','closure.actor@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN' RETURNING id INTO actor;
  INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Closure Evaluator','closure.evaluator@example.test','hash','APPROVED' FROM roles WHERE code='EVALUATOR' RETURNING id INTO evaluator;
  INSERT INTO bpm_templates(code,name) VALUES('CLOSURE_0025','Closure template') RETURNING id INTO template_id;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,1) RETURNING id INTO bpm_version;
  INSERT INTO bpm_template_items(template_version_id,title,sort_order,item_kind) VALUES(bpm_version,'Closure section',1,'SECTION') RETURNING id INTO bpm_section;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind) VALUES(bpm_version,bpm_section,'Closure subsection',1,'SUBSECTION') RETURNING id INTO bpm_subsection;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,title,sort_order,item_kind,is_evaluable,default_criticality) VALUES(bpm_version,bpm_subsection,'Closure criterion',1,'CRITERION',true,'MENOR');
  UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=bpm_version;
  INSERT INTO risk_rule_sets(code,name) VALUES('CLOSURE_0025','Closure risk') RETURNING id INTO risk_set;
  INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(risk_set,1) RETURNING id INTO risk_version;
  FOR x IN 1..6 LOOP
    INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(risk_version,codes[x],codes[x],weights[x],x) RETURNING id INTO factor;
    FOR y IN 1..4 LOOP INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES(factor,options[y],options[y],scores[y],y); END LOOP;
  END LOOP;
  INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(risk_version,'CLOSURE_FOOD','Closure food',1);
  INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES(risk_version,0,10,true,true,'ANNUAL','Annual',1) RETURNING id INTO range_id;
  UPDATE risk_rule_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=risk_version;

  fixture:=create_0025_closure_fixture(actor,evaluator,bpm_version,risk_version,range_id,true,true); case_one:=fixture[1]; assignment_one:=fixture[2]; inspection_one:=fixture[3]; report_one:=fixture[4];
  BEGIN UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason='Direct close' WHERE id=case_one; SET CONSTRAINTS ALL IMMEDIATE; RAISE EXCEPTION 'direct close retained active assignment'; EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED; END;
  closure_one:=close_inspection(inspection_one,report_one,actor,'  Explicit closure reason  ');
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF NOT EXISTS(SELECT 1 FROM inspection_closures WHERE id=closure_one AND inspection_id=inspection_one AND closed_by_user_id=actor AND closure_reason='Explicit closure reason' AND closed_at IS NOT NULL) THEN RAISE EXCEPTION 'explicit closure row invalid'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_one AND status='CLOSED' AND closed_at IS NOT NULL AND closed_reason='Explicit closure reason') THEN RAISE EXCEPTION 'explicit case closure invalid'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_one AND NOT is_active AND unassigned_at IS NOT NULL AND unassigned_by_user_id=actor AND change_reason='Explicit closure reason') THEN RAISE EXCEPTION 'explicit assignment closure invalid'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_assignment_transitions WHERE case_id=case_one AND event_type='ASSIGNED') OR NOT EXISTS(SELECT 1 FROM case_assignment_transitions WHERE case_id=case_one AND event_type='UNASSIGNED' AND performed_by_user_id=actor) THEN RAISE EXCEPTION 'assignment history not preserved'; END IF;
  BEGIN PERFORM close_inspection(inspection_one,report_one,actor,'Again'); RAISE EXCEPTION 'repeated closure accepted'; EXCEPTION WHEN check_violation OR unique_violation THEN NULL; END;

  fixture:=create_0025_closure_fixture(actor,evaluator,bpm_version,risk_version,range_id,true,true); case_two:=fixture[1]; assignment_two:=fixture[2]; inspection_two:=fixture[3]; report_two:=fixture[4];
  INSERT INTO case_schedule_entries(case_id,case_assignment_id,scheduled_start_at,scheduled_end_at,scheduled_by_user_id,notes) VALUES(case_two,assignment_two,clock_timestamp()+interval '2 days',clock_timestamp()+interval '2 days 1 hour',actor,'Closure schedule') RETURNING id INTO schedule_two;
  BEGIN
    UPDATE case_assignments SET is_active=false,unassigned_at=clock_timestamp(),unassigned_by_user_id=actor,change_reason='Direct close' WHERE id=assignment_two;
    UPDATE cases SET status='CLOSED',closed_at=clock_timestamp(),closed_reason='Direct close' WHERE id=case_two;
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'direct close retained scheduled entry';
  EXCEPTION WHEN check_violation THEN SET CONSTRAINTS ALL DEFERRED; END;
  closure_two:=close_inspection(inspection_two,report_two,actor,'   ');
  SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_entries WHERE id=schedule_two AND status='CANCELLED' AND cancellation_reason='Case closed' AND cancelled_at IS NOT NULL AND cancelled_by_user_id=actor) THEN RAISE EXCEPTION 'active schedule not cancelled'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_two AND NOT is_active AND change_reason='Case closed') OR NOT EXISTS(SELECT 1 FROM cases WHERE id=case_two AND status='CLOSED' AND closed_reason='Case closed') THEN RAISE EXCEPTION 'default closure reason not applied'; END IF;
  IF NOT EXISTS(SELECT 1 FROM inspection_closures WHERE id=closure_two AND closure_reason='Case closed') THEN RAISE EXCEPTION 'default closure missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_schedule_transitions WHERE schedule_entry_id=schedule_two AND event_type='CANCELLED' AND performed_by_user_id=actor AND reason='Case closed') THEN RAISE EXCEPTION 'schedule history not preserved'; END IF;

  fixture:=create_0025_closure_fixture(actor,evaluator,bpm_version,risk_version,range_id,false,false); case_missing_review:=fixture[1]; assignment_missing_review:=fixture[2]; inspection_missing_review:=fixture[3]; report_missing_review:=gen_random_uuid();
  BEGIN PERFORM close_inspection(inspection_missing_review,report_missing_review,actor,'Should fail'); RAISE EXCEPTION 'closure without review accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_missing_review AND status='ASSIGNED') OR NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_missing_review AND is_active) OR EXISTS(SELECT 1 FROM inspection_closures WHERE inspection_id=inspection_missing_review) THEN RAISE EXCEPTION 'failed review closure left partial state'; END IF;

  fixture:=create_0025_closure_fixture(actor,evaluator,bpm_version,risk_version,range_id,true,false); case_missing_report:=fixture[1]; assignment_missing_report:=fixture[2]; inspection_missing_report:=fixture[3];
  BEGIN PERFORM close_inspection(inspection_missing_report,gen_random_uuid(),actor,'Should fail'); RAISE EXCEPTION 'closure without official report accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM cases WHERE id=case_missing_report AND status='ASSIGNED') OR NOT EXISTS(SELECT 1 FROM case_assignments WHERE id=assignment_missing_report AND is_active) OR EXISTS(SELECT 1 FROM inspection_closures WHERE inspection_id=inspection_missing_report) THEN RAISE EXCEPTION 'failed report closure left partial state'; END IF;
END $$;

DROP FUNCTION create_0025_closure_fixture(uuid,uuid,uuid,uuid,uuid,boolean,boolean);
