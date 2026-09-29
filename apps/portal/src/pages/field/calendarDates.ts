export type CalendarView = 'day' | 'week' | 'month'

const zone = 'America/Santo_Domingo'
// Las programaciones de Core usan esta zona; las fechas del calendario son días civiles, no fechas del navegador.
const dayStart = (date: string) => new Date(`${date}T00:00:00-04:00`)
const utcDate = (date: string) => new Date(`${date}T00:00:00Z`)

export function todayInDominicanRepublic(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function addCalendarDays(date: string, days: number): string {
  const next = utcDate(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

export function moveCalendarDate(date: string, view: CalendarView, direction: number): string {
  if (view !== 'month') return addCalendarDays(date, direction * (view === 'week' ? 7 : 1))
  const current = utcDate(date)
  const day = current.getUTCDate()
  current.setUTCDate(1)
  current.setUTCMonth(current.getUTCMonth() + direction)
  const lastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate()
  current.setUTCDate(Math.min(day, lastDay))
  return current.toISOString().slice(0, 10)
}

export function calendarDays(date: string, view: CalendarView): string[] {
  if (view === 'day') return [date]
  const current = utcDate(date)
  if (view === 'month') current.setUTCDate(1)
  const first = current.toISOString().slice(0, 10)
  const offset = (current.getUTCDay() + 6) % 7
  const start = addCalendarDays(first, -offset)
  const count = view === 'week' ? 7 : Math.ceil((offset + new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate()) / 7) * 7
  return Array.from({ length: count }, (_, index) => addCalendarDays(start, index))
}

export function calendarRange(days: string[]): { startFrom: string; startTo: string } {
  return { startFrom: dayStart(days[0]).toISOString(), startTo: dayStart(addCalendarDays(days[days.length - 1], 1)).toISOString() }
}

export function scheduleOnDay(schedule: { scheduledStartAt: string; scheduledEndAt: string }, date: string): boolean {
  return new Date(schedule.scheduledStartAt).getTime() < dayStart(addCalendarDays(date, 1)).getTime()
    && new Date(schedule.scheduledEndAt).getTime() > dayStart(date).getTime()
}

export function calendarDayLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-DO', { ...options, timeZone: 'UTC' }).format(utcDate(date))
}

export function scheduleTime(value: string): string {
  return new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(value))
}
