// La agenda de Core admite una ventana futura de 15 minutos a 12 horas.
export function scheduleWindowError(start: string, end: string, now = Date.now()): string | null {
  if (!start || !end) return null
  const startTime = Date.parse(`${start}:00-04:00`)
  const endTime = Date.parse(`${end}:00-04:00`)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 'Indique fechas y horas válidas.'
  if (startTime <= now) return 'El inicio debe ser posterior a la hora actual.'
  const duration = endTime - startTime
  if (duration < 15 * 60_000 || duration > 12 * 60 * 60_000) return 'La programación debe durar entre 15 minutos y 12 horas.'
  return null
}
