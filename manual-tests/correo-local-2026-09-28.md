# Correo local — 2026-09-28

Entorno: checkout de integración, `ebr_bpm_operativo`, Mailpit local. No se enviaron mensajes a Internet ni se cambiaron contraseñas de cuentas existentes.

| Paso | Esperado | Observado | Resultado |
| --- | --- | --- | --- |
| Mailpit manual | Contenedor saludable y puertos disponibles | Usuario confirmó contenedor healthy, SMTP 1025 `True`, interfaz 8025 HTTP 200 | PASS |
| Configuración Core | SMTP solo en servidor y URL del portal fija | `.env` ignorada configurada para modo `local`, loopback 1025 y portal 5181; `.env.example` documentado | PASS |
| Esquema | Enlaces y cola de correo en base operativa | `0035` y `0036` aplicadas; `db:verify` completado | PASS |
| Entrega SMTP | Mensaje de diagnóstico visible en Mailpit | SMTP confirmó entrega y la bandeja aumentó a 1 mensaje | PASS |
| Recuperación inicial | Cuenta aprobada recibe enlace sin cambiar clave | Petición HTTP 200; enlace de prueba llegó a Mailpit; no se consumió | PASS |
| Correo inexistente | Misma respuesta pública, sin envío | HTTP 200 con `requested=true`; 0 mensajes adicionales | PASS |
| Cola definitiva | Cifrar código pendiente y borrarlo tras enviar | Enlace encolado con `encrypted_token` no nulo; después estado `SENT`, `encrypted_token` nulo y un nuevo mensaje en Mailpit | PASS |
| Enlace inválido | Rechazar sin cambiar contraseña | `/v1/auth/reset-password` devolvió HTTP 400 con código inválido | PASS |
| Destinatarios de cuatro avisos | 2 institucionales para denuncia; 1 evaluador en asignación y devolución; 1 titular en aprobación | Inserciones comprobadas dentro de una transacción revertida; duplicado de asignación deduplicado | PASS |
| Typecheck y build | Código válido | Typecheck de Core y build del portal completados | PASS |
| Pruebas focalizadas | Autenticación y recuperación | 17 pruebas aprobadas en 2 archivos; no se ejecutó la suite completa | PASS |
| Restablecimiento real | Enlace de un solo uso cambia una contraseña y revoca tokens de renovación | No se usó ninguna cuenta ni se modificaron contraseñas existentes; pendiente de una cuenta de prueba autorizada | NOT_TESTED |
| Eventos reales | Cada operación de negocio emite su aviso | Hooks implementados; la selección de destinatarios pasó en transacción revertida. No se crearon denuncias, casos, inspecciones ni cuentas para probarlos | NOT_TESTED |

Core previo en puerto 3002 continuó intacto durante las pruebas; los servidores temporales 3004 y 3005 fueron detenidos. El proceso 3002 debe reiniciarse para cargar el código y las variables nuevas. Los mensajes de prueba de Mailpit pueden incluir enlaces que caducarán; no copiarlos fuera del entorno local.
