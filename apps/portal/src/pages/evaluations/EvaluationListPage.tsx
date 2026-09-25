import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, Chip, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { type AnalyticsEvaluation, type AnalyticsLifecycleStatus, type AnalyticsSummary, type RiskLevel } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { routeForError, supportMessage } from '../../api/presentation'

type Mode = 'evaluations' | 'reports' | 'history'
const labels: Record<Mode, string> = { evaluations: 'Evaluaciones', reports: 'Informes oficiales', history: 'Histórico de cierres' }
const states: AnalyticsLifecycleStatus[] = ['READY_FOR_REVIEW', 'PENDING_REVIEW', 'RETURNED_FOR_CORRECTION', 'RESUBMITTED', 'APPROVED', 'CLOSED', 'DRAFT', 'IN_PROGRESS', 'PENDING_SUBMISSION']

export function EvaluationListPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<AnalyticsEvaluation[]>([])
  const [page, setPage] = useState(0), [limit, setLimit] = useState(20), [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState(''), [search, setSearch] = useState('')
  const [status, setStatus] = useState<AnalyticsLifecycleStatus | ''>(''), [risk, setRisk] = useState<RiskLevel | ''>('')
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null), [summaryError, setSummaryError] = useState('')
  useEffect(() => {
    if (mode !== 'evaluations') return
    let active = true
    void core.analyticsSummary().then(({ data }) => { if (active) { setSummary(data); setSummaryError('') } })
      .catch((cause) => { if (active) setSummaryError(supportMessage(cause, 'No fue posible cargar el resumen institucional.')) })
    return () => { active = false }
  }, [mode])
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await core.analyticsEvaluations({ page: page + 1, limit, search: search || undefined,
        lifecycleStatus: mode === 'history' ? 'CLOSED' : mode === 'evaluations' ? status || undefined : undefined,
        riskLevel: mode === 'evaluations' ? risk || undefined : undefined, reportStatus: mode === 'reports' ? 'OFFICIAL' : undefined })
      setItems(result.data); setTotal(result.meta.total ?? result.data.length)
    } catch (cause) { const route = routeForError(cause); if (route) navigate(route, { replace: true }); else setError(supportMessage(cause, 'No fue posible cargar los resultados.')) }
    finally { setLoading(false) }
  }, [limit, mode, navigate, page, risk, search, status])
  useEffect(() => { void load() }, [load])
  return <Stack spacing={2}>
    <Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{labels[mode]}</Typography><Typography color="text.secondary">Datos vigentes del Core, paginados y sin registros simulados.</Typography></Box>
    {mode === 'evaluations' && <Card sx={{ p: 2 }}><Typography variant="h6">Resumen institucional</Typography><Typography variant="body2" color="text.secondary">Totales globales de Core; los filtros de la tabla no modifican este resumen.</Typography>
      {summaryError && <Alert severity="error" sx={{ mt: 1 }}>{summaryError}</Alert>}
      {!summary && !summaryError && <CircularProgress size={24} sx={{ mt: 1 }} />}
      {summary && <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
        {[['Inspecciones', summary.total], ['Listas para revisión', summary.readyForReview], ['En revisión', summary.pendingReview], ['Devueltas', summary.returnedForCorrection], ['Aprobadas', summary.approved], ['Informes oficiales', summary.officialReports], ['Cerradas', summary.closed], ['Riesgo bajo', summary.byRisk.LOW], ['Riesgo medio', summary.byRisk.MEDIUM], ['Riesgo alto', summary.byRisk.HIGH]].map(([label, value]) =>
          <Box key={label} sx={{ minWidth: 125 }}><Typography variant="h6">{value}</Typography><Typography variant="body2" color="text.secondary">{label}</Typography></Box>)}
      </Stack>}
    </Card>}
    <Card sx={{ p: 2 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
      <TextField size="small" label="Empresa, establecimiento, evaluador o identificador" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} fullWidth />
      {mode === 'evaluations' && <><TextField size="small" select label="Estado" value={status} onChange={(event) => { setStatus(event.target.value as AnalyticsLifecycleStatus | ''); setPage(0) }} sx={{ minWidth: 210 }}><MenuItem value="">Todos</MenuItem>{states.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><TextField size="small" select label="Riesgo" value={risk} onChange={(event) => { setRisk(event.target.value as RiskLevel | ''); setPage(0) }} sx={{ minWidth: 130 }}><MenuItem value="">Todos</MenuItem>{(['LOW', 'MEDIUM', 'HIGH'] as const).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField></>}
      <Button onClick={() => { setSearch(searchInput.trim()); setPage(0) }}>Buscar</Button>
    </Stack></Card>
    {error && <Alert severity="error">{error}</Alert>}
    <Card><TableContainer><Table><TableHead><TableRow><TableCell>Evaluación</TableCell><TableCell>Empresa / establecimiento</TableCell><TableCell>Estado</TableCell><TableCell>Riesgo</TableCell><TableCell>Informe</TableCell><TableCell /></TableRow></TableHead><TableBody>
      {loading ? <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={6}>No hay resultados.</TableCell></TableRow> : items.map((item) => <TableRow key={item.id}><TableCell>{item.id.slice(0, 8)}<Typography variant="caption" sx={{ display: 'block' }}>{item.evaluatorName}</Typography></TableCell><TableCell>{item.companyTradeName || item.companyName || 'Sin empresa'}<Typography variant="caption" sx={{ display: 'block' }}>{item.establishmentName || 'Sin establecimiento'}</Typography></TableCell><TableCell><Chip size="small" label={item.lifecycleStatus} /></TableCell><TableCell>{item.riskLevel || 'Sin cálculo'}</TableCell><TableCell>{item.latestReport?.status || '—'}</TableCell><TableCell><Button size="small" onClick={() => navigate(`/evaluaciones/${item.id}`)}>Abrir</Button></TableCell></TableRow>)}
    </TableBody></Table></TableContainer><TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Filas por página:" /></Card>
  </Stack>
}
