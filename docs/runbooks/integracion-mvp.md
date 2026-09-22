# Integración temporal del MVP

## Objetivo

Reunir el trabajo ya desarrollado en una rama segura y demostrable, sin modificar `main` ni bloquear la integración administrativa del Core.

## Contenido

| Workspace | Responsable | Puerto de demostración | Estado de datos |
|---|---|---:|---|
| `@ebr-bpm/api` | Christopher | 3000 | PostgreSQL/Supabase según entorno |
| `@ebr-bpm/pwa-field` | Josué | 5173 | API y autenticación simuladas; IndexedDB real |
| `@ebr-bpm/web-coordinator` | Arismendy | 5174 | Servicio de demostración en memoria |
| `@ebr-bpm/web-analytics` | Luis | 5175 | Servicio de demostración en memoria; motor real |

## Conexión temporal con el Core

La rama `integration/core-portals` parte de `integration/mvp-demo`. En Coordinación se añadió `/core` y en Analítica también `/core`. Ambas pantallas usan `@ebr-bpm/core-client` para consultar las rutas reales de `apps/api`:

- Coordinación: `/v1/cases`, `/v1/assignments` y `/v1/schedules`.
- Analítica: `/v1/inspections` y, por inspección, `/work-package`, `/calculations/current`, `/reviews` y `/reports`.
- Ambas: `/health/ready`, `/v1/auth/login` y `/v1/auth/me`.

La URL por defecto es `http://127.0.0.1:3000`. Puede configurarse en la pantalla o con `VITE_CORE_API_URL` al arrancar cada cliente. El token de acceso permanece en memoria de la pestaña y se descarta al recargar o desconectar. Las pantallas existentes de demostración siguen usando sus datos semilla; la nueva pantalla indica claramente cuándo está conectada al Core.

Para mostrar datos reales, prepare PostgreSQL, aplique migraciones y cree un usuario institucional siguiendo `docs/runbooks/development-deployment.md`. El archivo `.env.example` ya contempla los puertos 5174 y 5175 en CORS. Después ejecute:

```bash
npm run dev -w @ebr-bpm/api
npm run demo:coordinator
npm run demo:analytics
```

Primero compruebe `/health/ready` de la API; `/health/live` solo confirma que el proceso responde. La conexión HTTP está implementada y probada con respuestas de contrato; en esta máquina no había `.env` ni PostgreSQL disponible, así que la consulta contra una base real sigue pendiente de verificación con el entorno del equipo.

## Regla de alcance

Esta rama integra estructura, dependencias, compilación y recorrido visual. Las vistas `/core` consultan la API real cuando está disponible. La sustitución de los servicios simulados de las pantallas existentes requiere terminar la adaptación de DTO, las acciones de escritura, la autenticación compartida y un entorno con datos sembrados.

## Verificación

```bash
npm install --ignore-scripts
npm run validate
```

La validación raíz compila y prueba los paquetes compartidos, comprueba el tipado del API, ejecuta sus pruebas locales sin infraestructura y valida cada cliente incluido.

Las pruebas de integración completas del Core necesitan un PostgreSQL preparado y la variable `DATABASE_URL`. Con ese entorno activo se ejecutan por separado:

```bash
npm run test:api:db
```

Esta separación evita confundir la ausencia de infraestructura local con una regresión del código.

## Incorporación de Administración

Cuando Christopher termine su integración:

1. traer exclusivamente `apps/web-admin` desde su rama estable;
2. confirmar que el paquete se llame `@ebr-bpm/web-admin`;
3. añadir `demo:admin` y su `validate` a la raíz;
4. regenerar `package-lock.json` una sola vez;
5. ejecutar `npm run validate` antes de cualquier PR.
