# Propuesta de tipos de solicitud BPM/EBR

**Estado:** propuesta funcional para revisión; no es una lista de trámites aprobada por una autoridad sanitaria. **Alcance:** inspecciones de establecimientos de alimentos y bebidas en el sistema EBR/BPM actual. No incluye registro sanitario de productos, permisos, licencias ni emisión de certificados. El portal local de prueba ya muestra estos tres tipos como sugerencias y permite «Otro (especificar)»; Core sigue aceptando texto libre.

## 1. Distinción principal

Una **solicitud de empresa** es una petición que presenta el Administrador de empresa o el Delegado. Al enviarse, produce un caso de origen «Solicitud de empresa». Un **programa institucional**, una **alerta** y una **denuncia** ya son otros orígenes de caso: no deben aparecer como tipos elegibles de solicitud empresarial. La **corrección** de una inspección devuelta es una fase del mismo expediente, no una solicitud nueva.

La lista pública del MSP para «Inspección de Buenas Prácticas» distingue nueva inspección y reinspección, pero esa página se refiere específicamente a laboratorios y distribuidoras de medicamentos y productos afines. Se usa como referencia conceptual, no como base para afirmar que estos sean los nombres oficiales de un trámite alimentario. DIGEMAPS publica otros servicios de registro sanitario de alimentos y bebidas; esos trámites quedan fuera de este módulo.

Fuentes: [Inspección de Buenas Prácticas, MSP](https://msp.gob.do/web/?page_id=5690) y [Registro Sanitario de Alimentos y Bebidas Pre-Envasadas, DIGEMAPS](https://digemaps.gob.do/registro-sanitario-de-alimentos-y-bebidas-pre-envasadas/).

## 2. Tipos propuestos para solicitudes presentadas por empresas

| Código interno propuesto | Nombre visible | Cuándo se usa | Vínculo con expediente previo |
| --- | --- | --- | --- |
| `INITIAL_BPM_EBR` | Evaluación inicial BPM/EBR | El establecimiento solicita su primera inspección dentro de este sistema. | No se exige un informe previo. |
| `FOLLOW_UP_BPM_EBR` | Reinspección de seguimiento | Existe una inspección anterior y se solicita verificar acciones posteriores o una nueva visita. | Exigir referencia a la inspección/informe anterior y motivo. No sustituye la corrección BPM dentro de una revisión aún abierta. |
| `CHANGE_BPM_EBR` | Evaluación por cambio relevante | La empresa cambió proceso, instalaciones, línea de producción o actividad y solicita valorar de nuevo el establecimiento. | Si existe inspección previa, vincularla; describir el cambio. |

**Fuera de estas opciones:** la inspección periódica por frecuencia calculada (por ejemplo, semestral) debe ser organizada por la institución mediante **Programa institucional**. La frecuencia es un resultado de riesgo que orienta la planificación; no envía automáticamente una solicitud empresarial. Alertas y denuncias conservan sus entradas propias.

**Nombre reservado:** «Renovación» solo debería usarse si se define el objeto jurídico que se renueva, su vigencia y sus reglas. El sistema actual oficializa un informe y cierra un caso; no emite un certificado o permiso renovable.

## 3. Datos comunes y datos específicos

En todos los tipos: empresa vinculada a la sesión, establecimiento perteneciente a ella, contacto activo y exactamente un contacto principal, motivo, carta de autorización de la solicitud validada, documentos de apoyo, declaración de los productos o actividades relevantes y aceptación de la versión visible de requisitos antes del envío.

| Tipo | Información adicional propuesta | Documento de apoyo propuesto |
| --- | --- | --- |
| Evaluación inicial | Actividad principal, procesos, productos y fecha prevista de inicio si aplica. | Descripción o relación de procesos/productos. |
| Reinspección de seguimiento | Expediente previo, hallazgos que se buscan verificar y acciones ejecutadas. | Evidencia de acciones correctivas o plan de mejora. |
| Cambio relevante | Qué cambió, cuándo, áreas afectadas y productos/procesos impactados. | Soporte del cambio: descripción, plano o relación actualizada, según corresponda. |

Los documentos de apoyo de esta tabla son **requisitos de producto propuestos**, no requisitos legales confirmados. La institución debe aprobar su nombre, obligatoriedad, formato y excepciones. La carta de autorización ya es un requisito técnico común del Core actual.

## 4. Recorrido por rol

1. **Administrador de empresa o Delegado:** selecciona el tipo, completa el borrador, vincula el contacto principal y carga la carta y los soportes. Solo puede operar dentro de su empresa.
2. **Administrador, Coordinador o Universal:** revisa documentos según sus permisos actuales; valida o rechaza y deja motivo de rechazo.
3. **Administrador de empresa o Delegado:** subsana documentos rechazados mientras el borrador siga editable y envía cuando se cumplen las condiciones.
4. **Core:** congela la solicitud enviada y crea un caso de origen «Solicitud de empresa», conservando el tipo y la versión de requisitos utilizada.
5. **Coordinador o Universal:** asigna y agenda al evaluador. El resto del flujo sigue igual: inspección BPM/EBR, cálculo, revisión, informe borrador, oficialización y cierre.

La aprobación documental permite **enviar la solicitud**; no aprueba la inspección. La revisión de inspección, oficialización del informe y cierre son decisiones posteriores y distintas.

## 5. Reglas que conviene implementar antes de abrir los nuevos tipos

- Selector en español, con códigos internos estables. Core debe rechazar un código desconocido; hoy acepta cualquier texto no vacío de hasta 80 caracteres.
- Cada tipo debe tener un texto de ayuda y una lista versionada de requisitos. Una solicitud conserva el código y la versión aplicable al crearla/enviarla para que un cambio futuro no reescriba el expediente.
- La reinspección exige una inspección previa **cerrada** y perteneciente al mismo establecimiento. Una devolución de revisión todavía abierta se atiende como corrección, sin crear otro caso.
- Un cambio relevante requiere describir el cambio; una inspección previa se vincula si existe, sin impedir el trámite de un establecimiento recién registrado.
- Evitar duplicados activos del mismo establecimiento y finalidad: avisar de una solicitud/caso abierto y permitir al equipo central resolver casos excepcionales. No bloquear a un evaluador solo porque participa en otro caso; el solapamiento de agenda es una advertencia.
- Los tipos no modifican los pesos, categorías o frecuencia de riesgo. Todas las inspecciones siguen fijando la plantilla BPM y reglas de riesgo efectivas al crearse.
- Los registros antiguos con `REGISTRATION` u otros textos libres requieren una migración auditada: conservar valor original y clasificar manualmente si no hay equivalencia segura. No reinterpretarlos automáticamente como «Evaluación inicial».

## 6. Situación técnica actual y decisiones pendientes

Hoy el formulario presenta «Tipo de solicitud» como texto libre, precargado con `REGISTRATION`; Core valida longitud y presencia, pero no comprueba pertenencia a una lista. Solo hay dos clases técnicas de documento: carta de autorización y documento de apoyo. El envío comprueba una carta válida, un contacto principal y entre uno y diez documentos activos; no tiene requisitos distintos según el tipo.

Antes de implementarlo hay que acordar:

1. Si estos **tres nombres** representan los trámites empresariales que quieren administrar.
2. Qué evidencia específica será obligatoria, opcional o sujeta a revisión para cada tipo.
3. Si el producto final incluirá un **certificado o permiso** con vigencia. Si es así, «renovación» sería otro trámite y necesitaría su propio diseño.
4. Si la institución tendrá un rol de admisión que pueda devolver una solicitud enviada para subsanación; hoy el envío deja la solicitud inmutable.

Hasta resolver esas decisiones, esta propuesta no debe presentarse como catálogo oficial ni publicarse en un entorno institucional. El desplegable del portal es una ayuda de captura, no una validación normativa: «Otro» envía el texto escrito al campo `requestType` existente, con su límite de 80 caracteres. Los valores anteriores se conservan al editar borradores y no se migran automáticamente.
