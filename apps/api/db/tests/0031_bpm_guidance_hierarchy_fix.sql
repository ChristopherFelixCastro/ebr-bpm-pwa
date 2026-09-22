INSERT INTO users(role_id,full_name,email,password_hash,status)
SELECT id,'BPM guidance tester','bpm.guidance.0031@example.test','hash','APPROVED'
FROM roles WHERE code='ADMIN';

DO $$
DECLARE
  actor_id uuid;
  template_id uuid;
  version_id uuid;
  section_id uuid;
  subsection_id uuid;
  nested_subsection_id uuid;
  group_id uuid;
  nested_group_id uuid;
  criterion_id uuid;
  foreign_template_id uuid;
  foreign_version_id uuid;
  guidance_id uuid;
BEGIN
  SELECT id INTO actor_id FROM users WHERE email_normalized='bpm.guidance.0031@example.test';
  INSERT INTO bpm_templates(code,name) VALUES('BPM_GUIDANCE_0031','BPM guidance') RETURNING id INTO template_id;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(template_id,1) RETURNING id INTO version_id;

  INSERT INTO bpm_template_items(template_version_id,item_kind,title,sort_order,is_evaluable)
  VALUES(version_id,'SECTION','Section',1,false) RETURNING id INTO section_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order,is_evaluable)
  VALUES(version_id,section_id,'SUBSECTION','Subsection',1,false) RETURNING id INTO subsection_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order,is_evaluable)
  VALUES(version_id,subsection_id,'SUBSECTION','Nested subsection',1,false) RETURNING id INTO nested_subsection_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order,is_evaluable)
  VALUES(version_id,nested_subsection_id,'GROUP','Group',1,false) RETURNING id INTO group_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order,is_evaluable)
  VALUES(version_id,group_id,'GROUP','Nested group',1,false) RETURNING id INTO nested_group_id;
  INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,sort_order,is_evaluable,default_criticality)
  VALUES(version_id,nested_group_id,'CRITERION','Criterion',1,true,NULL) RETURNING id INTO criterion_id;

  INSERT INTO bpm_criterion_guidance_items(template_version_id,criterion_item_id,text,sort_order,criticality,source_reference,source_row_number)
  VALUES(version_id,criterion_id,'Critical guidance',0,'CRITICA','fixture:Guide',10) RETURNING id INTO guidance_id;
  INSERT INTO bpm_criterion_guidance_items(template_version_id,criterion_item_id,text,sort_order,criticality,source_reference,source_row_number)
  VALUES(version_id,criterion_id,'Guidance without criticality',1,NULL,'fixture:Guide',11);

  UPDATE bpm_criterion_guidance_items SET text='Critical guidance updated' WHERE id=guidance_id;
  IF (SELECT version FROM bpm_criterion_guidance_items WHERE id=guidance_id) <> 2 THEN
    RAISE EXCEPTION 'guidance optimistic version not incremented';
  END IF;

  BEGIN
    INSERT INTO bpm_criterion_guidance_items(template_version_id,criterion_item_id,text,sort_order)
    VALUES(version_id,group_id,'Invalid group guidance',2);
    RAISE EXCEPTION 'guidance attached to GROUP';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE bpm_template_items SET parent_item_id=criterion_id WHERE id=group_id;
    RAISE EXCEPTION 'CRITERION accepted as parent';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE bpm_template_items SET parent_item_id=nested_group_id WHERE id=group_id;
    RAISE EXCEPTION 'BPM cycle accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO bpm_templates(code,name) VALUES('BPM_GUIDANCE_0031_FOREIGN','Foreign BPM guidance') RETURNING id INTO foreign_template_id;
  INSERT INTO bpm_template_versions(template_id,version_number) VALUES(foreign_template_id,1) RETURNING id INTO foreign_version_id;
  BEGIN
    INSERT INTO bpm_criterion_guidance_items(template_version_id,criterion_item_id,text,sort_order)
    VALUES(foreign_version_id,criterion_id,'Cross-version guidance',2);
    RAISE EXCEPTION 'cross-version guidance accepted';
  EXCEPTION WHEN foreign_key_violation OR check_violation THEN NULL;
  END;
  DELETE FROM bpm_template_versions WHERE id=foreign_version_id;

  UPDATE bpm_template_versions
  SET status='PUBLISHED',effective_from=clock_timestamp(),published_at=clock_timestamp(),published_by_user_id=actor_id
  WHERE id=version_id;

  BEGIN
    UPDATE bpm_criterion_guidance_items SET text='Changed after publication' WHERE id=guidance_id;
    RAISE EXCEPTION 'published guidance changed';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  BEGIN
    DELETE FROM bpm_criterion_guidance_items WHERE id=guidance_id;
    RAISE EXCEPTION 'published guidance deleted';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
END $$;
