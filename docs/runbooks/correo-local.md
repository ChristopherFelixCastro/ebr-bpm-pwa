# Correo local con Mailpit

Esta instalación usa Mailpit para **capturar** mensajes en la computadora. No envía correos a buzones externos. PostgreSQL sigue siendo local y Supabase solo almacena archivos privados; ninguno de los dos envía estos mensajes.

## Estado y configuración

- Core lee `.env` en la raíz del checkout. Las claves de correo se documentan en `.env.example`; la `.env` real está ignorada por Git.
- El checkout de integración local usa `MAIL_MODE=local`, SMTP en `127.0.0.1:1025`, remitente `no-reply@ebr-bpm.local` y `APP_PUBLIC_URL=http://localhost:5181`.
- Mailpit se abrió manualmente como contenedor `ebr-bpm-mailpit` con interfaz en `http://localhost:8025`.
- Las migraciones `0035` y `0036` crean enlaces de recuperación y cola de alertas en `ebr_bpm_operativo`.
- El navegador **no** recibe credenciales SMTP. Nunca añada esas claves a variables `VITE_`.

## Arranque manual

Con Docker Desktop abierto, ejecutar `docker start ebr-bpm-mailpit` si el contenedor está detenido. Se puede verificar con `docker ps --filter 'name=ebr-bpm-mailpit'`, `Test-NetConnection 127.0.0.1 -Port 1025` y `http://localhost:8025`.

En una ventana de PowerShell, desde el checkout `ebr-bpm-pwa-web-admin-integration`, ejecutar `$env:PORT='3002'; npm run start --workspace @ebr-bpm/api`. En otra, ejecutar `$env:VITE_API_PROXY_TARGET='http://localhost:3002'; npm run dev --workspace @ebr-bpm/portal -- --port 5181`. Si Core ya está escuchando en 3002, hay que reiniciarlo para cargar cambios de código y `.env`; un proceso anterior no actualiza su configuración automáticamente.

## Recuperación

En `/recuperar-clave`, la respuesta es igual para un correo existente o inexistente. Una cuenta aprobada puede solicitar hasta cinco enlaces por hora, con dos minutos entre solicitudes. Cada enlace caduca a los treinta minutos y sirve una sola vez. Core guarda el hash del código y, mientras espera el envío, una copia cifrada en la cola. Tras enviarlo o descartarlo, elimina la copia cifrada. Al cambiar la contraseña, revoca los tokens de renovación y envía un aviso de cambio. Los tokens de acceso emitidos antes pueden seguir funcionando hasta su expiración normal (configurada en quince minutos).

En Mailpit, abra el mensaje de recuperación solo para la prueba manual. **No copie enlaces ni códigos al chat ni a registros.** La contraseña anterior no cambia por solicitar el enlace: solo cambia al confirmar una nueva en `/restablecer-clave`.

## Avisos automáticos

| Suceso | Destino |
| --- | --- |
| Denuncia pública o institucional creada | Cuentas aprobadas con rol Administrador o Universal |
| Asignación o reasignación | Evaluador nuevo |
| Inspección devuelta | Evaluador responsable |
| Cuenta aprobada | Titular de la cuenta |
| Contraseña cambiada | Titular de la cuenta |

Los avisos se registran en la misma transacción que la acción y se envían después. Si SMTP falla, la operación de negocio permanece guardada y Core reintenta. El mensaje contiene un enlace al portal y una descripción breve; no incluye detalles de la denuncia, contraseñas ni cartas.

## Antes del envío real

Obtener y verificar un dominio/remitente, configurar un proveedor SMTP con TLS, cambiar `MAIL_MODE` a `smtp`, completar host, puerto y credenciales solo en el entorno de Core, y poner una URL pública HTTPS en `APP_PUBLIC_URL`. No se debe cambiar solo el destinatario SMTP manteniendo los enlaces `localhost`.
