INSERT INTO roles(code,name,is_universal) VALUES ('RISK_TEST','Riesgo prueba',false);
INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Publicador riesgo','risk.publisher@example.test','hash','APPROVED' FROM roles WHERE code='RISK_TEST';
INSERT INTO risk_rule_sets(code,name) VALUES ('RISK_V1','Regla riesgo');
INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) SELECT id,1 FROM risk_rule_sets WHERE code='RISK_V1';
DO $$ DECLARE v uuid; u uuid; f uuid; codes text[]:=ARRAY['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING']; weights numeric[]:=ARRAY[.17,.17,.17,.17,.16,.16]; i int; cat uuid; BEGIN
 SELECT v.id INTO v FROM risk_rule_versions v JOIN risk_rule_sets s ON s.id=v.risk_rule_set_id WHERE s.code='RISK_V1'; SELECT id INTO u FROM users WHERE email_normalized='risk.publisher@example.test';
 FOR i IN 1..6 LOOP INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES(v,codes[i],codes[i],weights[i],i) RETURNING id INTO f; INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES(f,'ONE','1',1,1),(f,'ONE67','1.67',1.67,2),(f,'TWO33','2.33',2.33,3),(f,'THREE','3',3,4); END LOOP;
 INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES(v,'FOOD','Food',1) RETURNING id INTO cat;
 INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES(cat,'Low','LOW',1,1),(cat,'Medium','MEDIUM',2,2),(cat,'High','HIGH',3,3),(cat,'NA',NULL,NULL,4);
 BEGIN INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score) VALUES(cat,'Bad','LOW',3); RAISE EXCEPTION 'invalid matrix accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES(v,1,3.6,true,true,'ANNUAL','Anual',1),(v,3.6,6.3,false,true,'SEMIANNUAL','Semestral',2),(v,6.3,NULL,false,false,'QUARTERLY','Trimestral',3);
 BEGIN INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES(v,3,4,true,true,'ANNUAL','Overlap',4); RAISE EXCEPTION 'overlap accepted'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
 UPDATE risk_rule_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=u WHERE id=v;
 BEGIN UPDATE risk_factors SET weight=.1 WHERE risk_rule_version_id=v; RAISE EXCEPTION 'published child changed'; EXCEPTION WHEN raise_exception OR object_not_in_prerequisite_state THEN NULL; END;
 BEGIN UPDATE risk_rule_versions SET publication_note='changed' WHERE id=v; RAISE EXCEPTION 'published version changed'; EXCEPTION WHEN raise_exception OR object_not_in_prerequisite_state THEN NULL; END;
END $$;
