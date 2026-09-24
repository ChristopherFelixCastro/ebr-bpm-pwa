# Portal único EBR / BPM — entrega A

El host React/Vite de `apps/portal` usa un solo `BrowserRouter`, `SessionProvider`, `CoreClient` y layout. El login conserva el estilo de `web-admin`. Durante esta entrega solo están operativos Inicio, Mi cuenta, reautenticación, cierre de sesión, el registro de una petición de recuperación y el visor local cifrado de solo lectura. Las rutas de negocio permanecen protegidas y fuera del sidebar hasta migrar su pantalla y verificar su contrato con Core.

## Ejecución y despliegue

- `npm run portal:dev`: origen `http://localhost:5179` con puerto estricto. `/v1` y `/health` se envían al Core indicado por `VITE_API_PROXY_TARGET` (por defecto `http://localhost:3000`). Copiar el valor de ejemplo de `apps/portal/.env.example` solo si se necesita otro puerto; no colocar secretos en variables `VITE_`.
- En desarrollo, incluir `http://localhost:5179` en `CORS_ORIGINS` de Core. El ejemplo y el valor predeterminado lo incluyen. `refresh` y `logout` conservan la validación de origen de Core.
- En producción, servir los archivos de `apps/portal/dist` bajo una sola URL HTTPS; enviar `/v1/*` y `/health/*` al Core y devolver `index.html` para las rutas del portal. Mantener la cookie `refresh_token` HttpOnly, Secure, SameSite=Strict y su ruta `/v1/auth`. Configurar el origen HTTPS final en `CORS_ORIGINS` si Core recibe el encabezado Origin de ese host.
- La instalación PWA cubre `/`. Workbox precachea solo recursos estáticos y el shell; no hay reglas de caché de red para `/v1`, tokens, documentos ni URL firmadas. El trabajo offline de campo se guarda cifrado en IndexedDB por cuenta, fuera del service worker.

## Sesión y acceso local

El token de acceso solo existe en memoria de `CoreClient`. Al recargar, `refresh` rota la cookie y `me` restablece una cuenta `APPROVED`. Un cierre de sesión sin conexión deja un marcador local de revocación pendiente; bloquea la sesión y reintenta `logout` antes de restaurar. Ese marcador no otorga acceso.

Después de un login online de un `EVALUATOR` aprobado, el portal puede enrolar su identidad local con una clave derivada de su contraseña. Los paquetes locales se cifran con AES-GCM y se asocian al ID de la cuenta. La clave se borra de memoria al salir o recargar. Para abrir un paquete tras recargar sin red: entrar en «Trabajo de campo sin conexión», elegir la cuenta evaluadora, escribir su contraseña, abrir «Paquetes locales» y seleccionar el paquete. La prueba `offline-vault.test.ts` simula esta recarga y comprueba contraseña, propiedad y aislamiento entre cuentas. En A no hay descarga, edición ni sincronización desde el portal nuevo; el visor admite paquetes ya guardados en **este mismo origen** por la futura migración de campo.

**Requisito previo a paquetes sanitarios reales:** `offlineUntil` indica hoy un plazo nominal de 72 horas, pero está en texto claro y puede modificarse en IndexedDB. No puede ser la única autoridad del vencimiento. Antes de guardar datos sanitarios reales, incluir el vencimiento dentro del dato autenticado por AES-GCM (o aplicar un mecanismo equivalente verificable), comprobar la manipulación en una prueba y definir cómo se renueva sin perder pendientes. El visor de A no constituye autorización offline lista para producción.

Los datos IndexedDB del portal anterior en `http://localhost:5178` no son legibles desde `5179`. Mantener `5178` disponible y pedir a cada evaluador sincronizar allí sus pendientes y confirmar en Core antes de cambiar de origen. No borrar el almacenamiento ni desinstalar el PWA antiguo antes de esa confirmación. Una exportación/importación local sería un plan de contingencia posterior sujeto a un diseño de seguridad y no se implementa en A.

## Contratos pendientes antes del cierre funcional

Core debe aceptar y conservar la carta de autorización **de la cuenta** como requisito de aprobación (distinta de la carta de solicitud BPM), completar envío y restablecimiento de contraseña, y ofrecer consulta de resultados finales e informes oficiales limitada a la empresa. Hasta entonces, el registro no se envía y la recuperación se presenta solo como petición registrada; no hay enlaces empresariales a resultados inexistentes.

Siguen pendientes la bandeja de validación documental de coordinación, solicitudes para delegado, directorio acotado de evaluadores, corrección y reenvío del evaluador asignado, e interfaces para catálogos, plantillas y reglas. La membresía de empresa activa de Core determina hoy el alcance del delegado; el SDP describe establecimientos asignados y requiere una decisión/contrato posterior. `UNIVERSAL` no recibe autoría de correcciones devueltas. Ninguna pantalla futura debe usar `/v1/users` para coordinación ni datos simulados.
