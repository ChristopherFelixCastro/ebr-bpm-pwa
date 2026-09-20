# @ebr-bpm/risk-engine

Motor de cálculo del sistema EBR/BPM. Para una inspección calcula:

- el **cumplimiento BPM**;
- el **riesgo del producto**;
- el **riesgo del establecimiento** (seis factores ponderados);
- el **riesgo total** y la **frecuencia de inspección**.

Con cada resultado entrega la explicación de cómo se obtuvo.

Cubre el RF-14 y es la base del módulo analítico (revisión, informe, cierre e histórico), según las secciones 3 y 4 del SDP de Luis.

- TypeScript puro, sin dependencias en tiempo de ejecución. Funciona en Node y en el navegador.
- No consulta la base ni los Excel. Recibe una **instantánea** de la inspección y la **versión de reglas publicada** que tiene asignada, y devuelve un resultado explicable.
- La misma entrada da siempre el mismo resultado, sin importar el orden de las filas.

## Comandos

Desde la raíz del repositorio:

```bash
npm ci                                  # instala con el package-lock, sin modificarlo
npm run validate                        # lo que corre el CI: compila los paquetes y valida cada workspace
npm run test -w @ebr-bpm/risk-engine    # solo las pruebas del motor
npm run build -w @ebr-bpm/risk-engine   # genera dist/; hace falta antes de importarlo desde una app
```

`validate` del paquete ejecuta en orden:

1. el typecheck;
2. las pruebas;
3. el build;
4. `check:dist`, que importa el paquete compilado por su nombre, como ESM y como CommonJS, y compara el caso de referencia con el fixture.

> **npm:** usar `npm ci` en vez de `npm install`, para no cambiar el `package-lock.json`.
> - Con npm 10, `npm install` de `vitest` desde cero falla por un error de npm (`Cannot read properties of null (reading 'edgesOut')`). Como el lock ya está resuelto, `npm ci` funciona con npm 10 y con npm 11.
> - El lock está en el formato de npm 10, que es el del CI. npm 11 le agrega campos `libc` si se corre `npm install`.

## Uso

```ts
import { calculateInspectionRisk, RiskEngineError } from '@ebr-bpm/risk-engine';

try {
  const resultado = calculateInspectionRisk(instantanea, versionAsignada);
  if (resultado.status === 'CALCULADO') {
    resultado.totalRisk.value;   // "4.1793" (exacto, para guardar)
    resultado.riskLevel;         // "MEDIO"
    resultado.frequency;         // "SEMESTRAL"
    resultado.frequencyMonths;   // 6
  } else {
    resultado.reasons;           // ["SIN_CRITERIOS_APLICABLES"] y/o ["SIN_RIESGO_PRODUCTO_APLICABLE"]
  }
  resultado.explanation;         // desglose para "Cómo se calculó este resultado" y para el PDF
} catch (error) {
  if (error instanceof RiskEngineError) {
    error.code;                  // p. ej. "RESPUESTAS_INCOMPLETAS" → la API responde 422
    error.details;               // ítems, factor u opciones involucradas
    // En Express: res.status(422).json(error) → toJSON() incluye name, code, message y details
  }
}
```

- El resultado es JSON puro, congelado y sin referencias a la entrada. Core puede guardarlo completo; el portal y el PDF lo muestran sin recalcular.
- Funciona tanto desde ESM como desde CommonJS (Node ^20.19 o ≥ 22.12).

La versión inicial de reglas está en [`rules/regla-inicial.v1.json`](rules/regla-inicial.v1.json). Core puede sembrarla en `risk_rule_versions`, `risk_factors` y `frequency_ranges`:

```ts
import reglaV1 from '@ebr-bpm/risk-engine/rules/regla-inicial.v1.json' with { type: 'json' };
```

## Entrada

### Instantánea de la inspección (`InspectionSnapshot`)

| Campo | Contenido |
|---|---|
| `inspectionId` | Id de la inspección |
| `ruleVersionId` | Versión de reglas asignada. Si no es la que se pasa al motor → `VERSION_NO_COINCIDE` |
| `bpm.templateVersionId` | Versión de la plantilla BPM asignada |
| `bpm.items[]` | `{ itemId, code, allowsPartial?, answer }`. `answer` es `C`, `CP`, `IT` o `NA`; si es `null` o no viene, el ítem está sin responder. Si `allowsPartial` es `null` o no viene, se toma como `true` |
| `products.catalogVersionId` | Versión del catálogo de alimentos |
| `products.subcategories[]` | `{ subcategoryId, subcategoryName, categoryName, microbiologicalRisk, score }`. El puntaje debe ser el de la versión para ese nivel. Si nivel y puntaje vienen vacíos (`null`, `""` o sin la clave), la subcategoría es No aplica |
| `factorAnswers` | Respuestas de cinco factores: `VOLUMEN_PRODUCCION: { value }`, `HACCP: { option }`, `PROVEEDOR_INABIE: { option }`, `RECHAZOS_SANITARIOS: { value }` y `PLAN_MUESTREO: { option }`. El cumplimiento BPM no se contesta: sale de la ficha |

### Versión de reglas (`RiskRuleVersion`)

| Campo | Contenido |
|---|---|
| `id`, `version`, `status` | `status` es `BORRADOR` o `PUBLICADA` |
| `bpmAnswerPoints` | Puntaje de C, CP e IT |
| `productRiskPoints` | Puntaje de BAJO, MEDIO y ALTO |
| `display` | Decimales para mostrar: `percentageDecimals` y `riskDecimals` |
| `factors` | Los seis factores, con sus tramos u opciones |
| `frequencyRanges` | Un rango por nivel |

`validateRuleVersion(version)` devuelve la lista de problemas antes de publicar. Revisa que:

- los pesos sumen exactamente 1;
- estén los seis factores, sin repetir;
- los tramos no tengan huecos ni solapes y cubran desde 0;
- haya un rango por nivel, con frecuencias crecientes y meses 12/6/3;
- **todo riesgo total posible caiga en algún rango** y cada nivel se pueda alcanzar con alguna combinación;
- los puntajes del producto sean crecientes;
- pesos, puntos y límites tengan como máximo 6 decimales.

`calculateInspectionRisk` rechaza una versión inválida (`VERSION_INVALIDA`), en borrador (`VERSION_NO_PUBLICADA`) o distinta de la asignada (`VERSION_NO_COINCIDE`).

Para la vista previa del administrador se pasa `{ allowDraft: true }`. Así el motor acepta una versión en borrador o distinta de la asignada, pero el resultado sale con `preview: true` y con `assignedRuleVersionId`, también dentro de `explanation.versions`. **Core no debe guardar como oficial un resultado con `preview: true`.**

Los decimales pueden llegar como número o como texto (`"0.16"`). Se recomienda texto, que es como PostgreSQL entrega los `NUMERIC`.

## Reglas de cálculo (versión 1)

### Cumplimiento BPM

| Respuesta | Puntos | ¿Entra al denominador? |
|---|---|---|
| C, Cumple | 1 | Sí |
| CP, Cumplimiento parcial | 0.5 | Sí |
| IT, Incumplimiento total | 0 | Sí |
| NA, No aplica | — | No |

```
porcentaje_bpm = puntos_obtenidos / (ítems aplicables × puntos de C) × 100
```

- Si no queda ningún ítem aplicable, no hay porcentaje: el resultado es `NO_CALCULABLE` con `SIN_CRITERIOS_APLICABLES`. Nunca se inventa un 0 % ni un 100 %.
- Un ítem sin responder da el error `RESPUESTAS_INCOMPLETAS`.
- Un CP en un ítem con `allowsPartial: false` da el error `RESPUESTA_NO_PERMITIDA`.

### Riesgo del producto

Es el **mayor** puntaje aplicable entre las subcategorías que elabora el establecimiento: bajo 1, medio 2, alto 3.

- Las subcategorías sin nivel no participan (no valen cero).
- Si ninguna aplica, el resultado es `NO_CALCULABLE` con `SIN_RIESGO_PRODUCTO_APLICABLE`.
- Solo se usa el riesgo microbiológico de la matriz.

### Riesgo del establecimiento

| Factor | Peso | 1 punto | 1.67 | 2.33 | 3 |
|---|---|---|---|---|---|
| Volumen de producción por mes | 0.16 | < 200,000 | 200,000 a < 800,000 | 800,000 a 2,000,000 | > 2,000,000 |
| HACCP | 0.09 | Todas las líneas | 75 % | 25 % | No implementado |
| Cumplimiento BPM | 0.56 | > 80 % | > 70 % y ≤ 80 % | > 60 % y ≤ 70 % | ≤ 60 % |
| Proveedor INABIE | 0.05 | No suplidor | Local | Regional | Nacional |
| Rechazos sanitarios (5 años) | 0.06 | Ninguno | 1 | 2 | Más de 2 |
| Plan de muestreo | 0.08 | Completo | Proceso y producto terminado | Solo materias primas | No tiene |

```
RE = Σ (puntos del factor × peso)
```

El SDP pone el tramo Pequeño en "200,000–799,000", lo que deja sin tramo los valores entre 799,000 y 800,000. Aquí Pequeño llega hasta 800,000 (sin incluirlo).

### Riesgo total y frecuencia

```
RT = riesgo del producto × RE
```

| RT | Nivel | Frecuencia |
|---|---|---|
| 1 a 3.6, incluido | BAJO | ANUAL (12 meses) |
| más de 3.6 a 6.3, incluido | MEDIO | SEMESTRAL (6 meses) |
| más de 6.3 | ALTO | TRIMESTRAL (3 meses) |

**Caso de referencia** (hoja de categorización del reto):

- Datos: producto de riesgo alto, volumen micro, sin HACCP, BPM 85 %, suplidor regional del INABIE, 1 rechazo y muestreo solo de materias primas.
- Resultado: **RE 1.3931**, **RT 4.1793**, **MEDIO**, **SEMESTRAL**.
- El resultado completo, con la explicación, está en [`test/fixtures/resultado-referencia.json`](test/fixtures/resultado-referencia.json).

## Precisión y redondeo

- **Cálculo exacto.** Los decimales se manejan como enteros con escala, y el porcentaje BPM como fracción.
  - En JavaScript, `3 * 2.1` da `6.300000000000001`, que caería en ALTO; el motor da 6.3, que es MEDIO.
  - Los pesos de la v1 sumados con números de punto flotante tampoco dan exactamente 1.
- **Las clasificaciones usan el valor exacto.** El redondeo es único, HALF_UP (3.125 → 3.13), y solo se aplica al mostrar.
- **Cada valor trae tres campos:**
  - `value`: el valor exacto, o redondeado a 10 decimales sin ceros finales si es periódico (por ejemplo, 25/39);
  - `exact`: si `value` es exacto;
  - `display`: el texto para mostrar, siempre con separador de miles. Los valores calculados se redondean con los decimales de la versión; los datos capturados (volumen, rechazos) se muestran tal cual.
- **Decimales para mostrar en la v1:** 2 para el porcentaje BPM y 4 para los riesgos (producto, RE y RT).
  - Con 2 decimales, 29 combinaciones de la v1 se mostrarían como "3.60" o "6.30" sin valer eso, y un mismo número escondería niveles distintos: RT 3.6006 es MEDIO y RT 3.5997 es BAJO, pero los dos se verían "3.60".
  - Con los puntajes y pesos de la v1, 4 decimales muestran el valor exacto.
  - Si el grupo prefiere 2, basta con cambiar `display.riskDecimals` en la versión de reglas.

## Errores

| Código | Cuándo |
|---|---|
| `VERSION_INVALIDA` | La versión no pasa la validación (`details.issues`) |
| `VERSION_NO_PUBLICADA` | Versión en borrador sin `allowDraft` |
| `VERSION_NO_COINCIDE` | La versión no es la asignada a la inspección (`details.assigned`, `details.received`) |
| `ENTRADA_INVALIDA` | Dato con formato o tipo incorrecto, o desmedido |
| `ENTRADA_DUPLICADA` | Ítem BPM o subcategoría repetidos |
| `RESPUESTAS_INCOMPLETAS` | Ítems BPM sin responder (`details.items`) |
| `RESPUESTA_NO_PERMITIDA` | CP en un ítem que no lo admite |
| `FACTOR_SIN_RESPUESTA` | Falta la respuesta de un factor |
| `OPCION_DESCONOCIDA` | La opción no existe en la versión (`details.allowed`) |
| `VALOR_FUERA_DE_RANGO` | Ningún tramo contiene el valor (por ejemplo, un volumen negativo) |
| `CATALOGO_INCONSISTENTE` | El nivel y el puntaje de una subcategoría no concuerdan con la versión |
| `RIESGO_TOTAL_SIN_RANGO` | Ningún rango contiene el RT (con una versión validada no debería ocurrir) |

## Pruebas

`npm run test -w @ebr-bpm/risk-engine` ejecuta 217 pruebas con Vitest:

| Grupo | Qué cubre |
|---|---|
| **BPM** | C/CP/IT/NA combinados, todo NA, porcentajes periódicos, redondeo, ítems sin responder o sin la clave `answer`, CP no permitido, duplicados |
| **Producto** | Máximo aplicable, empates, NA y valores vacíos, puntaje distinto del oficial |
| **Establecimiento** | Caso de referencia, mejor y peor caso, límites de cada tramo (incluido el hueco del SDP), rechazos enteros, opciones desconocidas, respuestas mal formadas |
| **Frecuencia** | Límites 3.6 y 6.3, y el caso de punto flotante |
| **Versiones** | Pesos, factores, huecos y solapes, niveles y frecuencias en desorden, meses, cobertura del RT posible, niveles inalcanzables, puntajes del producto, decimales, columnas vacías |
| **Cálculo completo** | Explicación, fixture completo, no calculables, versión asignada y vista previa, límites 3.6 y 6.3 de punta a punta, otra versión sin alterar la v1, orden de las filas, entrada sin modificar, resultado congelado y serializable |
| **Exhaustiva** | Las 12,288 combinaciones de la v1 (4^6 tramos × 3 niveles de producto) comparadas con un cálculo independiente hecho con enteros |
| **Soporte** | Aritmética exacta, límites de entrada y orden natural de los códigos |

## Pendiente de acordar con el grupo

1. **Con Core (Christopher):**
   - la forma de la instantánea y del resultado, y los nombres de los códigos de factores, opciones y tramos, para `POST /api/v1/inspections/{id}/calculate`;
   - que Core guarde el resultado completo, con la explicación y las versiones usadas, y no lo recalcule.
2. **Decimales para mostrar los riesgos:** 4, como propone el motor, o 2, como dice el SDP.
3. **Cómo se consume el paquete:** por ahora desde `dist/`. El `validate` de la raíz compila los paquetes antes de validar las apps.
4. **Node del CI:** Node 20 terminó su soporte el 30 de abril de 2026 y Vite 8 pide ^20.19; conviene pasar el CI a Node 22. El `engines` de la raíz ya pide `^20.19.0 || >=22.12.0`.
5. **Casos que el SDP no define:**
   - Una plantilla sin ítems o una lista de productos vacía hoy se tratan como "sin criterios" o "sin riesgo aplicable". ¿Deberían ser un error de carga de Core?
   - Con todo NA, el motor igual pide las 5 respuestas de factores.
   - Falta definir las opciones intermedias (HACCP al 50 %, otros alcances del muestreo) y la unidad del volumen: la v1 dice "unidades por mes" y el SDP solo "/mes".
   - `allowsPartial`, `months` y la vista previa con `allowDraft` son propuestas del motor.
