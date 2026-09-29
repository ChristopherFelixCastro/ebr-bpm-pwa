import { Box, Card, Stack, Typography } from '@mui/material'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import type { AnalyticsSummary } from '@ebr-bpm/core-client'

type Metric = { label: string; value: number; color: string; background: string; icon: React.ReactNode }

function MetricTile({ metric }: { metric: Metric }) {
  return <Box sx={{ minWidth: 0, minHeight: 112, p: 2, border: '1px solid #fde68a', borderRadius: 2.5, bgcolor: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: metric.background, color: metric.color, '& svg': { fontSize: 20 } }} aria-hidden="true">{metric.icon}</Box>
    <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: 29, lineHeight: 1, fontWeight: 850, color: '#451a03', fontVariantNumeric: 'tabular-nums' }}>{metric.value}</Typography>
      <Typography sx={{ fontSize: 13, lineHeight: 1.25, fontWeight: 600, color: '#451a03' }}>{metric.label}</Typography>
    </Stack>
  </Box>
}

const riskRows = [
  { key: 'LOW' as const, label: 'Bajo', color: '#15803d' },
  { key: 'MEDIUM' as const, label: 'Medio', color: '#b45309' },
  { key: 'HIGH' as const, label: 'Alto', color: '#b91c1c' },
]

export function InstitutionalSummary({ summary }: { summary: AnalyticsSummary }) {
  const attention: Metric[] = [
    { label: 'Listas para revisión', value: summary.readyForReview, color: '#b45309', background: '#fef3c7', icon: <PendingActionsOutlinedIcon /> },
    { label: 'En revisión', value: summary.pendingReview, color: '#6d28d9', background: '#ede9fe', icon: <RateReviewOutlinedIcon /> },
    { label: 'Devueltas', value: summary.returnedForCorrection, color: '#b45309', background: '#fef3c7', icon: <ReplayOutlinedIcon /> },
  ]
  const outcomes: Metric[] = [
    { label: 'Aprobadas', value: summary.approved, color: '#15803d', background: '#dcfce7', icon: <VerifiedOutlinedIcon /> },
    { label: 'Informes oficiales', value: summary.officialReports, color: '#0369a1', background: '#e0f2fe', icon: <DescriptionOutlinedIcon /> },
    { label: 'Cerradas', value: summary.closed, color: '#92400e', background: '#fde68a', icon: <TaskAltOutlinedIcon /> },
  ]
  const classified = summary.byRisk.LOW + summary.byRisk.MEDIUM + summary.byRisk.HIGH

  return <Card component="section" aria-labelledby="institutional-summary-title" sx={{ p: { xs: 2, md: 3 }, border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(120, 53, 15, .06)' }}>
    <Typography id="institutional-summary-title" variant="h6" sx={{ fontWeight: 800 }}>Resumen institucional</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Totales de todas las evaluaciones. Los filtros de la tabla no cambian este resumen.</Typography>
    <Box sx={{ bgcolor: '#78350f', color: '#fff', borderRadius: 3, p: { xs: 2.5, md: 3 }, display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: 1 }}>
      <Box><Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fde68a', textTransform: 'uppercase', letterSpacing: '.08em' }}>Panorama general</Typography><Typography sx={{ fontSize: { xs: 44, md: 52 }, lineHeight: 1.1, fontWeight: 850, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{summary.total}</Typography><Typography sx={{ fontWeight: 700, color: '#fff' }}>Inspecciones registradas</Typography></Box>
      <Typography sx={{ color: '#fef3c7', fontSize: 13, maxWidth: 220 }}>Estado actual del trabajo institucional</Typography>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mt: 3 }}>
      <Box>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Por atender</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>{attention.map((metric) => <MetricTile key={metric.label} metric={metric} />)}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Resultados</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>{outcomes.map((metric) => <MetricTile key={metric.label} metric={metric} />)}</Box>
      </Box>
    </Box>
    <Box sx={{ borderTop: '1px solid #fde68a', mt: 3, pt: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ mb: 2, justifyContent: 'space-between' }}><Typography sx={{ fontWeight: 800 }}>Riesgo calculado</Typography><Typography variant="body2" color="text.secondary">{classified} {classified === 1 ? 'inspección con riesgo calculado' : 'inspecciones con riesgo calculado'}</Typography></Stack>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {riskRows.map((row) => <Box key={row.key} sx={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr) 28px', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
          <Box sx={{ height: 12, borderRadius: 99, bgcolor: '#fef3c7', overflow: 'hidden' }} aria-hidden="true"><Box sx={{ height: '100%', width: `${classified ? (summary.byRisk[row.key] / classified) * 100 : 0}%`, bgcolor: row.color, borderRadius: 99 }} /></Box>
          <Typography variant="body2" sx={{ fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{summary.byRisk[row.key]}</Typography>
        </Box>)}
      </Box>
    </Box>
  </Card>
}
