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

## Regla de alcance

Esta rama integra estructura, dependencias, compilación y recorrido visual. No afirma que los clientes ya consuman el Core. Esa conexión requiere acordar los DTO del OpenAPI, autenticación compartida y datos sembrados en un entorno común.

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
