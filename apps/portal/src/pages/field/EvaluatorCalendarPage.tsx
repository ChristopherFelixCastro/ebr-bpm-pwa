import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, FormControlLabel, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import type { CoreInspection } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { operationApi, type Schedule } from '../../api/operation'
import { supportMessage } from '../../api/presentation'
import { useSession } from '../../session/SessionContext'
import { calendarDayLabel, calendarDays, calendarRange, moveCalendarDate, scheduleOnDay, scheduleTime, todayInDominicanRepublic, type CalendarView } from './calendarDates'

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function EvaluatorCalendarPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const [view, setView] = useState<CalendarView>('week')
  const [date, setDate] = useState(() => todayInDominicanRepublic())
  const [showChanges, setShowChanges] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState<string | null>(null)
  const days = useMemo(() => calendarDays(date, view), [date, view])
  const range = useMemo(() => calendarRange(days), [days])
  const today = todayInDominicanRepublic()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const load = async () => {
      try {
        const all: Schedule[] = []
        let page = 1
        while (true) {
          const result = await operationApi.schedules({ page, limit: 100, ...(showChanges ? {} : { status: 'SCHEDULED' }), ...range })
          all.push(...result.data)
          if (!result.data.length || all.length >= (result.meta.total ?? all.length)) break
          page += 1
        }
        if (active) setSchedules(all.sort((left, right) => new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime()))
      } catch (cause) {
        if (active) { setSchedules([]); setError(supportMessage(cause, 'No fue posible cargar su calendario.')) }
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [range, showChanges, user?.id])

  const openInspection = async (schedule: Schedule) => {
    setOpening(schedule.id)
    setError('')
    try {
      const result = await core.request<CoreInspection[]>(`/v1/inspections?page=1&limit=1&caseId=${encodeURIComponent(schedule.caseId)}`, { cache: 'no-store' })
      navigate(result.data[0] ? `/campo/inspecciones/${result.data[0].id}` : '/campo/asignadas')
    } catch (cause) { setError(supportMessage(cause, 'No fue posible abrir la inspección.')) }
    finally { setOpening(null) }
  }

  const visit = (schedule: Schedule, compact = false) => <Box key={schedule.id} sx={{ bgcolor: schedule.status === 'SCHEDULED' ? '#fffbeb' : '#f5f5f4', border: '1px solid #fde68a', borderLeft: `4px solid ${schedule.status === 'SCHEDULED' ? '#b45309' : '#a8a29e'}`, borderRadius: 2, p: compact ? 1 : 1.5, mb: 1 }}>
    <Typography sx={{ fontWeight: 750, fontSize: compact ? 12 : 15 }}>{schedule.establishmentName || schedule.companyTradeName || schedule.companyName || 'Caso sin establecimiento'}</Typography>
    {!compact && <>
      {schedule.establishmentName && (schedule.companyTradeName || schedule.companyName) && <Typography variant="body2">{schedule.companyTradeName || schedule.companyName}</Typography>}
      <Typography variant="body2">{schedule.establishmentAddress || 'Dirección no registrada'}</Typography>
    </>}
    <Typography variant="body2" sx={{ fontWeight: 650 }}>{scheduleTime(schedule.scheduledStartAt)} – {scheduleTime(schedule.scheduledEndAt)}</Typography>
    <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}><Chip size="small" color={schedule.status === 'SCHEDULED' ? 'success' : 'default'} label={schedule.status === 'SCHEDULED' ? 'Programada' : schedule.status === 'RESCHEDULED' ? 'Reprogramada' : 'Cancelada'} />{!compact && schedule.status === 'SCHEDULED' && <Button size="small" disabled={opening === schedule.id} onClick={() => void openInspection(schedule)}>Abrir inspección</Button>}</Stack>
  </Box>

  return <Stack spacing={2.5} sx={{ maxWidth: 1280 }}>
    <Box><Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>Mi calendario</Typography><Typography color="text.secondary">Visitas asignadas a su cuenta. La programación se muestra en horario de República Dominicana.</Typography></Box>
    <Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button aria-label="Periodo anterior" onClick={() => setDate((current) => moveCalendarDate(current, view, -1))}><ArrowBackIosNewIcon fontSize="small" /></Button>
        <Button onClick={() => setDate(today)}>Hoy</Button>
        <Button aria-label="Periodo siguiente" onClick={() => setDate((current) => moveCalendarDate(current, view, 1))}><ArrowForwardIosIcon fontSize="small" /></Button>
        <Typography sx={{ fontWeight: 750, textTransform: 'capitalize' }}>{view === 'day' ? calendarDayLabel(date, { dateStyle: 'full' }) : view === 'month' ? calendarDayLabel(date, { month: 'long', year: 'numeric' }) : `${calendarDayLabel(days[0], { day: 'numeric', month: 'short' })} – ${calendarDayLabel(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`}</Typography>
      </Stack>
      <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, next: CalendarView | null) => { if (next) setView(next) }} aria-label="Vista del calendario">
        <ToggleButton value="day">Día</ToggleButton><ToggleButton value="week">Semana</ToggleButton><ToggleButton value="month">Mes</ToggleButton>
      </ToggleButtonGroup>
    </Stack><FormControlLabel sx={{ mt: 1 }} control={<Switch checked={showChanges} onChange={(event) => setShowChanges(event.target.checked)} />} label="Mostrar visitas canceladas y reprogramadas" /></CardContent></Card>
    {error && <Alert severity="error">{error}</Alert>}
    {loading ? <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress aria-label="Cargando calendario" /></Box> : <>
      {view === 'day' ? <Card><CardContent><Typography variant="h6" sx={{ mb: 2, textTransform: 'capitalize' }}>{calendarDayLabel(date, { dateStyle: 'full' })}</Typography>{schedules.filter((item) => scheduleOnDay(item, date)).map((item) => visit(item))}{!schedules.some((item) => scheduleOnDay(item, date)) && <Alert severity="info">No tiene visitas programadas para este día.</Alert>}</CardContent></Card>
        : <Box sx={{ overflowX: 'auto' }}><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', minWidth: 840, gap: 1 }}>
          {weekdays.map((day) => <Typography key={day} sx={{ fontWeight: 750, textAlign: 'center' }}>{day}</Typography>)}
          {days.map((day) => { const visits = schedules.filter((item) => scheduleOnDay(item, day)); return <Card key={day} variant="outlined" sx={{ minHeight: view === 'month' ? 126 : 230, borderColor: day === today ? '#d97706' : '#fde68a', bgcolor: day.slice(0, 7) === date.slice(0, 7) || view === 'week' ? 'white' : '#faf7f2' }}><CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Button size="small" onClick={() => { setDate(day); setView('day') }} sx={{ minWidth: 0, fontWeight: day === today ? 850 : 650 }}>{calendarDayLabel(day, { day: 'numeric', month: 'short' })}</Button>
            {visits.map((item) => visit(item, true))}
          </CardContent></Card> })}
        </Box></Box>}
      {!schedules.length && <Alert severity="info" icon={<EventAvailableIcon />}>No tiene visitas programadas en este período. Consulte Mis inspecciones para ver las asignaciones.</Alert>}
      <Button sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/campo/asignadas')}>Ir a Mis inspecciones</Button>
    </>}
  </Stack>
}
