import { expect, it } from 'vitest'
import { captureProgress, matchesKeywords, responseDisplay } from '../field/formPresentation'
import type { FieldState } from '../field/model'

const state = {
  signedPackage: {
    bpmTemplate: { items: [
      { id: 'criterion-1', itemKind: 'CRITERION', isEvaluable: true },
      { id: 'criterion-2', itemKind: 'CRITERION', isEvaluable: true },
      { id: 'heading', itemKind: 'GROUP', isEvaluable: false },
    ] },
    riskRule: { factors: [{ id: 'factor-1' }, { id: 'factor-2' }], foodCatalog: [{ subcategories: [
      { id: 'na', riskScore: null }, { id: 'applicable', riskScore: 2 },
    ] }] },
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
