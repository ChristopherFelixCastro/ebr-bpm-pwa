import { expect, it } from 'vitest'
import { calendarDays, calendarRange, moveCalendarDate, scheduleOnDay, todayInDominicanRepublic } from '../pages/field/calendarDates'

it('construye semanas y meses con fechas civiles de Santo Domingo', () => {
  expect(calendarDays('2026-09-29', 'week')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
  const month = calendarDays('2026-09-29', 'month')
  expect(month[0]).toBe('2026-08-31')
  expect(month.at(-1)).toBe('2026-10-04')
  expect(moveCalendarDate('2026-01-31', 'month', 1)).toBe('2026-02-28')
  expect(todayInDominicanRepublic(new Date('2026-09-29T02:00:00Z'))).toBe('2026-09-28')
})

it('incluye visitas que cruzan medianoche y excluye las que terminan justo al comenzar el día', () => {
  const days = calendarDays('2026-09-29', 'day')
  expect(calendarRange(days)).toEqual({ startFrom: '2026-09-29T04:00:00.000Z', startTo: '2026-09-30T04:00:00.000Z' })
  const overnight = { scheduledStartAt: '2026-09-30T03:00:00.000Z', scheduledEndAt: '2026-09-30T06:00:00.000Z' }
  expect(scheduleOnDay(overnight, '2026-09-29')).toBe(true)
  expect(scheduleOnDay(overnight, '2026-09-30')).toBe(true)
  expect(scheduleOnDay(overnight, '2026-10-01')).toBe(false)
  expect(scheduleOnDay({ scheduledStartAt: '2026-09-28T22:00:00Z', scheduledEndAt: '2026-09-29T04:00:00Z' }, '2026-09-29')).toBe(false)
})
