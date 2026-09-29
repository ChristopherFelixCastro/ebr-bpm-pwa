# Portal único EBR / BPM

El host React/Vite de `apps/portal` usa un solo `BrowserRouter`, `SessionProvider`, `CoreClient` y layout. Reúne las entregas:

- **A** acceso: inicio de sesión, Mi cuenta, reautenticación, cierre de sesión y visor local cifrado.
- **B** directorio empresarial (empresas, establecimientos, perfiles, contactos), solicitudes BPM y validación documental.
- **C** casos de los cuatro orígenes, asignaciones y agenda.
- **D** inspección de campo: formulario BPM, riesgo, evidencias y trabajo offline cifrado (ver `FIELD_OFFLINE.md`).
- **E** evaluación, revisión, corrección, informes e histórico (ver `EVALUATION.md`).
- **F** configuración: Usuarios con carta de autorización de la cuenta, Catálogos, Plantillas BPM y Reglas de riesgo; registro público con carta.

Cada entrada del sidebar se activa solo cuando su pantalla y su guard de URL directa funcionan (`src/access/capabilities.ts`). Los permisos de Core prevalecen: ocultar un botón no es un control de seguridad.

## Ejecución y despliegue

- `npm run portal:dev`: origen `http://localhost:5179` con puerto estricto. `/v1` y `/health` se envían al Core indicado por `VITE_API_PROXY_TARGET` (por defecto `http://localhost:3000`). Copiar el valor de ejemplo de `apps/portal/.env.example` solo si se necesita otro puerto; no colocar secretos en variables `VITE_`.
- En desarrollo, incluir `http://localhost:5179` en `CORS_ORIGINS` de Core. El ejemplo y el valor predeterminado lo incluyen. `refresh` y `logout` conservan la validación de origen de Core.
- En producción, servir los archivos de `apps/portal/dist` bajo una sola URL HTTPS; enviar `/v1/*` y `/health/*` al Core y devolver `index.html` para las rutas del portal. Mantener la cookie `refresh_token` HttpOnly, Secure, SameSite=Strict y su ruta `/v1/auth`. Configurar el origen HTTPS final en `CORS_ORIGINS` si Core recibe el encabezado Origin de ese host.
- La instalación PWA cubre `/`. Workbox precachea solo recursos estáticos y el shell; no hay reglas de caché de red para `/v1`, tokens, documentos ni URL firmadas. El trabajo offline de campo se guarda cifrado en IndexedDB por cuenta, fuera del service worker.

## Sesión y acceso local

El token de acceso solo existe en memoria de `CoreClient`. Al recargar, `refresh` rota la cookie y `me` restablece una cuenta `APPROVED`. Un cierre de sesión sin conexión deja un marcador local de revocación pendiente; bloquea la sesión y reintenta `logout` antes de restaurar. Ese marcador no otorga acceso.

Después de un login online de un `EVALUATOR` aprobado, el portal puede enrolar su identidad local con una clave derivada de su contraseña. Los paquetes locales se cifran con AES-GCM y se asocian al ID de la cuenta. La clave se borra de memoria al salir o recargar. Para abrir un paquete tras recargar sin red: entrar en «Trabajo de campo sin conexión», elegir la cuenta evaluadora, escribir su contraseña, abrir «Paquetes locales» y seleccionar el paquete. La prueba `offline-vault.test.ts` simula esta recarga y comprueba contraseña, propiedad y aislamiento entre cuentas. La descarga, edición, sincronización y renovación de paquetes se describen en `FIELD_OFFLINE.md`; el visor abre paquetes guardados en **este mismo origen**.

**Vencimiento offline:** el plazo del paquete (hasta 72 horas) está dentro del permiso Ed25519 emitido por Core y verificado junto con el hash del paquete (`src/offline/permit.ts`); `field-permit.test.ts` y `field-expiry-ui.test.tsx` comprueban la manipulación y el sellado al vencer. El reloj local sigue siendo un indicio: la revocación se comprueba al reconectar.

Los datos IndexedDB del portal anterior en `http://localhost:5178` no son legibles desde `5179`. Mantener `5178` disponible y pedir a cada evaluador sincronizar allí sus pendientes y confirmar en Core antes de cambiar de origen. No borrar el almacenamiento ni desinstalar el PWA antiguo antes de esa confirmación. Una exportación/importación local sería un plan de contingencia posterior sujeto a un diseño de seguridad y no se implementa en A.

## Usuarios y carta de autorización de la cuenta (F)

- Usuarios (`ADMIN`, `UNIVERSAL`): lista paginada en Core con total, búsqueda y filtros; detalle con edición versionada, aprobación/reactivación, rechazo y desactivación con reautenticación. `ADMIN` no ve cuentas `UNIVERSAL` (Core las excluye de resultados y totales y responde 404 por ID).
- La carta de autorización de la **cuenta** es distinta de la carta de una **solicitud BPM**. PDF, JPG o PNG de hasta 5 MB. La aprobación permanece indisponible hasta que Core confirme una carta `VALID`; Core lo comprueba dentro de la operación y un trigger de base de datos impide la transición a `APPROVED` sin ella (migración `0034`).
- El registro público envía la carta en `multipart/form-data`, deja la cuenta en `PENDING_VALIDATION` y no abre sesión. La administración vincula la empresa durante la validación.
- Configuración versionada (`ADMIN`, `UNIVERSAL` escriben; `COORDINATOR` consulta, previsualiza y valida): catálogos, plantillas BPM en jerarquía Sección → Subsección → Grupo → Criterio con instrucciones, y reglas de riesgo con seis factores, productos y rangos. Publicar, retirar y cambiar la predeterminada exigen reautenticación y versión; una nueva predeterminada solo afecta inspecciones nuevas.

## Pendientes fuera de F

- Envío y restablecimiento **real** de contraseña: «¿Olvidó su contraseña?» solo registra la petición.
- Consulta de resultados finales e informes oficiales acotada a la empresa: no existe contrato en Core.
- Identificación de la empresa en el registro público: no hay consulta pública de empresas; la vincula la administración.
- Inventario y retiro de la PWA anterior en `5178` por dispositivo/perfil/cuenta (ver arriba).
- Solicitudes para delegado acotadas a establecimientos asignados: el SDP describe establecimientos asignados; hoy la membresía de empresa activa determina el alcance.
- Ninguna pantalla debe usar `/v1/users` para coordinación ni datos simulados.
