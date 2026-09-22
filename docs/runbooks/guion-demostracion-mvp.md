# Guion del avance EBR/BPM para la clase

## Mensaje listo para enviar al grupo

Equipo, ya tenemos una rama temporal compartida para mostrar el avance del reto: https://github.com/ChristopherFelixCastro/ebr-bpm-pwa/tree/integration/core-portals. No modifica `main`.

Para la demostración enseñaremos el flujo de negocio en tres portales: Coordinación (casos, decisiones, asignación y programación), Campo (inspección BPM con trabajo local/offline) y Analítica (cálculo de riesgo, revisión, informe e histórico). El Core de Christopher ya está en `main` con autenticación y rutas para estos procesos. En la rama temporal añadimos pantallas «Core en vivo» que leen datos reales de la API cuando hay PostgreSQL y un usuario institucional configurados.

Importante para explicar el alcance con honestidad: las pantallas principales de los tres portales todavía usan escenarios de demostración independientes. Campo guarda el trabajo local en IndexedDB, pero su autenticación y el envío al servidor siguen simulados; Coordinación y el recorrido analítico todavía no comparten una misma inspección persistida. El motor de cálculo usado por Analítica sí es el paquete real y versionado del proyecto. La descarga del informe está deshabilitada hasta integrar Storage privado y una URL autorizada. No diremos que el flujo completo entre portales está terminado.

Orden propuesto: Arismendy muestra Coordinación, Josué muestra Campo, Luis muestra Analítica y Christopher explica el Core y su panel si ya está listo. Si la API y la base están funcionando, enseñamos brevemente «Core en vivo»; si no, nos quedamos con el recorrido MVP y explicamos claramente el siguiente paso. Por favor, confirmemos antes de clase quién comparte pantalla y no enviemos credenciales por WhatsApp.

## Flujo de negocio que estamos construyendo

1. Entra un caso por solicitud, programación institucional, alerta LAPCH o denuncia.
2. Coordinación analiza si procede, asigna un técnico y programa la visita.
3. El técnico descarga la inspección y la plantilla BPM, registra respuestas y evidencias incluso sin conexión, y deja las operaciones pendientes para sincronizar.
4. El Core conserva los datos y calcula cumplimiento BPM, riesgo del producto, riesgo del establecimiento, riesgo total y frecuencia de inspección con reglas versionadas.
5. Coordinación revisa el resultado: aprueba o devuelve ítems concretos para corrección.
6. Tras la aprobación se emite el informe oficial y se cierra el expediente, que queda disponible para consulta histórica.

Este es el **flujo objetivo**. La demostración actual muestra sus partes con datos semilla separados; no se debe afirmar que ejecutar un paso en un portal actualiza automáticamente los otros.

## Guion en pantalla (6–8 minutos)

| Tiempo | Quién | Pantalla y acción | Qué explicar |
|---|---|---|---|
| 0:00–0:40 | Christopher o moderador | Introducción | Problema: priorizar inspecciones sanitarias mediante evaluación basada en riesgo y BPM. Es una revisión de avance, no la entrega final. |
| 0:40–2:00 | Arismendy | `http://127.0.0.1:5174/dashboard` → Casos → detalle de un caso → Asignaciones o Programación | Mostrar de dónde nace un caso, la decisión de Coordinación y cómo se asigna/programa. Esta interfaz opera sobre el servicio de demostración en memoria. Evitar invertir tiempo creando muchos casos. |
| 2:00–3:20 | Josué | `http://127.0.0.1:5173/login` → Mis evaluaciones → Descargar para trabajo offline → abrir inspección | Mostrar plantilla BPM, respuestas C/CP/IT/NA, observación, evidencia y progreso. Explicar que IndexedDB guarda localmente y la cola organiza el envío; el servidor de envío sigue simulado. El login de esta PWA también es simulado. |
| 3:20–5:50 | Luis | `http://127.0.0.1:5175/demo` → «Abrir resultado» | Abrir EBR-2026-0017 y expandir «Cómo se calculó»: porcentaje BPM, factores, pesos, riesgo y frecuencia. Aclarar que el escenario es semilla, pero el resultado sale del motor real `@ebr-bpm/risk-engine`. |
| 5:50–6:50 | Luis | Volver a `/demo` → «Probar revisión»; después «Ver informes» y «Ver histórico» | Mostrar devolución/corrección limitada a ítems seleccionados y comentario obligatorio. En Informes, señalar que la descarga está protegida/deshabilitada. En Histórico, mostrar el expediente cerrado de Baní. No hace falta registrar la decisión durante la exposición si el tiempo es corto. |
| 6:50–7:30 | Christopher o Luis | Opcional: `/core` en Coordinación o Analítica | Solo si `/health/ready` responde y existe un usuario institucional: comprobar conexión, iniciar sesión y mostrar lecturas reales. Si no, explicar que el adaptador está integrado y probado por contrato, pero falta verificarlo contra la base del equipo. |
| 7:30–8:00 | Moderador | Cierre | Lo desarrollado, lo que falta y la pregunta concreta al profesor: prioridad de integración/corrección antes de la entrega final. |

Las URLs `127.0.0.1` funcionan **solo en la computadora que ejecuta los servidores**; no son enlaces públicos para abrir desde otro equipo.

## Si solo nos dan 3 minutos

Abrir directamente `http://127.0.0.1:5175/demo`. Enseñar el resultado EBR-2026-0017 y «Cómo se calculó», luego la pantalla de revisión y el histórico. Mencionar en una frase que Coordinación y Campo ya tienen interfaces demostrables y que el Core está en `main`. No intentar levantar PostgreSQL durante la exposición.

## Preparación antes de compartir pantalla

1. En la computadora del presentador, usar la rama `integration/core-portals` y ejecutar `npm install` si faltan dependencias.
2. Abrir tres terminales en la raíz del repositorio y ejecutar `npm run demo:coordinator`, `npm run demo:field` y `npm run demo:analytics`.
3. Abrir las tres URLs del guion antes de empezar y verificar que carguen. Dejar Analítica en `/demo`.
4. Si se quiere mostrar información real del Core, configurar PostgreSQL y `.env` según `docs/runbooks/development-deployment.md`, ejecutar `npm run dev -w @ebr-bpm/api` y confirmar `http://127.0.0.1:3000/health/ready`. Usar una cuenta institucional de prueba sin publicar su contraseña.
5. No depender de la conexión real para la demostración principal. El recorrido MVP funciona con sus datos semilla.

## Respuestas cortas para preguntas del profesor

- **¿Qué está realmente implementado?** Core HTTP y contratos, interfaces de los tres portales, almacenamiento local en Campo, motor versionado de riesgo y revisión/estado de informe demostrables en Analítica. Las pruebas y la compilación de la rama pasaron.
- **¿Qué es simulado?** Los escenarios de las pantallas principales, el login y envío de Campo, y las operaciones de Coordinación. La vista `/core` sí consulta la API real cuando existe un entorno con base de datos.
- **¿Se sincronizan ya los tres portales?** No. Ese es el principal trabajo de integración restante: adaptar DTO y acciones de escritura, usar autenticación compartida y probar un expediente de extremo a extremo con PostgreSQL.
- **¿El PDF oficial se puede descargar?** Todavía no desde Analítica. La descarga está intencionalmente deshabilitada hasta tener Storage privado y una URL temporal autorizada.
- **¿Qué queremos que nos corrija hoy?** Si el flujo, los estados, la selección de ítems corregibles y el cálculo explicable satisfacen el alcance esperado; y qué integración considera prioritaria para la entrega final.
