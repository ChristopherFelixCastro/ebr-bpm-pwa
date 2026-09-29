import { expect, it, vi } from 'vitest'
import { listSchedules } from '../../modules/assignment-scheduling/repository.js'

it('consulta las visitas que se solapan con el período sin perder el alcance del evaluador', async () => {
  const run = { query: vi.fn().mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [{ id: 'visit' }] }) }
  const evaluatorId = '55555555-5555-4555-8555-555555555555'
  const result = await listSchedules(run as never, {
    page: 1, limit: 100, status: 'SCHEDULED', startFrom: '2026-09-29T04:00:00Z', startTo: '2026-09-30T04:00:00Z',
  }, evaluatorId)
  expect(result.total).toBe(1)
  expect(run.query).toHaveBeenCalledTimes(2)
  for (const [sql, values] of run.query.mock.calls) {
    expect(sql).toContain('a.evaluator_user_id=$2')
    expect(sql).toContain('s.scheduled_end_at>$4')
    expect(sql).toContain('s.scheduled_start_at<$5')
    expect(values[1]).toBe(evaluatorId)
  }
  expect(run.query.mock.calls[1][0]).toContain('e.address_text AS "establishmentAddress"')
})
