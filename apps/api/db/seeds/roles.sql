INSERT INTO roles (code, name, is_universal)
VALUES
  ('ADMIN', 'Administrador', false),
  ('COMPANY_ADMIN', 'Administrador de empresa', false),
  ('DELEGATE', 'Delegado', false),
  ('COORDINATOR', 'Coordinador', false),
  ('EVALUATOR', 'Evaluador', false),
  ('UNIVERSAL', 'Acceso universal', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    is_universal = EXCLUDED.is_universal,
    updated_at = clock_timestamp();
