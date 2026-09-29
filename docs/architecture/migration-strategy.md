# Estrategia de migraciones SQL versionadas

## Regla de fuente de verdad

Las migraciones y semillas SQL versionadas en este repositorio son la única fuente
de verdad del esquema. No se diseñará ni modificará manualmente el esquema en
Supabase. Primero se valida una base PostgreSQL local vacía; después se aplica la
misma secuencia sin cambios a Supabase de desarrollo.

## Estructura propuesta

```text
apps/api/db/
  migrations/
    0001_extensions_and_base.sql
    0002_identity.sql
    ...
  seeds/
    0001_roles.sql
    0002_published_catalogs.sql
    0003_demo_data.sql
  tests/
    migration-smoke.sql
    constraints.sql
    calculations.sql
    concurrency.sql
```

Cada migración será inmutable después de integrarse. Las correcciones posteriores
se realizan en una nueva migración. Las semillas de catálogo aprobado se separan de
los datos demostrativos; las segundas deben poder omitirse.

## Orden planificado

1. Extensiones, UUID, dominios/enums, funciones de timestamps y base de auditoría.
2. Roles, usuarios, refresh tokens y carta de autorización.
3. Empresas, establecimientos, perfiles operativos, contactos y relaciones.
4. Versionado e importación de catálogo de alimentos.
5. Plantilla BPM versionada e ítems jerárquicos.
6. Reglas de riesgo, factores, opciones y rangos de frecuencia.
7. Solicitudes, documentos, casos, alertas y denuncias.
8. Inspecciones, asignaciones, cambios de estado y alimentos confirmados.
9. Respuestas BPM, evidencias, revisiones, cálculos e informes/cierre.
10. Índices, restricciones parciales, triggers de auditoría, evidencia activa y
    concurrencia offline.
11. Semillas aprobadas y datos de demostración opcionales.

## Validación obligatoria

1. Crear una base PostgreSQL local vacía y ejecutar todas las migraciones.
2. Ejecutar semillas aprobadas y pruebas de restricciones, índices, triggers,
   cálculo, auditoría, versiones e idempotencia/concurrencia.
3. Crear una segunda base vacía y repetir la instalación completa.
4. Comparar el resultado esperado de ambas instalaciones y corregir únicamente con
   nuevas migraciones versionadas.
5. Tras estabilizar el esquema local, crear Supabase de desarrollo y aplicar la
   misma herramienta y la misma cadena de migraciones.

La CI debe ejecutar este flujo contra PostgreSQL efímero antes de aceptar cambios a
`main`.
