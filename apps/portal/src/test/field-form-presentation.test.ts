import { expect, it } from 'vitest'
import { bpmResponseOptions, captureProgress, formatAddedFoods, matchesKeywords, missingCriteria, responseDisplay } from '../field/formPresentation'
import type { FieldState } from '../field/model'

const state = {
  signedPackage: {
    bpmTemplate: { items: [
      { id: 'criterion-1', itemKind: 'CRITERION', isEvaluable: true, displayCode: '1.1', title: 'Higiene del personal', sortOrder: 1, parentItemId: null },
      { id: 'criterion-2', itemKind: 'CRITERION', isEvaluable: true, displayCode: '1.2', title: 'Control de plagas', sortOrder: 2, parentItemId: null },
      { id: 'heading', itemKind: 'GROUP', isEvaluable: false, displayCode: '1', title: 'Instalaciones', sortOrder: 0, parentItemId: null },
    ] },
    riskRule: {
      factors: [{ id: 'factor-1' }, { id: 'factor-2' }],
      foodCatalog: [
        {
          id: 'cat-1',
          name: 'Bebidas',
          subcategories: [
            { id: 'na', name: 'Agua no envasada', riskScore: null },
            { id: 'applicable', name: 'Agua purificada', riskScore: 2 },
          ],
        },
      ],
    },
  },
  responses: [{ bpmItemId: 'criterion-1', responseValue: 'NA' }],
  factorSelections: [{ riskFactorId: 'factor-1' }],
  foodSnapshots: [{ foodRiskSubcategoryId: 'na' }],
} as FieldState

it('busca varias palabras sin depender de su orden, mayúsculas ni acentos', () => {
  expect(matchesKeywords('Bebidas: Agua purificada', 'PURIFICADA bebidas')).toBe(true)
  expect(matchesKeywords('Bebidas: Agua purificada', 'agua lácteos')).toBe(false)
})

it('cuenta NA como criterio respondido y exige un producto aplicable para completar la captura', () => {
  expect(captureProgress(state)).toMatchObject({ criteria: 1, criteriaTotal: 2, factors: 1, factorsTotal: 2, hasProduct: false, percent: 40 })
  const completed = { ...state, responses: [...state.responses, { bpmItemId: 'criterion-2', responseValue: 'IT' }], factorSelections: [...state.factorSelections, { riskFactorId: 'factor-2' }], foodSnapshots: [...state.foodSnapshots, { foodRiskSubcategoryId: 'applicable' }] } as FieldState
  expect(captureProgress(completed)).toMatchObject({ criteria: 2, factors: 2, hasProduct: true, percent: 100 })
  expect(responseDisplay.IT).toMatchObject({ label: 'Incumple', color: 'error' })
  expect(responseDisplay.CP).toMatchObject({ label: 'Cumple parcialmente', color: 'warning' })
  expect(responseDisplay.C).toMatchObject({ label: 'Cumple', color: 'success' })
})

it('define las cuatro opciones visibles de respuesta con su valor y código exacto', () => {
  expect(bpmResponseOptions.map((opt) => ({ buttonLabel: opt.buttonLabel, value: opt.value }))).toEqual([
    { buttonLabel: 'C · Cumple', value: 'C' },
    { buttonLabel: 'CP · Cumple parcialmente', value: 'CP' },
    { buttonLabel: 'IT · Incumple', value: 'IT' },
    { buttonLabel: 'N/A · No aplica', value: 'NA' },
  ])
})

it('deriva los criterios faltantes en orden omitiendo respondidos y grupos no evaluables', () => {
  const missing = missingCriteria(state)
  expect(missing).toHaveLength(1)
  expect(missing[0]).toEqual({ id: 'criterion-2', displayCode: '1.2', title: 'Control de plagas' })

  const completed = {
    ...state,
    responses: [...state.responses, { bpmItemId: 'criterion-2', responseValue: 'C' }],
  } as FieldState
  expect(missingCriteria(completed)).toEqual([])
})

it('formatea los productos agregados mostrando categoría y subcategoría', () => {
  const added = formatAddedFoods(state)
  expect(added).toEqual([
    {
      id: 'na',
      foodRiskSubcategoryId: 'na',
      categoryName: 'Bebidas',
      subcategoryName: 'Agua no envasada',
      riskScore: null,
      label: 'Bebidas: Agua no envasada (No aplica)',
    },
  ])

  const withBoth = {
    ...state,
    foodSnapshots: [{ foodRiskSubcategoryId: 'na' }, { foodRiskSubcategoryId: 'applicable' }],
  } as FieldState
  const formatted = formatAddedFoods(withBoth)
  expect(formatted[1].label).toBe('Bebidas: Agua purificada')
})
