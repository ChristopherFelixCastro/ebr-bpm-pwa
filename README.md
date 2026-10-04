<div align="center">
  <img src="apps/portal/public/sira-imagotipo.jpeg" alt="SIRA Tech" width="280" />

  # SIRA Tech

  **Sistema de Inspección y Riesgo Alimentario**

  Plataforma web para gestionar inspecciones de Buenas Prácticas de Manufactura (BPM) y evaluaciones basadas en riesgo (EBR), desde el origen del caso hasta su revisión, informe y cierre.
</div>

## Descripción

SIRA Tech reúne en un solo portal la gestión de empresas y establecimientos, solicitudes sanitarias, denuncias, programas institucionales y alertas LAPCH. Los casos pueden asignarse y agendarse para que el evaluador realice la inspección de campo. El coordinador revisa los resultados y la institución genera los informes correspondientes.

La inspección puede continuar cuando se pierde la conexión: el portal conserva el trabajo cifrado en el dispositivo y sincroniza las operaciones pendientes al recuperarla. Las plantillas BPM, los catálogos de productos y las reglas EBR se administran por versiones para mantener la trazabilidad de cada evaluación.

## Funcionalidades principales

| Área | Funcionalidades |
| --- | --- |
| Acceso y cuentas | Inicio de sesión, recuperación de contraseña, roles institucionales y empresariales, registro de cuentas empresariales y validación documental. |
| Directorio | Empresas, establecimientos, perfiles operativos y contactos vinculados. |
| Origen de casos | Solicitudes BPM, denuncias públicas anónimas o con contacto voluntario, programas institucionales y alertas LAPCH. |
| Operación sanitaria | Asignación de evaluadores, agenda e historial del caso. |
| Inspección de campo | Formulario BPM, productos de riesgo, factores EBR, evidencias privadas, ubicación opcional y progreso de captura. |
| Trabajo sin conexión | Paquetes firmados, almacenamiento local cifrado en IndexedDB y sincronización automática al volver la conexión. |
| Evaluación y cierre | Cálculo de riesgo y frecuencia, revisión institucional, devoluciones para corrección, borradores PDF, informes oficiales e histórico. |
| Configuración | Catálogos, plantillas BPM y reglas de riesgo versionadas, con publicación y selección de versiones predeterminadas. |

## Tecnologías y arquitectura

| Componente | Tecnologías |
| --- | --- |
| Portal web y PWA | React, TypeScript, Vite, Material UI, Dexie e IndexedDB. |
| API | Node.js, TypeScript, Express, contrato OpenAPI y autenticación con tokens y cookies seguras. |
| Datos | PostgreSQL 16, migraciones SQL versionadas y Docker Compose para desarrollo local. |
| Archivos | Bucket privado de Supabase Storage para evidencias e informes; almacenamiento local de desarrollo opcional. |
| Informes y correo | Generación de PDF con Chrome/Edge; SMTP para recuperación de contraseña y avisos, con Mailpit para pruebas locales. |

```text
apps/portal  ──►  apps/api  ──►  PostgreSQL
     │                │
     │                ├──────► Supabase Storage privado
     │                └──────► SMTP / Mailpit
     └──────► IndexedDB cifrado (trabajo de campo sin conexión)
```

El portal consume la API; las credenciales de PostgreSQL y la clave de servicio de Supabase permanecen en el servidor. Las rutas `/v1` y `/health` se redirigen a la API durante el desarrollo local.

## Estructura del repositorio

```text
apps/
  api/             API, migraciones y lógica institucional
  portal/          Portal unificado y PWA de campo
packages/
  core-client/     Cliente compartido de la API
docs/
  architecture/    Documentación de arquitectura
  runbooks/        Instalación, operación e importaciones oficiales
```

El repositorio conserva aplicaciones anteriores en `apps/` por trazabilidad; **`apps/portal` es la interfaz unificada vigente**.

## Puesta en marcha local

**Requisitos:** Node.js 24, npm, Docker Desktop con PostgreSQL 16 y Chrome o Edge para generar informes PDF.

En PowerShell, desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
Copy-Item apps/portal/.env.example apps/portal/.env
npm ci
```

Antes de iniciar, configure `.env` y `apps/portal/.env`:

1. Establezca una contraseña local para PostgreSQL y actualice `DATABASE_URL` para que coincida. Si el puerto `54329` está reservado u ocupado en su equipo, cambie `POSTGRES_PORT` y los puertos de las URL de base de datos al mismo puerto disponible.
2. Defina `JWT_ACCESS_SECRET` y genere un par Ed25519. Guarde la clave privada en `OFFLINE_PERMIT_PRIVATE_KEY_BASE64` de la raíz y **la clave pública del mismo par** en `VITE_OFFLINE_PERMIT_PUBLIC_KEY_BASE64` del portal. Una clave pública vacía impide preparar inspecciones aunque la API responda correctamente.
3. Para evidencias en desarrollo local, establezca `LOCAL_PRIVATE_STORAGE_ENABLED=true` y deje vacías las variables de Supabase Storage. Para usar Supabase, configure el proyecto, la clave de servicio **solo en la API** y el bucket privado `ebr-bpm-private`.
4. Para probar correos, configure Mailpit siguiendo [la guía de correo local](docs/runbooks/correo-local.md); `MAIL_MODE=disabled` permite iniciar sin SMTP.

La [guía de instalación y despliegue](docs/runbooks/development-deployment.md) amplía la configuración de PostgreSQL y Supabase. Nunca publique los archivos `.env` ni credenciales en Git.

Con la configuración lista:

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:verify
npm run db:seed -- roles.sql
```

En dos terminales independientes, desde la raíz del repositorio:

```powershell
npm run dev --workspace @ebr-bpm/api
```

```powershell
npm run portal:dev
```

Abra **http://localhost:5179**. La API escucha en **http://localhost:3000**. Para crear el primer usuario institucional y cargar las definiciones oficiales, consulte [bootstrap e importaciones oficiales](docs/runbooks/official-imports.md).

> Una base nueva contiene el esquema, pero no los datos operativos ni versiones publicadas de plantillas, catálogo y reglas EBR. Esas definiciones deben importarse, revisarse y publicarse antes de iniciar inspecciones completas. Tampoco se incluyen credenciales, evidencias privadas ni información de una instalación existente.

## Verificación

```powershell
npm run db:verify
npm run portal:build
npm run portal:test -- --maxWorkers=1
npm run typecheck --workspace @ebr-bpm/api
```

## Documentación

- [Portal unificado](apps/portal/README.md)
- [Trabajo de campo sin conexión](apps/portal/FIELD_OFFLINE.md)
- [Evaluación e informes](apps/portal/EVALUATION.md)
- [Importación de plantillas BPM y reglas EBR](docs/runbooks/official-imports.md)
- [Base de datos y diagrama](docs/DIAGRAMA_BASE_DATOS.md)

## Seguridad y datos

La autorización se valida en la API; la visibilidad de opciones en el portal no sustituye estos controles. Las evidencias e informes se almacenan de forma privada, y los paquetes de campo se vinculan al evaluador y se guardan cifrados en su dispositivo. El repositorio no debe contener secretos ni datos personales reales.
