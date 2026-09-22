# PostgreSQL local, Supabase Development y Render

## PostgreSQL local

Use `.env.example`, cambie las credenciales locales y ejecute:

```bash
docker compose up -d
npm ci
npm run db:migrate
npm run db:verify
```

Las migraciones versionadas en Git son la fuente de verdad. No replique cambios manuales desde el panel de Supabase.

## Supabase Development

- `MIGRATION_DATABASE_URL`: conexión directa de PostgreSQL para migraciones y verificación.
- `DATABASE_URL`: conexión de la API. Para un backend persistente use directa cuando la red soporte IPv6/IPv4 add-on; en una red solo IPv4 use el pooler compartido en modo sesión. No use transaction mode para el runner de migraciones.
- Active TLS según la cadena suministrada por el panel y configure `ALLOW_REMOTE_DATABASE=true` y `DATABASE_ENV=supabase-development` solo en el trabajo controlado de migración.

Supabase recomienda conexión directa para migraciones, `pg_dump`, backup y restore; el pooler de sesión es la alternativa para backends persistentes en redes IPv4. Consulte [Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) y [Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

Storage debe contener un bucket privado llamado `ebr-bpm-private`, sin políticas públicas. Límite de aplicación: 5 MB. MIME permitidos: `application/pdf`, `image/jpeg`, `image/png`. La service-role key existe solo como secreto del backend.

## Render Development/Preview

Configuración sugerida del Web Service desde la raíz del repositorio:

- Build: `npm ci`
- Pre-deploy: `npm run db:migrate && npm run db:verify`
- Start: `npm run start --workspace @ebr-bpm/api`
- Healthcheck: `/health/ready`
- Runtime: Node.js 20 o posterior

Render documenta el pre-deploy para migraciones y el healthcheck HTTP para aceptar una instancia nueva: [Deploy steps](https://render.com/docs/deploys) y [Health checks](https://render.com/docs/health-checks).

Variables mínimas: `NODE_ENV=production`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `DATABASE_ENV`, `ALLOW_REMOTE_DATABASE=true`, `JWT_ACCESS_SECRET`, `CORS_ORIGINS`, `OPENAPI_DOCS_ENABLED`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET_PRIVATE=ebr-bpm-private` y `PDF_CHROMIUM_EXECUTABLE_PATH`. Mantenga secretos únicamente en Render. Para Preview use proyectos/credenciales de desarrollo separados.

OpenAPI queda disponible solo cuando `OPENAPI_DOCS_ENABLED=true`. Los endpoints `/health/live` y `/health/ready` no exponen configuración.

## Operación y fallos

1. Si una migración falla, Render no debe iniciar la revisión nueva; conserve la instancia anterior y revise el error sanitizado.
2. No edite una migración aplicada. Cree la siguiente migración Git-first.
3. Si Storage falla, verifique bucket privado, MIME y límite; no haga público el bucket.
4. Para rotar secretos, actualice Render/Supabase, reinicie la API y revoque el valor anterior. Nunca copie cadenas reales a incidencias o Git.
