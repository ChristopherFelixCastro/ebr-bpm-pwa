# EBR/BPM PWA

Sistema web progresivo para gestionar Evaluaciones Basadas en Riesgo (EBR) y Buenas Prácticas de Manufactura (BPM), desde la solicitud hasta el cierre del expediente.

## Arquitectura

- Clientes: React + TypeScript.
- API: Node.js + TypeScript + Express.
- Datos y archivos: PostgreSQL y Storage en Supabase.
- Hosting de la API: Render Free.
- Contrato: OpenAPI, publicado por la API y consumido por todos los clientes.

## Estructura

```text
apps/
  api/                 API Core - Christopher
  web-admin/           Portal administrativo - Ivan
  web-coordinator/     Portal de coordinacion - Arismendy
  pwa-field/           PWA de campo - Josue
  web-analytics/       Riesgo, informes y cierre - Luis
packages/
  api-contract/        Especificacion OpenAPI y tipos compartidos
  risk-engine/         Reglas de calculo versionadas
docs/
  architecture/        Decisiones y diagramas tecnicos
  runbooks/            Despliegue, recuperacion y operacion
```

## Reglas de colaboracion

1. Ningun cliente accede directamente a PostgreSQL ni a Storage con privilegios administrativos.
2. Todo cambio de API empieza por OpenAPI y se revisa antes de implementarse.
3. No se suben secretos, archivos `.env`, credenciales ni evidencias reales al repositorio.
4. Todo cambio llega por pull request y debe pasar las validaciones automáticas.
5. La rama `main` siempre debe quedar desplegable.

## Inicio local

La configuracion inicial de cada aplicacion se documentara en su carpeta. Antes de ejecutar cualquier servicio, copie el archivo de ejemplo de variables de entorno correspondiente y complete solo sus valores locales.

## Rama de integración del MVP

La rama `integration/mvp-demo` reúne temporalmente el Core y los módulos demostrables sin sustituir el flujo de pull requests hacia `main`.

La rama `integration/core-portals` añade pantallas de conexión directa al Core en Coordinación (`/core`) y Analítica (`/core`). Véase [integración MVP](docs/runbooks/integracion-mvp.md) para preparar la API y conocer el alcance.

```bash
npm install --ignore-scripts
npm run validate
npm run demo:field        # PWA de campo: http://127.0.0.1:5173
npm run demo:coordinator  # Coordinación:  http://127.0.0.1:5174
npm run demo:analytics    # Analítica:     http://127.0.0.1:5175/demo
```

`demo:analytics` compila automáticamente `@ebr-bpm/risk-engine` antes de iniciar Vite; en una clonación nueva no hace falta generar `packages/risk-engine/dist` manualmente. Si el servidor ya estaba abierto antes de actualizar la rama, deténgalo con `Ctrl+C` y vuelva a ejecutar el comando.

Los clientes todavía operan con servicios de demostración aislados. La integración real con autenticación, OpenAPI y PostgreSQL se hará después de estabilizar los workspaces y preservar un recorrido ejecutable para la presentación.

`npm run validate` no requiere base de datos. Para comprobar también las pruebas de integración del Core, configure PostgreSQL y ejecute `npm run test:api:db`.
