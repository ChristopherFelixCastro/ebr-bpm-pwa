-- Executed after the isolated 0026 calculation fixture by the dedicated runner.
DO $$
#variable_conflict use_variable
DECLARE
  actor uuid; evaluator uuid; inspection_id uuid; invalid_inspection uuid; review_id uuid; report_id uuid; closure_id uuid;
  item_one uuid; item_two uuid; foreign_item uuid; factor_id uuid; option_id uuid; evidence_id uuid;
  old_calc uuid; new_calc uuid; obsolete_calc uuid; current_version integer; old_revision integer;
BEGIN
  SELECT id INTO actor FROM users WHERE email_normalized='admin.0026@example.test';
  SELECT id INTO evaluator FROM users WHERE email_normalized='evaluator.0026@example.test';
  SELECT i.id INTO inspection_id FROM inspections i JOIN bpm_template_versions v ON v.id=i.bpm_template_version_id JOIN bpm_templates t ON t.id=v.template_id WHERE t.code='EXECUTION_0026' AND i.status='SUBMITTED' ORDER BY i.created_at LIMIT 1;
  SELECT b.id INTO item_one FROM bpm_template_items b WHERE b.template_version_id=(SELECT bpm_template_version_id FROM inspections WHERE id=inspection_id) AND b.display_code='C1';
  SELECT b.id INTO item_two FROM bpm_template_items b WHERE b.template_version_id=(SELECT bpm_template_version_id FROM inspections WHERE id=inspection_id) AND b.display_code='C2';
  SELECT b.id INTO foreign_item FROM bpm_template_items b JOIN bpm_template_versions v ON v.id=b.template_version_id JOIN bpm_templates t ON t.id=v.template_id WHERE t.code='FOREIGN_0026';
  SELECT c.id INTO old_calc FROM inspection_calculations c WHERE c.inspection_id=inspection_id AND c.is_current;

  SELECT id INTO invalid_inspection FROM inspections WHERE status='IN_PROGRESS' ORDER BY created_at DESC LIMIT 1;
  BEGIN PERFORM open_inspection_review(invalid_inspection,actor); RAISE EXCEPTION 'invalid opening accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot)
  SELECT invalid_inspection,s.id,c.code,c.name,s.name,s.microbiological_risk,s.risk_score FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE c.risk_rule_version_id=(SELECT risk_rule_version_id FROM inspections WHERE id=invalid_inspection) AND s.microbiological_risk IS NOT NULL ORDER BY s.risk_score DESC LIMIT 1;
  UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=invalid_inspection;
  PERFORM recalculate_inspection(invalid_inspection,actor,'Complete auxiliary fixture');
  UPDATE inspections SET status='SUBMITTED',submitted_at=clock_timestamp() WHERE id=invalid_inspection;
  review_id:=open_inspection_review(inspection_id,actor);
  IF NOT EXISTS(SELECT 1 FROM inspection_review_cycles r WHERE r.id=review_id AND r.initial_calculation_id=old_calc AND r.current_calculation_id=old_calc) THEN RAISE EXCEPTION 'review calculation reference missing'; END IF;
  BEGIN PERFORM open_inspection_review(inspection_id,actor); RAISE EXCEPTION 'second active cycle accepted'; EXCEPTION WHEN check_violation OR unique_violation THEN NULL; END;
  BEGIN PERFORM return_inspection_review(inspection_id,review_id,actor,'',ARRAY[item_one]); RAISE EXCEPTION 'empty return reason accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM return_inspection_review(inspection_id,review_id,actor,'Fix',ARRAY[]::uuid[]); RAISE EXCEPTION 'empty criteria accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM return_inspection_review(inspection_id,review_id,actor,'Fix',ARRAY[foreign_item]); RAISE EXCEPTION 'foreign criterion accepted'; EXCEPTION WHEN check_violation THEN NULL; END;

  SELECT content_revision INTO old_revision FROM inspections WHERE id=inspection_id;
  PERFORM return_inspection_review(inspection_id,review_id,actor,'Correct criterion one',ARRAY[item_one]);
  IF NOT EXISTS(SELECT 1 FROM inspections i WHERE i.id=inspection_id AND i.status='IN_PROGRESS' AND i.content_revision=old_revision+1) OR NOT EXISTS(SELECT 1 FROM inspection_calculations c WHERE c.id=old_calc AND c.status='SUPERSEDED' AND NOT c.is_current) THEN RAISE EXCEPTION 'atomic return did not unlock once and supersede calculation'; END IF;
  PERFORM set_config('app.review_correction_write',review_id::text,true);
  BEGIN UPDATE inspection_bpm_responses r SET response_value='C' WHERE r.inspection_id=inspection_id AND r.bpm_item_id=item_two; RAISE EXCEPTION 'unmarked criterion changed'; EXCEPTION WHEN check_violation THEN NULL; END;
  SELECT s.risk_factor_id,o.id INTO factor_id,option_id FROM inspection_risk_factor_selections s JOIN risk_factor_options o ON o.risk_factor_id=s.risk_factor_id AND o.id<>s.risk_factor_option_id WHERE s.inspection_id=inspection_id LIMIT 1;
  BEGIN UPDATE inspection_risk_factor_selections s SET risk_factor_option_id=option_id WHERE s.inspection_id=inspection_id AND s.risk_factor_id=factor_id; RAISE EXCEPTION 'risk factor changed during correction'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) SELECT inspection_id,f.food_risk_subcategory_id,f.category_code_snapshot,f.category_name_snapshot,f.subcategory_name_snapshot,f.microbiological_risk_snapshot,f.risk_score_snapshot FROM inspection_food_snapshots f WHERE f.inspection_id=inspection_id LIMIT 1; RAISE EXCEPTION 'food changed during correction'; EXCEPTION WHEN check_violation OR unique_violation THEN NULL; END;
  SELECT e.id INTO evidence_id FROM inspection_evidence e WHERE e.inspection_id=inspection_id AND e.status<>'ARCHIVED' LIMIT 1;
  IF evidence_id IS NULL THEN RAISE EXCEPTION 'evidence fixture missing'; END IF;
  BEGIN UPDATE inspection_evidence SET deleted_at=clock_timestamp(),deleted_by_user_id=evaluator WHERE id=evidence_id; RAISE EXCEPTION 'evidence changed during correction'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM resubmit_inspection_review(inspection_id,review_id,evaluator); RAISE EXCEPTION 'incomplete resubmission accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM set_config('app.actor_user_id',evaluator::text,true); PERFORM set_config('app.review_correction_write',review_id::text,true);
  UPDATE inspection_bpm_responses r SET response_value='C' WHERE r.inspection_id=inspection_id AND r.bpm_item_id=item_one;
  new_calc:=resubmit_inspection_review(inspection_id,review_id,evaluator);
  IF new_calc=old_calc OR NOT EXISTS(SELECT 1 FROM inspection_calculations c WHERE c.id=new_calc AND c.status='COMPLETED' AND c.is_current) OR NOT EXISTS(SELECT 1 FROM inspection_review_cycles r WHERE r.id=review_id AND r.status='RESUBMITTED' AND r.current_calculation_id=new_calc) THEN RAISE EXCEPTION 'resubmission calculation invalid'; END IF;

  PERFORM return_inspection_review(inspection_id,review_id,actor,'Second correction',ARRAY[item_two]);
  IF NOT EXISTS(SELECT 1 FROM inspection_review_correction_items x WHERE x.review_cycle_id=review_id AND x.return_number=2 AND x.bpm_item_id=item_two) THEN RAISE EXCEPTION 'second return history missing'; END IF;
  BEGIN PERFORM approve_inspection_review(inspection_id,review_id,actor,NULL); RAISE EXCEPTION 'approval with open corrections accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM set_config('app.actor_user_id',evaluator::text,true); PERFORM set_config('app.review_correction_write',review_id::text,true);
  UPDATE inspection_bpm_responses r SET response_value='CP' WHERE r.inspection_id=inspection_id AND r.bpm_item_id=item_two;
  new_calc:=resubmit_inspection_review(inspection_id,review_id,evaluator);
  PERFORM approve_inspection_review(inspection_id,review_id,actor,'Approved');
  IF NOT EXISTS(SELECT 1 FROM inspection_review_cycles r WHERE r.id=review_id AND r.status='APPROVED' AND r.approved_by_name_snapshot IS NOT NULL) THEN RAISE EXCEPTION 'approval snapshot missing'; END IF;
  BEGIN UPDATE inspection_review_cycles r SET return_reason='mutated' WHERE r.id=review_id; RAISE EXCEPTION 'approved review mutable'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;

  BEGIN INSERT INTO inspection_reports(inspection_id,review_cycle_id,calculation_id,storage_path,file_name,size_bytes,content_sha256,generated_by_user_id) VALUES(inspection_id,review_id,new_calc,'official-report/'||inspection_id||'/'||gen_random_uuid()||'.pdf','direct.pdf',100,repeat('a',64),actor); RAISE EXCEPTION 'uncontrolled report accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  SELECT c.id INTO obsolete_calc FROM inspection_calculations c WHERE c.inspection_id=inspection_id AND NOT c.is_current ORDER BY c.calculation_number DESC LIMIT 1;
  PERFORM set_config('app.report_generation_review_id',review_id::text,true);
  BEGIN INSERT INTO inspection_reports(inspection_id,review_cycle_id,calculation_id,storage_path,file_name,size_bytes,content_sha256,generated_by_user_id) VALUES(inspection_id,review_id,obsolete_calc,'official-report/'||inspection_id||'/'||gen_random_uuid()||'.pdf','stale.pdf',100,repeat('a',64),actor); RAISE EXCEPTION 'stale report accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO inspection_reports(inspection_id,review_cycle_id,calculation_id,generation_key,storage_path,file_name,size_bytes,content_sha256,generated_by_user_id) VALUES(inspection_id,review_id,new_calc,gen_random_uuid(),'official-report/'||inspection_id||'/'||gen_random_uuid()||'.pdf','valid.pdf',100,repeat('b',64),actor) RETURNING id INTO report_id;
  INSERT INTO inspection_report_participants(report_id,participant_role,user_id,display_name_snapshot,role_name_snapshot,participation_snapshot) SELECT report_id,'EVALUATOR',evaluator,u.full_name,r.name,'Evaluator' FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=evaluator;
  INSERT INTO inspection_report_participants(report_id,participant_role,user_id,display_name_snapshot,role_name_snapshot,participation_snapshot) SELECT report_id,'COORDINATOR_APPROVER',actor,u.full_name,r.name,'Approver' FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=actor;
  BEGIN PERFORM close_inspection(inspection_id,report_id,actor,'Premature'); RAISE EXCEPTION 'closure without official report accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM officialize_inspection_report(inspection_id,report_id,actor);
  BEGIN UPDATE inspection_reports r SET file_name='changed.pdf' WHERE r.id=report_id; RAISE EXCEPTION 'official report mutable'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN PERFORM recalculate_inspection(inspection_id,actor,'Forbidden'); RAISE EXCEPTION 'official inspection recalculated'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM open_inspection_review(inspection_id,actor); RAISE EXCEPTION 'review opened after official report'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE inspections SET status='IN_PROGRESS',finalized_at=NULL,submitted_at=NULL,content_revision=content_revision+1 WHERE id=inspection_id; RAISE EXCEPTION 'official inspection unlocked'; EXCEPTION WHEN object_not_in_prerequisite_state OR check_violation THEN NULL; END;

  closure_id:=close_inspection(inspection_id,report_id,actor,'Completed inspection');
  IF close_inspection(inspection_id,report_id,actor,'Completed inspection')<>closure_id THEN RAISE EXCEPTION 'closure retry not idempotent'; END IF;
  BEGIN PERFORM close_inspection(inspection_id,report_id,actor,'Different identity'); RAISE EXCEPTION 'incompatible closure retry accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM cases c JOIN inspections i ON i.case_id=c.id WHERE i.id=inspection_id AND c.status='CLOSED') OR EXISTS(SELECT 1 FROM case_assignments a JOIN inspections i ON i.case_assignment_id=a.id WHERE i.id=inspection_id AND a.is_active) OR (SELECT count(*) FROM inspection_review_events e WHERE e.review_cycle_id=review_id)<5 THEN RAISE EXCEPTION 'closure or histories invalid'; END IF;
END $$;
