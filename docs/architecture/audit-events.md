# Auditoría técnica

`audit_events` tiene retención provisional indefinida. Solo los roles API `ADMIN` y
`UNIVERSAL` pueden consultar sus eventos; las respuestas ordinarias no exponen IP ni
user-agent. La defensa principal es una allowlist centralizada por acción en Express.
La validación recursiva de PostgreSQL es una defensa secundaria y no interpreta ni
pretende sanitizar valores sensibles.

## Códigos iniciales

`AUTH_LOGIN_SUCCEEDED`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`, `USER_CREATED`,
`USER_UPDATED`, `USER_STATUS_CHANGED`, `COMPANY_CREATED`, `COMPANY_UPDATED`,
`CONTACT_CREATED`, `CONTACT_UPDATED`, `INSPECTION_ASSIGNED`,
`INSPECTION_REASSIGNED`, `INSPECTION_STATUS_CHANGED`, `BPM_RESPONSE_CREATED`,
`BPM_RESPONSE_UPDATED`, `EVIDENCE_CREATED`, `EVIDENCE_ARCHIVED`,
`CATALOG_PUBLISHED`, `RISK_RULE_PUBLISHED`, `REVIEW_SUBMITTED`,
`REVIEW_RETURNED`, `REPORT_GENERATED`, `CASE_CLOSED`.

La administración de instrucciones auxiliares BPM usa
`BPM_GUIDANCE_CREATED`, `BPM_GUIDANCE_UPDATED` y `BPM_GUIDANCE_DELETED`. Su
metadata permitida se limita a `templateId`, `versionId`, `criterionItemId` y
`guidanceItemId`; el texto de la instrucción nunca se copia al evento de
auditoría.

## Privilegios

La cuenta de migraciones será distinta de la cuenta futura de API. En cada entorno,
operaciones aprovisionará una cuenta de aplicación sin privilegios de propietario y
aplicará `GRANT INSERT, SELECT ON audit_events TO ebr_bpm_api` junto con `REVOKE
UPDATE, DELETE ON audit_events FROM ebr_bpm_api`. La API restringirá por RBAC la
lectura a `ADMIN` y `UNIVERSAL`; el permiso SQL de lectura no sustituye esa política.
