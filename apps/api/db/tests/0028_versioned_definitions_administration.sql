INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Versioned definitions administrator','definitions.0028@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN';

DO $$
DECLARE actor uuid; catalog_id uuid; flat_id uuid; cv1 uuid; cv2 uuid; root_id uuid; leaf_id uuid; foreign_version uuid;
BEGIN
 SELECT id INTO actor FROM users WHERE email_normalized='definitions.0028@example.test';
 INSERT INTO catalog_definitions(code,name,supports_hierarchy) VALUES('ADMIN_0028_TREE','Tree',true) RETURNING id INTO catalog_id;
 INSERT INTO catalog_definitions(code,name,supports_hierarchy) VALUES('ADMIN_0028_FLAT','Flat',false) RETURNING id INTO flat_id;
 INSERT INTO catalog_versions(catalog_id,version_number) VALUES(catalog_id,1) RETURNING id INTO cv1;
 BEGIN INSERT INTO catalog_versions(catalog_id,version_number) VALUES(catalog_id,2); RAISE EXCEPTION 'second draft accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE catalog_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=cv1; RAISE EXCEPTION 'empty catalog published'; EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,sort_order) VALUES(cv1,'ROOT','Root','NODE',1) RETURNING id INTO root_id;
 INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,parent_entry_id,sort_order) VALUES(cv1,'LEAF','Leaf','LEAF',root_id,1) RETURNING id INTO leaf_id;
 BEGIN INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,parent_entry_id,sort_order) VALUES(cv1,'BAD_PARENT','Bad','LEAF',leaf_id,1); RAISE EXCEPTION 'leaf parent accepted'; EXCEPTION WHEN check_violation OR raise_exception THEN NULL; END;
 BEGIN UPDATE catalog_entries SET parent_entry_id=leaf_id WHERE id=root_id; RAISE EXCEPTION 'cycle accepted'; EXCEPTION WHEN check_violation OR raise_exception THEN NULL; END;
 INSERT INTO catalog_versions(catalog_id,version_number) VALUES(flat_id,1) RETURNING id INTO foreign_version;
 BEGIN INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,parent_entry_id,sort_order) VALUES(foreign_version,'CROSS','Cross','LEAF',root_id,1); RAISE EXCEPTION 'cross-version parent accepted'; EXCEPTION WHEN foreign_key_violation OR check_violation OR raise_exception THEN NULL; END;
 INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,sort_order) VALUES(foreign_version,'FLAT_ROOT','Flat root','NODE',1) RETURNING id INTO leaf_id;
 BEGIN INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,parent_entry_id,sort_order) VALUES(foreign_version,'FLAT_CHILD','Flat child','LEAF',leaf_id,1); RAISE EXCEPTION 'flat hierarchy accepted'; EXCEPTION WHEN check_violation OR raise_exception THEN NULL; END;
 BEGIN DELETE FROM catalog_entries WHERE id=root_id; RAISE EXCEPTION 'parent with children deleted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 UPDATE catalog_versions SET status='PUBLISHED',effective_from=clock_timestamp()-interval '1 day',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=cv1;
 BEGIN UPDATE catalog_entries SET name='Changed' WHERE id=root_id; RAISE EXCEPTION 'published catalog changed'; EXCEPTION WHEN object_not_in_prerequisite_state OR raise_exception THEN NULL; END;
 INSERT INTO catalog_versions(catalog_id,version_number) VALUES(catalog_id,2) RETURNING id INTO cv2;
 INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,sort_order) SELECT cv2,code,name,entry_type,sort_order FROM catalog_entries WHERE catalog_version_id=cv1 AND parent_entry_id IS NULL;
 IF EXISTS(SELECT 1 FROM catalog_entries a JOIN catalog_entries b ON a.code=b.code WHERE a.catalog_version_id=cv1 AND b.catalog_version_id=cv2 AND a.id=b.id) THEN RAISE EXCEPTION 'catalog clone reused UUID'; END IF;
 PERFORM set_config('app.versioned_admin_transition','adjust',true); UPDATE catalog_versions SET effective_to=clock_timestamp()+interval '1 day' WHERE id=cv1;
 UPDATE catalog_versions SET status='PUBLISHED',effective_from=clock_timestamp()+interval '1 day',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=cv2;
 BEGIN INSERT INTO catalog_versions(catalog_id,version_number,status,effective_from,published_at,published_by_user_id) VALUES(catalog_id,3,'PUBLISHED',clock_timestamp(),clock_timestamp(),actor); RAISE EXCEPTION 'overlap accepted'; EXCEPTION WHEN exclusion_violation OR check_violation THEN NULL; END;
END $$;

DO $$
DECLARE actor uuid; template_id uuid; v1 uuid; v2 uuid; section_id uuid; subsection_id uuid; criterion_id uuid;
BEGIN
 SELECT id INTO actor FROM users WHERE email_normalized='definitions.0028@example.test';
 INSERT INTO bpm_templates(code,name) VALUES('ADMIN_0028_BPM','BPM') RETURNING id INTO template_id;
 INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,1) RETURNING id INTO v1;
 BEGIN INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,2); RAISE EXCEPTION 'second BPM draft accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 INSERT INTO bpm_template_items(template_version_id,item_kind,title,sort_order) VALUES(v1,'SECTION','Section',1) RETURNING id INTO section_id;
 INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order) VALUES(v1,section_id,'SUBSECTION','Subsection',1) RETURNING id INTO subsection_id;
 INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,source_code,display_code,title,sort_order,is_evaluable,default_criticality,source_reference,source_row_number) VALUES(v1,subsection_id,'CRITERION','SOURCE','DISPLAY','Criterion',1,true,'MAYOR','AllItems',1) RETURNING id INTO criterion_id;
 INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,source_code,display_code,title,sort_order,is_evaluable,default_criticality,source_reference,source_row_number) VALUES(v1,subsection_id,'CRITERION','SOURCE','DISPLAY_2','Criterion 2',2,true,'MENOR','AllItems',2);
 BEGIN INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,display_code,title,sort_order,is_evaluable,default_criticality) VALUES(v1,subsection_id,'CRITERION','DISPLAY','Duplicate display',3,true,'MAYOR'); RAISE EXCEPTION 'duplicate display code accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN INSERT INTO bpm_template_items(template_version_id,item_kind,title,sort_order,is_evaluable,default_criticality) VALUES(v1,'SECTION','Invalid criticality',2,false,'MAYOR'); RAISE EXCEPTION 'structural criticality accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,display_code,title,sort_order,is_evaluable,default_criticality) VALUES(v1,section_id,'CRITERION','INVALID','Invalid',3,true,'MAYOR'); UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=v1; RAISE EXCEPTION 'invalid hierarchy published'; EXCEPTION WHEN check_violation THEN DELETE FROM bpm_template_items WHERE display_code='INVALID'; END;
 UPDATE bpm_template_versions SET status='PUBLISHED',effective_from=clock_timestamp()-interval '1 second',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=v1;
 BEGIN UPDATE bpm_template_items SET title='Changed' WHERE id=criterion_id; RAISE EXCEPTION 'published BPM changed'; EXCEPTION WHEN object_not_in_prerequisite_state OR raise_exception THEN NULL; END;
 INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,2) RETURNING id INTO v2;
 INSERT INTO bpm_template_items(template_version_id,item_kind,title,sort_order) VALUES(v2,'SECTION','Future section',1) RETURNING id INTO section_id;
 INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order) VALUES(v2,section_id,'SUBSECTION','Future subsection',1) RETURNING id INTO subsection_id;
 INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,display_code,title,sort_order,is_evaluable,default_criticality) VALUES(v2,subsection_id,'CRITERION','FUTURE','Future criterion',1,true,'CRITICA');
 PERFORM set_config('app.versioned_admin_transition','adjust',true); UPDATE bpm_template_versions SET effective_to=clock_timestamp()+interval '1 day' WHERE id=v1;
 UPDATE bpm_template_versions SET status='PUBLISHED',effective_from=clock_timestamp()+interval '1 day',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=v2;
 IF effective_bpm_template_version(clock_timestamp())<>v1 THEN RAISE EXCEPTION 'future BPM selected early'; END IF;
 IF effective_bpm_template_version(clock_timestamp()+interval '2 days')<>v2 THEN RAISE EXCEPTION 'future BPM not selected'; END IF;
END $$;

DO $$
DECLARE actor uuid; set_id uuid; v1 uuid; v2 uuid; factor_id uuid; cloned_factor_id uuid; source_category_id uuid; cloned_category_id uuid; source_factor record; i int; codes text[]:=ARRAY['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING'];
BEGIN
 SELECT id INTO actor FROM users WHERE email_normalized='definitions.0028@example.test';
 INSERT INTO risk_rule_sets(code,name) VALUES('ADMIN_0028_RISK','Risk') RETURNING id INTO set_id;
 INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(set_id,1) RETURNING id INTO v1;
 BEGIN INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(set_id,2); RAISE EXCEPTION 'second risk draft accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 FOR i IN 1..6 LOOP INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(v1,codes[i],codes[i],CASE WHEN i<=4 THEN .17 ELSE .16 END,i) RETURNING id INTO factor_id; INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES(factor_id,'LOW','Low',1,1),(factor_id,'MEDIUM_LOW','Medium low',1.67,2),(factor_id,'MEDIUM_HIGH','Medium high',2.33,3),(factor_id,'HIGH','High',3,4); END LOOP;
 INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(v1,'FOOD','Food',1) RETURNING id INTO source_category_id;
 INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(source_category_id,'Applicable','HIGH',3,1),(source_category_id,'NA',NULL,NULL,2);
 BEGIN INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(source_category_id,'Partial','LOW',NULL,3); RAISE EXCEPTION 'partial null accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES(v1,1,3.6,true,true,'ANNUAL','Annual',1),(v1,3.6,6.3,false,true,'SEMIANNUAL','Semiannual',2),(v1,6.3,NULL,false,false,'QUARTERLY','Quarterly',3);
 BEGIN INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES(v1,3,4,true,true,'ANNUAL','Overlap',4); RAISE EXCEPTION 'overlap accepted'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
 UPDATE risk_rule_versions SET status='PUBLISHED',effective_from=clock_timestamp()-interval '1 second',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=v1;
 BEGIN UPDATE risk_factors SET weight=.1 WHERE risk_rule_version_id=v1; RAISE EXCEPTION 'published risk changed'; EXCEPTION WHEN object_not_in_prerequisite_state OR raise_exception THEN NULL; END;
 INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES(set_id,2) RETURNING id INTO v2;
 IF v1=v2 THEN RAISE EXCEPTION 'version UUID reused'; END IF;
 IF effective_risk_rule_version(clock_timestamp())<>v1 THEN RAISE EXCEPTION 'effective risk resolution invalid'; END IF;
 BEGIN PERFORM set_config('app.versioned_admin_transition','retire',true); UPDATE risk_rule_versions SET retired_at=clock_timestamp(),retired_by_user_id=actor,effective_to=clock_timestamp() WHERE id=v1; RAISE EXCEPTION 'only risk version retired'; EXCEPTION WHEN check_violation THEN NULL; END;
 FOR source_factor IN SELECT * FROM risk_factors WHERE risk_rule_version_id=v1 LOOP
   INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(v2,source_factor.code,source_factor.name,source_factor.weight,source_factor.sort_order) RETURNING id INTO cloned_factor_id;
   INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) SELECT cloned_factor_id,code,label,score,sort_order FROM risk_factor_options WHERE risk_factor_id=source_factor.id;
 END LOOP;
 INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) SELECT v2,code,name,sort_order FROM food_risk_categories WHERE id=source_category_id RETURNING id INTO cloned_category_id;
 INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) SELECT cloned_category_id,s.name,s.microbiological_risk,s.risk_score,s.sort_order FROM food_risk_subcategories s WHERE s.category_id=source_category_id;
 INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) SELECT v2,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order FROM inspection_frequency_ranges WHERE risk_rule_version_id=v1;
 PERFORM set_config('app.versioned_admin_transition','adjust',true); UPDATE risk_rule_versions SET effective_to=clock_timestamp()+interval '1 day' WHERE id=v1;
 UPDATE risk_rule_versions SET status='PUBLISHED',effective_from=clock_timestamp()+interval '1 day',published_at=clock_timestamp(),published_by_user_id=actor WHERE id=v2;
 PERFORM set_config('app.versioned_admin_transition','retire',true);
 UPDATE risk_rule_versions SET retired_at=clock_timestamp(),retired_by_user_id=actor,effective_to=clock_timestamp() WHERE id=v1;
 BEGIN DELETE FROM risk_rule_versions WHERE id=v1; RAISE EXCEPTION 'retired risk version deleted'; EXCEPTION WHEN object_not_in_prerequisite_state OR raise_exception THEN NULL; END;
END $$;
