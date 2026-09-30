import { orderBpmItems } from './bpmOrder'
import type { BpmValue, FieldState } from './model'

export const matchesKeywords = (text: string, query: string) => {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
  const haystack = normalize(text)
  return normalize(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word))
}

export const responseDisplay: Record<BpmValue | 'UNANSWERED', { label: string; color: 'success' | 'warning' | 'error' | 'default'; order: number }> = {
  IT: { label: 'Incumple', color: 'error', order: 0 },
  CP: { label: 'Cumple parcialmente', color: 'warning', order: 1 },
  C: { label: 'Cumple', color: 'success', order: 2 },
  NA: { label: 'No aplica', color: 'default', order: 3 },
  UNANSWERED: { label: 'Sin respuesta', color: 'default', order: 4 },
}

export const bpmResponseOptions: ReadonlyArray<{
  value: BpmValue
  code: string
  label: string
  buttonLabel: string
  color: 'success' | 'warning' | 'error' | 'default'
}> = [
  { value: 'C', code: 'C', label: 'Cumple', buttonLabel: 'C · Cumple', color: 'success' },
  { value: 'CP', code: 'CP', label: 'Cumple parcialmente', buttonLabel: 'CP · Cumple parcialmente', color: 'warning' },
  { value: 'IT', code: 'IT', label: 'Incumple', buttonLabel: 'IT · Incumple', color: 'error' },
  { value: 'NA', code: 'N/A', label: 'No aplica', buttonLabel: 'N/A · No aplica', color: 'default' },
]

export interface MissingCriterion {
  id: string
  displayCode: string | null
  title: string
}

export function missingCriteria(state: FieldState): MissingCriterion[] {
  const answered = new Set(state.responses.map((response) => response.bpmItemId))
  const ordered = orderBpmItems(state.signedPackage.bpmTemplate.items)
  return ordered
    .map(({ item }) => item)
    .filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable && !answered.has(item.id))
    .map((item) => ({ id: item.id, displayCode: item.displayCode ?? null, title: item.title }))
}

export interface FormattedAddedFood {
  id: string
  foodRiskSubcategoryId: string
  categoryName: string
  subcategoryName: string
  riskScore: number | null
  label: string
}

export function formatAddedFoods(state: FieldState): FormattedAddedFood[] {
  return state.foodSnapshots.map((entry) => {
    for (const category of state.signedPackage.riskRule.foodCatalog) {
      const sub = category.subcategories.find((s) => s.id === entry.foodRiskSubcategoryId)
      if (sub) {
        const naSuffix = sub.riskScore === null ? ' (No aplica)' : ''
        return {
          id: entry.foodRiskSubcategoryId,
          foodRiskSubcategoryId: entry.foodRiskSubcategoryId,
          categoryName: category.name,
          subcategoryName: sub.name,
          riskScore: sub.riskScore,
          label: `${category.name}: ${sub.name}${naSuffix}`,
        }
      }
    }
    return {
      id: entry.foodRiskSubcategoryId,
      foodRiskSubcategoryId: entry.foodRiskSubcategoryId,
      categoryName: '',
      subcategoryName: entry.foodRiskSubcategoryId,
      riskScore: null,
      label: entry.foodRiskSubcategoryId,
    }
  })
}

export function captureProgress(state: FieldState) {
  const criteria = state.signedPackage.bpmTemplate.items.filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable)
  const answered = new Set(state.responses.map((response) => response.bpmItemId))
  const selectedFactors = new Set(state.factorSelections.map((selection) => selection.riskFactorId))
  const factors = state.signedPackage.riskRule.factors
  const hasProduct = state.foodSnapshots.some((entry) => state.signedPackage.riskRule.foodCatalog.some((category) => category.subcategories.some((sub) => sub.id === entry.foodRiskSubcategoryId && sub.riskScore !== null)))
  const completedCriteria = criteria.filter((item) => answered.has(item.id)).length
  const completedFactors = factors.filter((factor) => selectedFactors.has(factor.id)).length
  const completed = completedCriteria + completedFactors + Number(hasProduct)
  const total = criteria.length + factors.length + 1
  const next = completedCriteria < criteria.length ? 'Responder criterios BPM' : completedFactors < factors.length ? 'Completar los factores de riesgo' : !hasProduct ? 'Agregar un producto aplicable' : 'Finalizar y enviar la inspección'
  return { criteria: completedCriteria, criteriaTotal: criteria.length, factors: completedFactors, factorsTotal: factors.length, hasProduct, percent: Math.round(completed / total * 100), next }
}
