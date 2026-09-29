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
