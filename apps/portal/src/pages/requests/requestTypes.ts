export const requestTypeOptions = [
  { value: 'INITIAL_BPM_EBR', label: 'Evaluación inicial BPM/EBR' },
  { value: 'FOLLOW_UP_BPM_EBR', label: 'Reinspección de seguimiento' },
  { value: 'CHANGE_BPM_EBR', label: 'Evaluación por cambio relevante' },
] as const

export const otherRequestType = 'OTHER'

export function requestTypeChoice(value: string): string {
  return requestTypeOptions.some((option) => option.value === value) ? value : otherRequestType
}

export function requestTypeLabel(value: string): string {
  if (value === 'REGISTRATION') return 'Registro (tipo anterior)'
  return requestTypeOptions.find((option) => option.value === value)?.label ?? value
}
