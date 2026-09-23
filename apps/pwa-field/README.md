# PWA de campo EBR/BPM

Aplicación React/Vite de Josué integrada al Core. Permite al evaluador asignado (o rol UNIVERSAL) descargar un paquete versionado de inspección, responder criterios BPM, elegir factores y productos de riesgo, adjuntar evidencias privadas y registrar ubicación opcional. Los cambios se guardan primero en IndexedDB y se envían en orden al Core cuando hay conexión y sesión vigente.

## Ejecución local

Desde la raíz del repositorio:

```powershell
npm install
npm run dev --workspace @ebr-bpm/api
```

En otra terminal:

```powershell
npm run field:dev
```

Abrir `http://localhost:5178`. Vite exige ese puerto y solo proxifica `/v1` y `/health` a `http://localhost:3000`. La base local debe tener las migraciones hasta `0033` y el Core necesita una versión BPM y una versión de riesgo publicadas como predeterminadas para crear inspecciones nuevas.

## Uso y sincronización

1. Inicia sesión online con un usuario `EVALUATOR` asignado o `UNIVERSAL`.
2. En “Mis evaluaciones”, crea la inspección de un caso asignado si aún no existe y pulsa “Descargar para trabajo offline”. No se puede crear ni descargar por primera vez sin conexión.
3. Completa los criterios `C/CP/IT/NA`, los seis factores y al menos un producto alimentario aplicable. Las instrucciones auxiliares de la guía BPM se muestran junto al criterio, pero no se responden por separado.
4. Opcionalmente registra ubicación con consentimiento y agrega evidencias generales o vinculadas a un criterio. Cada archivo tiene límite de 5 MB; máximo 10 evidencias activas por inspección.
5. “Finalizar localmente y preparar envío” bloquea nuevos cambios en el dispositivo y encola `FINALIZE` y `SUBMIT`. No equivale a envío confirmado: el estado debe llegar a `SUBMITTED` en el Core.
6. Al volver la conexión, la PWA sincroniza automáticamente o mediante “Sincronizar ahora”. Errores de versión/conflicto no se fusionan automáticamente: conserva el trabajo local y requiere revisión.

La sesión usa el Core `/v1/auth/*`; el access token queda solo en memoria. IndexedDB guarda el trabajo offline en el dispositivo y la identidad del último usuario se conserva para reabrirlo sin conexión. Utiliza dispositivos protegidos, no compartidos; cerrar sesión elimina la identidad local, pero **no** borra las inspecciones ni evidencias pendientes.

Los binarios se guardan localmente hasta su carga por multipart; Supabase debe tener el bucket privado configurado para `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `video/mp4` y `video/webm`. El Core mantiene las reglas de MIME, extensión, firma binaria, límite de tamaño y cantidad.

## Verificación focalizada

```powershell
npm run typecheck --workspace @ebr-bpm/pwa-field
npm run test --workspace @ebr-bpm/pwa-field
npm run build --workspace @ebr-bpm/pwa-field
```
