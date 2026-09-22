# EBR/BPM — mapa del avance para revisarlo con el profesor

Esto **no es un libreto de presentación**. Es una referencia rápida para tener el sistema abierto en la pizarra, entrar a la pantalla que el profesor pida y explicar con precisión qué hace, qué datos usa y qué falta.

## Qué problema resuelve el sistema

EBR/BPM organiza el proceso de inspección sanitaria de establecimientos alimentarios. Un caso se recibe y se decide en Coordinación; se asigna y programa la visita; el técnico responde la plantilla de Buenas Prácticas de Manufactura (BPM) en Campo; se calcula el riesgo y la frecuencia de inspección; luego se revisa el resultado, se emite un informe y se conserva el expediente para consulta.

## Mapa de lo que pueden abrir

| Parte | Qué representa | Qué se puede enseñar hoy | Origen actual de los datos |
|---|---|---|---|
| **Core / API** | Reglas centrales, seguridad, persistencia y contratos entre módulos. | Código de Christopher en `main`; autenticación, casos, asignaciones, agenda, inspecciones, cálculos, revisiones e informes. | PostgreSQL cuando el entorno está configurado. |
| **Coordinación** | Trabajo del coordinador antes y después de la visita. | Dashboard, casos, alertas/denuncias, decisión de un caso, asignación, programación y calendario. | Escenario de demostración en memoria; se reinicia al recargar la página. |
| **Campo / PWA** | Trabajo del técnico durante la inspección. | Login de prueba, inspecciones asignadas, descarga para offline, plantilla BPM, respuestas C/CP/IT/NA, observaciones, evidencias, progreso y cola de sincronización. | Datos semilla y almacenamiento local real en IndexedDB; autenticación y envío a la API simulados. |
| **Analítica** | Resultado de la inspección y control posterior. | Porcentaje BPM, factores y riesgo explicable, frecuencia, revisión con correcciones limitadas, metadatos de informe e histórico. | Escenarios semilla procesados por el motor real y versionado `@ebr-bpm/risk-engine`; acciones de esta pantalla en memoria. |
| **Vistas «Core en vivo»** | Primer puente de lectura entre Core y los portales. | Con API, PostgreSQL y usuario institucional: consultar casos/asignaciones/agenda desde Coordinación e inspecciones/cálculos/revisiones/informes desde Analítica. | API real; no sustituyen aún las pantallas de demostración. |

El **MVP demostrable** permite recorrer y entender estas partes. **No significa** que hoy una misma inspección viaje automáticamente por los tres portales. Los datos semilla de cada portal son independientes.

## Flujo funcional: qué significa cada paso

1. **Entrada del caso.** Puede originarse por solicitud de empresa, programación institucional, alerta LAPCH o denuncia. Coordinación recibe el expediente y decide si procede la evaluación, no procede o se remite.
2. **Asignación y agenda.** Si procede, se asigna un evaluador y se programa la visita. Las pantallas de Coordinación muestran estas operaciones con su escenario de prueba; el Core tiene rutas propias para persistirlas.
3. **Inspección en campo.** El técnico descarga un paquete y responde la plantilla BPM. `C` = cumple, `CP` = cumple parcialmente, `IT` = incumplimiento total, `NA` = no aplica. Puede agregar observaciones y evidencias. IndexedDB conserva el trabajo local y una cola registra lo pendiente de envío. La sincronización con el Core todavía no es real.
4. **Cálculo de riesgo.** El resultado combina cumplimiento BPM, riesgo del producto y factores del establecimiento. La pantalla «Cómo se calculó» enseña puntos, pesos, versiones y la frecuencia resultante. Los escenarios de Analítica usan el motor real, aunque sus entradas son de demostración.
5. **Revisión.** El coordinador puede aprobar o devolver/solicitar corrección. Cuando devuelve, debe comentar y seleccionar los ítems que el técnico podría corregir. En Analítica se demuestra esa regla; todavía no se transmite a Campo.
6. **Informe y cierre.** Tras aprobación se representa la emisión de informe y el cierre; el histórico muestra un expediente ya cerrado. La descarga de PDF está deshabilitada hasta usar Storage privado y un enlace temporal autorizado.

## Dónde navegar, según lo que pregunte el profesor

- **«Muéstrenme por dónde entra un caso»** → `http://127.0.0.1:5174/dashboard`, luego **Casos** y el detalle de uno.
- **«¿Cómo asignan o programan?»** → En Coordinación, **Asignaciones**, **Programación** o **Calendario**.
- **«¿Cómo trabaja el técnico sin conexión?»** → `http://127.0.0.1:5173/login`, entrar con cuenta de prueba, abrir **Mis evaluaciones**, descargar una inspección y enseñar respuestas y almacenamiento local. Cualquier correo/contraseña sirve *solo en este login simulado*.
- **«¿Cómo calculan el riesgo?»** → `http://127.0.0.1:5175/demo` → **Abrir resultado** de `EBR-2026-0017` → **Cómo se calculó**.
- **«¿Quién valida o corrige?»** → En `/demo`, **Probar revisión**. Enseñar comentario obligatorio y selección de ítems; no es necesario registrar una decisión si solo quiere revisar la interfaz.
- **«¿Qué pasa después?»** → En `/demo`, **Ver informes** y **Ver histórico**; el expediente cerrado de Baní ya está preparado para consulta.
- **«¿Ya se conectan con el backend?»** → Abrir **Core en vivo** en Coordinación (`http://127.0.0.1:5174/core`) o Analítica (`http://127.0.0.1:5175/core`). Solo iniciar sesión si la API y PostgreSQL están listos; de lo contrario explicar el estado real sin intentar fingir datos.

`127.0.0.1` solo funciona en la computadora que ejecuta los servidores. Conviene dejar estas pestañas abiertas antes de empezar; no hay un orden obligatorio.

## Preguntas que pueden hacerles

**¿Qué está hecho y qué es una simulación?** La API Core, sus contratos y el motor de riesgo están implementados. La PWA guarda trabajo local de verdad. Las pantallas principales todavía usan datos semilla; el login/envío de Campo y las operaciones visibles de Coordinación son simulados. Las vistas `/core` son lecturas reales únicamente cuando el entorno de la API está funcionando.

**¿Los portales comparten el mismo expediente?** Todavía no. La siguiente integración es adaptar los modelos de datos, escribir las operaciones contra la API, compartir autenticación y probar el flujo completo con un PostgreSQL sembrado.

**¿Por qué no descargan el informe?** Porque un informe oficial no debe exponerse con un enlace público improvisado. La interfaz lo deja deshabilitado hasta que Core entregue acceso temporal autorizado desde almacenamiento privado.

**¿Qué quieren validar hoy con el profesor?** Que el flujo, los estados, las reglas de corrección, el cálculo explicable y el alcance del MVP correspondan al reto; y cuál integración priorizar antes de la entrega final.

## Preparación mínima en la computadora que mostrará el avance

En la raíz del repositorio, usar la rama `integration/core-portals`. Si faltan dependencias, ejecutar `npm install`. En terminales separadas:

```bash
npm run demo:coordinator
npm run demo:field
npm run demo:analytics
```

El recorrido principal funciona sin PostgreSQL. Para enseñar las vistas «Core en vivo», se necesita además el entorno de base de datos y `.env` configurados, `npm run dev -w @ebr-bpm/api`, `http://127.0.0.1:3000/health/ready` respondiendo correctamente y un usuario institucional de prueba. No compartir contraseñas por WhatsApp.
