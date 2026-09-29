# Diseño de contenido BPM/EBR para uso institucional — borrador de trabajo

**Estado:** propuesta para revisión técnica y sanitaria. No autoriza su publicación ni su uso como criterio oficial.

## 1. Alcance y principio de diseño

El sistema evalúa establecimientos de alimentos y bebidas mediante una inspección BPM, clasifica el riesgo de los productos y del establecimiento, propone una frecuencia de inspección y conserva la versión de las definiciones utilizada en cada caso. Se proponen tres conjuntos separados y versionados:

1. **Catálogo de actividades y productos:** vocabulario común para identificar qué elabora, envasa, almacena o distribuye cada establecimiento. La empresa declara sus productos; no crea las categorías oficiales ni sus puntajes.
2. **Plantilla BPM:** preguntas verificables para la visita, con instrucciones para el evaluador, referencia de origen y criticidad. Las preguntas deben describir hechos observables, no conclusiones ambiguas.
3. **Reglas EBR:** categorías de riesgo de productos, seis factores de establecimiento, pesos, opciones de respuesta y rangos que convierten el resultado en frecuencia de inspección.

Cada definición necesita propietario institucional, fuente, fecha de revisión, responsable de aprobación, identificador de versión y registro de cambios. Una nueva versión no debe alterar el resultado histórico de inspecciones anteriores.

## 2. Base documental inicial

- **República Dominicana:** Decreto 528-01, Reglamento General para Control de Riesgos en Alimentos y Bebidas. Fuente: https://repositorio.msp.gob.do/handle/123456789/856
- **Referencia técnica internacional:** Codex Alimentarius CXC 1-1969, *Principios generales de higiene de los alimentos*, con prácticas de higiene y HACCP. Fuente: https://www.fao.org/fao-who-codexalimentarius/codex-texts/codes-of-practice/es/
- **Diseño de inspección basada en riesgo:** OMS, *Risk-based food inspection system: practical guidance for national authorities* (2024). Fuente: https://www.who.int/westernpacific/publications/i/item/9789290620198

Estas fuentes orientan el borrador. Antes de asignar carácter oficial a preguntas, pesos o frecuencias se debe revisar el texto completo y cualquier guía/formulario vigente de la autoridad sanitaria competente. Una guía BPM para **preparaciones farmacéuticas** no corresponde automáticamente a establecimientos de alimentos y bebidas.

## 3. Catálogo general propuesto

La estructura debe permitir `categoría → subcategoría/producto`, nombres claros y códigos estables. Propuesta inicial para discusión:

| Categoría | Ejemplos de subcategorías que necesitan definición específica |
| --- | --- |
| Agua y bebidas | Agua envasada, hielo para consumo, bebidas no alcohólicas, jugos, bebidas lácteas |
| Lácteos | Leche pasteurizada, queso fresco, yogur, productos de larga vida |
| Cárnicos y aves | Carne fresca, productos cocidos, embutidos, productos congelados |
| Pescados y mariscos | Frescos, congelados, cocidos, en conserva |
| Frutas y vegetales | Frescos listos para consumo, procesados, conservas |
| Cereales y panificación | Harinas, pan, repostería con o sin relleno perecedero |
| Comidas preparadas | Listas para consumo, refrigeradas, congeladas, servicio de alimentos |
| Aceites, grasas y condimentos | Aceites, salsas, aderezos, mezclas secas |
| Otros alimentos | Subcategorías nuevas sujetas a revisión, sin puntaje implícito |

La categoría comercial **no determina por sí sola el riesgo**. Por ejemplo, una bebida ácida estable y un jugo refrigerado pueden requerir clasificación distinta. Cada subcategoría de riesgo debe documentar condiciones de proceso, tratamiento, conservación y consumo previstas. Cuando el producto no encaje, debe quedar pendiente de clasificación; no debe asignársele automáticamente un valor bajo.

## 4. Plantilla BPM general propuesta

La interfaz admite jerarquía `sección → subsección → grupo → criterio`, criticidad **crítica/mayor/menor**, guía por criterio y trazabilidad de la fuente. La primera versión general para establecimientos de alimentos y bebidas debería cubrir, como mínimo:

1. **Información y alcance de la visita:** actividad, líneas inspeccionadas, productos y condiciones operativas observadas.
2. **Instalaciones y entorno:** ubicación, separación de áreas, diseño, estado de superficies, drenajes, iluminación y ventilación.
3. **Agua, hielo y servicios:** origen, aptitud, almacenamiento, distribución, controles y registros.
4. **Equipos y utensilios:** materiales, instalación, mantenimiento, calibración y prevención de contaminación.
5. **Limpieza, desinfección y plagas:** programas escritos, ejecución, productos usados, verificaciones y acciones correctivas.
6. **Personal e higiene:** salud, hábitos, vestimenta, lavado de manos, capacitación y supervisión.
7. **Materias primas y proveedores:** recepción, aceptación/rechazo, almacenamiento, identificación y trazabilidad.
8. **Control del proceso:** flujo, tiempo y temperatura, prevención de contaminación cruzada, controles específicos del producto y reprocesos.
9. **Envasado, etiquetado y almacenamiento:** materiales, identificación de lotes, condiciones de conservación y salida.
10. **Transporte y distribución:** vehículos, limpieza, temperatura cuando corresponda, integridad y registros.
11. **Gestión documental y trazabilidad:** registros, retiro de producto, reclamaciones, no conformidades y seguimiento.
12. **Controles preventivos/HACCP cuando apliquen:** análisis de peligros, medidas de control, monitoreo, verificación y acciones correctivas.

Cada criterio necesita: código estable, pregunta observable, respuesta permitida, regla de «No aplica», evidencia esperada cuando sea pertinente, guía de interpretación, criticidad propuesta y cita exacta de la fuente. El texto de la norma debe ser revisado para evitar atribuir obligaciones que no establece. Debe existir una revisión especial para agua envasada y otras actividades con controles específicos; una plantilla general no reemplaza todos los anexos sectoriales.

## 5. Reglas EBR: restricciones actuales y decisiones pendientes

El contrato actual exige exactamente estos seis factores: **volumen de producción, sistema HACCP, cumplimiento BPM, proveedor INABIE, rechazos/reclamaciones y plan de muestreo**. Cada factor tiene cuatro opciones con puntajes `1`, `1.67`, `2.33` y `3`; los seis pesos deben sumar `1`. Las categorías de producto admiten riesgo microbiológico bajo/medio/alto y puntaje de producto `1`, `2` o `3`, o «No aplica». Los rangos de frecuencia admiten anual, semestral y trimestral.

**No se proponen aún números definitivos** para pesos, cortes de volumen, clasificación de productos ni límites de frecuencia. Esos valores repercuten directamente en el resultado y deben provenir de una metodología aprobada. Para cada factor se preparará una ficha con: definición operativa, datos a observar, cuatro opciones mutuamente excluyentes, puntaje, justificación, tratamiento de información faltante y ejemplo de aplicación. Para los rangos se comprobará continuidad, ausencia de solapamientos y comportamiento en los límites.

La inclusión fija de **INABIE** requiere una decisión institucional explícita: cómo puntuar un establecimiento que no le suministra, sin convertir «No aplica» en una penalización o ventaja accidental. Si la metodología oficial requiere otro factor, habría que revisar el contrato del sistema antes de declarar oficiales estas reglas.

## 6. Criterios para aceptar una versión

- Revisión sanitaria y jurídica de cada referencia y cada pregunta.
- Ejemplos resueltos para agua envasada, lácteos, comidas preparadas y un establecimiento mixto.
- Revisión de sesgos del modelo EBR: actividad, tamaño, ausencia de información y casos sin INABIE.
- Prueba de casos frontera de puntajes y frecuencia; comparación con decisiones expertas.
- Validación técnica del borrador en el sistema, seguida de aprobación institucional de la versión y fecha de vigencia.
- Publicación y designación predeterminada **solo con autorización posterior y expresa**.

## 7. Material pendiente para convertir este borrador en contenido cargable

1. Formulario o guía BPM de alimentos y bebidas que la institución utiliza actualmente, con número de versión y fecha.
2. Matriz oficial o acordada de productos y riesgo microbiológico, incluidos procesos y condiciones de conservación.
3. Metodología para los seis factores: pesos, cortes y opciones; tratamiento de «No aplica».
4. Tabla aprobada de puntaje total → frecuencia, con límites e inclusividad.
5. Nombre del área y personas que revisarán y aprobarán el contenido sanitario.

Con ese material se elaborarán tres archivos de definición completos, trazables y revisables antes de cargarlos como borradores en el sistema.

## 8. Revisión de las fuentes recibidas el 28 de septiembre de 2026

Se recibieron la ficha de inspección BPM de octubre de 2024, la hoja de categorización y frecuencia revisada SBR, y la matriz de riesgo de alimentos. Además, en el workspace existe `Ejemplo tabla AllItems.md`, que contiene las 90 filas `AllItems` necesarias para reconstruir la jerarquía BPM. Este archivo debe confirmarse como la exportación institucional correspondiente a la ficha antes de publicar.

La lectura automática de la ficha y `AllItems` produjo **7 secciones, 32 subsecciones, 6 grupos, 45 criterios evaluables y 162 instrucciones auxiliares**. De estas instrucciones, 70 tienen criticidad explícita y 92 no la tienen. Los dos ajustes de código `AllItems` incluidos en el manifiesto se verificaron contra sus filas originales. El análisis estructural no encontró errores de asociación, pero esto no sustituye la revisión sanitaria del texto.

La matriz de alimentos tiene las columnas `Categoría`, `Subcategoría`, `Riesgo microbiológico`, **primer `Puntaje`**, `Riesgo químico`, segundo `Puntaje` y `Riesgo total`. Para este proyecto se leen exclusivamente las primeras cuatro columnas. Las columnas química y total se ignoran incluso cuando contienen valores. Las 17 categorías incluyen 111 filas legibles; 110 se cargaron tras convertir la fila autónoma 102 en una hoja denominada «Alimentos preparados» y excluir la fila 111, cuya subcategoría es solamente «p». La exclusión comprueba categoría, subcategoría, riesgo y puntaje originales y queda registrada como advertencia. Cinco de las 110 filas cargadas no tienen riesgo microbiológico ni puntaje (31–33 y 47–48); no deben utilizarse para calcular una inspección hasta que se clasifiquen. La fila 111 y estas cinco clasificaciones requieren resolución de fuente antes de publicar.

La primera columna `Puntaje` de la matriz usa **2, 4 y 8** para riesgo microbiológico bajo, medio y alto. El cálculo existente usa **1, 2 y 3** para la misma clasificación. Se autorizó convertir `2→1`, `4→2` y `8→3`, conservando por fila el puntaje original, el nombre del archivo, la hoja y el número de fila como trazabilidad. El campo de puntaje original se almacena en los atributos de la entrada del catálogo y la fuente binaria queda identificada por hash en la ejecución de importación.

La hoja de categorización usa seis factores con pesos **0,16; 0,09; 0,56; 0,05; 0,06 y 0,08**, que suman 1. Contiene cuatro opciones por factor; la cuarta opción BPM (96–100 %) se declara expresamente en el manifiesto porque no aparece en la lista de opciones de la hoja. Los rangos observados son `1,0–3,6` anual, `>3,6–6,3` semestral y `>6,3` trimestral. Estos datos pasan la validación estructural del importador. El significado sanitario de las opciones y las decisiones de frontera aún requieren revisión humana.

**Importación inicial:** se prepararon manifiestos locales de importación y se verificó el parseo sin modificar las fuentes. La plantilla BPM se importó a `ebr_bpm_operativo` como versión `DRAFT` `b38baee2-f89c-4555-bb40-e456e385f761`; una consulta posterior confirmó sus 90 elementos y 162 instrucciones. El catálogo `FOOD_RISK_OFFICIAL_2024` se importó como `DRAFT` `9d6ab836-523e-4501-8467-22bcae9dc713`, con 110 hojas; las reglas `RISK_RULES_OFFICIAL_2024` se importaron como `DRAFT` `9773be6e-ce3a-41e0-b9c2-ca7a23c8ff2c`, con 17 categorías, 110 subcategorías, seis factores, 24 opciones y tres rangos de frecuencia. Una primera aplicación de riesgo se revirtió por un código de catálogo demasiado largo; se corrigió la generación de códigos y la segunda aplicación terminó con éxito. En esta etapa las versiones permanecían sin publicar.

**Actualización del 28 de septiembre de 2026:** tras autorización expresa para continuar la prueba de inspección, las tres versiones anteriores se publicaron en `ebr_bpm_operativo` con vigencia inmediata. BPM y EBR se designaron predeterminadas. La validación estructural de las tres devolvió cero errores y cero advertencias; `effective_bpm_template_version` y `effective_risk_rule_version` ya resuelven a las versiones publicadas. Esta publicación permite crear nuevas inspecciones, pero no sustituye la revisión sanitaria pendiente de cinco subcategorías sin clasificación y de la fila «p» excluida de la matriz.
