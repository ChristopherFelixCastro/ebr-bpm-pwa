import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import golden from './fixtures/resultado-referencia.json' with { type: 'json' };
import {
  calculateInspectionRisk,
  Decimal,
  ENGINE_VERSION,
  RiskEngineError,
  toComputedValue,
  validateRuleVersion,
  type CalculationResult,
  type InspectionSnapshot,
  type RiskRuleVersion,
} from '../src/index.js';
import { bpmItems, deepFreeze, expectEngineError, referenceSnapshot, ruleV1, subcategory } from './helpers.js';

type Mutable = Record<string, any>;

const calculate = (snapshot: InspectionSnapshot = referenceSnapshot(), rule: RiskRuleVersion = ruleV1()) =>
  calculateInspectionRisk(snapshot, rule);

function isDeepFrozen(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return true;
  return Object.isFrozen(value) && Object.values(value).every(isDeepFrozen);
}

describe('Cálculo completo de una inspección', () => {
  it('caso de referencia del reto', () => {
    const result = calculate();
    expect(result).toMatchObject({
      status: 'CALCULADO',
      inspectionId: 'insp-001',
      engineVersion: ENGINE_VERSION,
      ruleVersion: { id: 'regla-riesgo-v1', version: '1', status: 'PUBLICADA' },
      bpmTemplateVersionId: 'bpm-plantilla-v1',
      foodCatalogVersionId: 'catalogo-v1',
      bpmPercentage: { value: '85', exact: true, display: '85.00' },
      productRisk: { value: '3', exact: true, display: '3.0000' },
      establishmentRisk: { value: '1.3931', exact: true, display: '1.3931' },
      totalRisk: { value: '4.1793', exact: true, display: '4.1793' },
      riskLevel: 'MEDIO',
      frequency: 'SEMESTRAL',
      frequencyMonths: 6,
    });
  });

  it('la explicación permite rehacer el cálculo', () => {
    const { explanation } = calculate();

    expect(explanation.bpm).toMatchObject({
      counts: { C: 34, CP: 0, IT: 6, NA: 5 },
      answerPoints: { C: '1', CP: '0.5', IT: '0' },
      pointsObtained: '34',
      pointsPossible: '40',
      applicableItems: 40,
    });
    expect(explanation.bpm.excludedItems.map((item) => item.code)).toEqual(['1.41', '1.42', '1.43', '1.44', '1.45']);

    expect(explanation.versions).toEqual({
      engine: ENGINE_VERSION,
      ruleVersion: { id: 'regla-riesgo-v1', version: '1', status: 'PUBLICADA' },
      assignedRuleVersionId: 'regla-riesgo-v1',
      bpmTemplateVersionId: 'bpm-plantilla-v1',
      foodCatalogVersionId: 'catalogo-v1',
      preview: false,
    });

    expect(explanation.product).toMatchObject({
      points: { BAJO: '1', MEDIO: '2', ALTO: '3' },
      score: '3',
      level: 'ALTO',
      determinedBy: [{ subcategoryId: 'leche', subcategoryName: 'Subcategoría leche', categoryName: 'Lácteos' }],
      excluded: [{ subcategoryId: 'pure', subcategoryName: 'Subcategoría pure', categoryName: 'Frutas' }],
    });

    const factors = explanation.establishment.factors;
    const sum = factors.reduce((total, factor) => total.add(Decimal.parse(factor.contribution!)), Decimal.ZERO);
    expect(sum.toString()).toBe(explanation.establishment.value?.value);
    expect(explanation.establishment.weightSum).toBe('1');
    expect(factors[0]).toEqual({
      code: 'VOLUMEN_PRODUCCION',
      name: 'Volumen de producción por mes',
      input: { kind: 'VALOR', value: { value: '150000', exact: true, display: '150,000' }, unit: 'unidades por mes' },
      selected: { code: 'MICRO', label: 'Micro (menos de 200,000)', range: '≥ 0 y < 200,000 unidades por mes' },
      points: '1',
      weight: '0.16',
      contribution: '0.16',
    });
    expect(factors[2]).toMatchObject({
      code: 'CUMPLIMIENTO_BPM',
      input: { kind: 'VALOR', value: { value: '85', display: '85.00' }, unit: '%' },
      selected: { code: 'MAS_DE_80', range: '> 80 %' },
    });
    expect(factors[4]?.selected).toEqual({ code: 'UNO', label: 'Uno', range: '= 1' });
    expect(factors[1]).toMatchObject({ input: { kind: 'OPCION', option: 'NO_IMPLEMENTADO' }, points: '3' });

    expect(explanation.total).toEqual({
      formula: 'RT = riesgo del producto × riesgo del establecimiento',
      value: { value: '4.1793', exact: true, display: '4.1793' },
      range: { level: 'MEDIO', frequency: 'SEMESTRAL', months: 6, label: '> 3.6 y ≤ 6.3' },
    });
    expect(explanation.rounding).toMatchObject({ mode: 'HALF_UP', percentageDecimals: 2, riskDecimals: 4 });
  });

  it('peor caso: RT 9, riesgo alto, inspección trimestral', () => {
    const snapshot: InspectionSnapshot = {
      ...referenceSnapshot(),
      bpm: { templateVersionId: 'bpm-plantilla-v1', items: bpmItems({ C: 10, IT: 35 }) },
      factorAnswers: {
        VOLUMEN_PRODUCCION: { value: 2500000 },
        HACCP: { option: 'NO_IMPLEMENTADO' },
        PROVEEDOR_INABIE: { option: 'NACIONAL' },
        RECHAZOS_SANITARIOS: { value: 4 },
        PLAN_MUESTREO: { option: 'INEXISTENTE' },
      },
    };
    expect(calculate(snapshot)).toMatchObject({
      status: 'CALCULADO',
      preview: false,
      bpmPercentage: { value: '22.2222222222', exact: false, display: '22.22' },
      establishmentRisk: { value: '3' },
      totalRisk: { value: '9' },
      riskLevel: 'ALTO',
      frequency: 'TRIMESTRAL',
      frequencyMonths: 3,
    });
  });

  it('sin criterios BPM aplicables el resultado no es calculable', () => {
    const snapshot = { ...referenceSnapshot(), bpm: { templateVersionId: 'bpm-plantilla-v1', items: bpmItems({ NA: 45 }) } };
    const result = calculate(snapshot);
    expect(result).toMatchObject({
      status: 'NO_CALCULABLE',
      reasons: ['SIN_CRITERIOS_APLICABLES'],
      bpmPercentage: null,
      productRisk: { value: '3' },
      establishmentRisk: null,
      totalRisk: null,
      riskLevel: null,
      frequency: null,
      frequencyMonths: null,
    });
    const bpmFactor = result.explanation.establishment.factors.find((f) => f.code === 'CUMPLIMIENTO_BPM');
    expect(bpmFactor).toMatchObject({ input: { kind: 'SIN_VALOR' }, points: null, contribution: null });
    expect(result.explanation.total).toMatchObject({ value: null, range: null });
  });

  it('sin riesgo de producto aplicable el resultado no es calculable, pero el RE sí se informa', () => {
    const snapshot = {
      ...referenceSnapshot(),
      products: { catalogVersionId: 'catalogo-v1', subcategories: [subcategory('pure', null)] },
    };
    expect(calculate(snapshot)).toMatchObject({
      status: 'NO_CALCULABLE',
      reasons: ['SIN_RIESGO_PRODUCTO_APLICABLE'],
      productRisk: null,
      establishmentRisk: { value: '1.3931' },
      totalRisk: null,
    });
  });

  it('informa los dos motivos cuando faltan ambos', () => {
    const snapshot: InspectionSnapshot = {
      ...referenceSnapshot(),
      bpm: { templateVersionId: 'bpm-plantilla-v1', items: [] },
      products: { catalogVersionId: 'catalogo-v1', subcategories: [] },
    };
    const result = calculate(snapshot);
    expect(result.status).toBe('NO_CALCULABLE');
    expect(result.status === 'NO_CALCULABLE' && result.reasons).toEqual([
      'SIN_CRITERIOS_APLICABLES',
      'SIN_RIESGO_PRODUCTO_APLICABLE',
    ]);
  });

  it('solo calcula con versiones publicadas, salvo vista previa', () => {
    const draft = { ...ruleV1(), status: 'BORRADOR' as const };
    expectEngineError(() => calculate(referenceSnapshot(), draft), 'VERSION_NO_PUBLICADA');
    const preview = calculateInspectionRisk(referenceSnapshot(), draft, { allowDraft: true });
    expect(preview.ruleVersion.status).toBe('BORRADOR');
    expect(preview.preview).toBe(true);
    expect(preview.totalRisk?.value).toBe('4.1793');
  });

  it('no calcula con una versión inválida', () => {
    const rule = ruleV1() as unknown as Mutable;
    rule.factors[0].weight = '0.2';
    expectEngineError(() => calculate(referenceSnapshot(), rule as RiskRuleVersion), 'VERSION_INVALIDA');
  });

  it('otra versión de reglas da otro resultado, queda registrada y no altera los cálculos con la v1', () => {
    const v2 = ruleV1() as unknown as Mutable;
    v2.id = 'regla-riesgo-v2';
    v2.version = '2';
    v2.factors[0].weight = '0.20';
    v2.factors[2].weight = '0.52';

    const lowBpm = (ruleVersionId: string): InspectionSnapshot => ({
      ...referenceSnapshot(),
      ruleVersionId,
      bpm: { templateVersionId: 'bpm-plantilla-v1', items: bpmItems({ C: 1, IT: 1 }) },
    });
    const beforeV1 = JSON.stringify(calculate(lowBpm('regla-riesgo-v1')));

    const withV2 = calculate(lowBpm('regla-riesgo-v2'), v2 as RiskRuleVersion);
    expect(withV2.ruleVersion).toEqual({ id: 'regla-riesgo-v2', version: '2', status: 'PUBLICADA' });
    expect(withV2.establishmentRisk?.value).toBe('2.4331');

    const afterV1 = calculate(lowBpm('regla-riesgo-v1'));
    expect(afterV1.establishmentRisk?.value).toBe('2.5131');
    expect(JSON.stringify(afterV1)).toBe(beforeV1);
  });

  it('rechaza una versión de reglas distinta de la asignada, salvo en vista previa (marcada)', () => {
    const v2 = { ...ruleV1(), id: 'regla-riesgo-v2', version: '2' };
    const error = expectEngineError(() => calculate(referenceSnapshot(), v2), 'VERSION_NO_COINCIDE');
    expect(error.details).toEqual({ assigned: 'regla-riesgo-v1', received: 'regla-riesgo-v2' });

    const preview = calculateInspectionRisk(referenceSnapshot(), v2, { allowDraft: true });
    expect(preview).toMatchObject({
      preview: true,
      ruleVersion: { id: 'regla-riesgo-v2', status: 'PUBLICADA' },
      assignedRuleVersionId: 'regla-riesgo-v1',
    });
    expect(preview.explanation.versions).toMatchObject({ preview: true, assignedRuleVersionId: 'regla-riesgo-v1' });

    const official = calculate();
    expect(official.preview).toBe(false);
    expect(official.explanation.versions.preview).toBe(false);
  });

  it('llega exactamente a los límites 3.6 y 6.3 en un cálculo completo', () => {
    const rule = { ...ruleV1(), id: 'regla-limites', productRiskPoints: { BAJO: '1', MEDIO: '3.6', ALTO: '6.3' } };
    expect(validateRuleVersion(rule)).toEqual([]);
    const best: InspectionSnapshot = {
      ...referenceSnapshot(),
      ruleVersionId: 'regla-limites',
      bpm: { templateVersionId: 'bpm-plantilla-v1', items: bpmItems({ C: 10 }) },
      factorAnswers: {
        VOLUMEN_PRODUCCION: { value: 0 },
        HACCP: { option: 'TODAS_LAS_LINEAS' },
        PROVEEDOR_INABIE: { option: 'NO_SUPLIDOR' },
        RECHAZOS_SANITARIOS: { value: 0 },
        PLAN_MUESTREO: { option: 'COMPLETO' },
      },
    };
    const withProduct = (level: 'MEDIO' | 'ALTO', score: string): InspectionSnapshot => ({
      ...best,
      products: {
        catalogVersionId: 'catalogo-v1',
        subcategories: [{ ...subcategory('x', level), score }],
      },
    });

    const atAnnualLimit = calculateInspectionRisk(withProduct('MEDIO', '3.6'), rule);
    expect(atAnnualLimit).toMatchObject({ totalRisk: { value: '3.6' }, riskLevel: 'BAJO', frequency: 'ANUAL' });

    const atSemesterLimit = calculateInspectionRisk(withProduct('ALTO', '6.3'), rule);
    expect(atSemesterLimit).toMatchObject({ totalRisk: { value: '6.3' }, riskLevel: 'MEDIO', frequency: 'SEMESTRAL' });
  });

  it('el orden de las filas de la versión no cambia el resultado', () => {
    const shuffled = ruleV1() as unknown as Mutable;
    shuffled.factors.reverse();
    for (const factor of shuffled.factors) (factor.bands ?? factor.options).reverse();
    shuffled.frequencyRanges.reverse();
    expect(calculate(referenceSnapshot(), shuffled as RiskRuleVersion)).toEqual(calculate());
  });

  it('los valores calculados se muestran con separador de miles', () => {
    expect(toComputedValue(Decimal.parse('4179.3'), 4)).toEqual({ value: '4179.3', exact: true, display: '4,179.3000' });
    expect(toComputedValue(Decimal.parse('1000000').toRatio(), 2)).toEqual({
      value: '1000000',
      exact: true,
      display: '1,000,000.00',
    });
  });

  it('acepta options en null', () => {
    expect(calculateInspectionRisk(referenceSnapshot(), ruleV1(), null).status).toBe('CALCULADO');
  });

  it('es determinista: el orden de la entrada no cambia el resultado', () => {
    const snapshot = referenceSnapshot();
    const shuffled: InspectionSnapshot = {
      ...snapshot,
      bpm: { ...snapshot.bpm, items: [...snapshot.bpm.items].reverse() },
      products: { ...snapshot.products, subcategories: [...snapshot.products.subcategories].reverse() },
    };
    expect(calculate(shuffled)).toEqual(calculate(snapshot));
    expect(calculate(snapshot)).toEqual(calculate(snapshot));
  });

  it('no modifica la entrada y entrega un resultado congelado que no la referencia', () => {
    const snapshot = referenceSnapshot();
    const rule = ruleV1();
    const before = JSON.stringify([snapshot, rule]);
    const result = calculateInspectionRisk(deepFreeze(snapshot), deepFreeze(rule));
    expect(JSON.stringify([snapshot, rule])).toBe(before);
    expect(isDeepFrozen(result)).toBe(true);

    const fresh = referenceSnapshot();
    const second = calculate(fresh);
    expect(Object.isFrozen(fresh.bpm.items[0])).toBe(false);
    expect(second.explanation.product.excluded[0]).not.toBe(fresh.products.subcategories[2]);
  });

  it('el caso de referencia coincide completo con el resultado guardado (fixture)', () => {
    expect(JSON.parse(JSON.stringify(calculate()))).toEqual(golden);
  });

  it('los errores del motor se pueden responder como JSON', () => {
    const error = new RiskEngineError('FACTOR_SIN_RESPUESTA', 'Falta HACCP', { factor: 'HACCP' });
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      name: 'RiskEngineError',
      code: 'FACTOR_SIN_RESPUESTA',
      message: 'Falta HACCP',
      details: { factor: 'HACCP' },
    });
  });

  it('el resultado se puede guardar como JSON sin perder nada', () => {
    const result = calculate();
    const roundTrip = JSON.parse(JSON.stringify(result)) as CalculationResult;
    expect(roundTrip).toEqual(result);
  });

  it.each([
    ['sin inspectionId', { inspectionId: '' }],
    ['sin versión de reglas asignada', { ruleVersionId: undefined }],
    ['sin versión de plantilla BPM', { bpm: { templateVersionId: '', items: [] } }],
    ['sin versión de catálogo', { products: { catalogVersionId: ' ', subcategories: [] } }],
    ['sin bloque bpm', { bpm: null }],
    ['con respuestas de factores que no son objeto', { factorAnswers: [] }],
  ])('rechaza una instantánea %s', (_, patch) => {
    const snapshot = { ...referenceSnapshot(), ...patch } as unknown as InspectionSnapshot;
    expectEngineError(() => calculate(snapshot), 'ENTRADA_INVALIDA');
  });

  it('la versión del motor coincide con package.json', () => {
    expect(ENGINE_VERSION).toBe(pkg.version);
  });
});
