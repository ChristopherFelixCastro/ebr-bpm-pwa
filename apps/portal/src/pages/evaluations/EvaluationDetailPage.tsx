import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { CoreApiError } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { evaluationDetail, recalculate, type EvaluationDetail } from '../../api/evaluation'
import { routeForError, supportMessage } from '../../api/presentation'
import { useSession } from '../../session/SessionContext'

const money = (value: number | string | null | undefined) => value == null ? '—' : Number(value).toLocaleString('es-DO', { maximumFractionDigits: 2 })

export function EvaluationDetailPage() {
  const { id = '' } = useParams(), navigate = useNavigate()
  const { user, runWithReauthentication } = useSession()
  const [detail, setDetail] = useState<EvaluationDetail | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(''), [reason, setReason] = useState('')
  const load = useCallback(async () => {
    try { setDetail(await evaluationDetail(id)); setError('') }
    catch (cause) { const route = routeForError(cause); if (route) navigate(route, { replace: true }); else setError(supportMessage(cause, 'No se pudo cargar la evaluación.')) }
  }, [id, navigate])
  useEffect(() => { void load() }, [load])
  const act = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label); setError('')
    try { await runWithReauthentication(action); await load() }
    catch (cause) { if (cause instanceof CoreApiError && cause.status === 409) await load(); setError(supportMessage(cause, `${label} no pudo completarse.`)) }
    finally { setBusy('') }
  }
  if (!detail) return <Stack spacing={2}>{error ? <Alert severity="error">{error}</Alert> : <Typography>Cargando evaluación…</Typography>}</Stack>
  const { evaluation, calculation, review, reports, closure, workPackage } = detail
  const institutional = user?.roleCode === 'ADMIN' || user?.roleCode === 'COORDINATOR' || user?.roleCode === 'UNIVERSAL'
  const operates = user?.roleCode === 'COORDINATOR' || user?.roleCode === 'UNIVERSAL'
  const official = reports.find((item) => item.status === 'OFFICIAL'), draft = reports.find((item) => item.status === 'DRAFT')
  const canRecalculate = institutional && evaluation.inspectionStatus === 'SUBMITTED' && !official && !closure
  const download = async () => {
    if (!official) return
    setBusy('Descarga'); setError('')
    try {
      const response = await core.reportDownloadUrl(id, official.id)
      const link = document.createElement('a'); link.href = response.data.signedUrl; link.rel = 'noopener noreferrer'; link.target = '_blank'; document.body.append(link); link.click(); link.remove()
    } catch (cause) { setError(supportMessage(cause, 'No se pudo abrir el informe.')) }
    finally { setBusy('') }
  }
  return <Stack spacing={2}>
    <Box><Button onClick={() => navigate('/evaluaciones')}>← Evaluaciones</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>Evaluación {id.slice(0, 8)}</Typography><Typography color="text.secondary">{evaluation.companyName || 'Sin empresa'} · {evaluation.establishmentName || 'Sin establecimiento'} · {evaluation.lifecycleStatus}</Typography></Box>
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
      {operates && evaluation.lifecycleStatus === 'READY_FOR_REVIEW' && <Button variant="contained" disabled={!!busy} onClick={() => void act('Abrir revisión', () => core.openReview(id))}>Abrir revisión</Button>}
      {operates && review && ['PENDING_REVIEW', 'RESUBMITTED'].includes(review.status) && <Button variant="contained" onClick={() => navigate(`/evaluaciones/${id}/revision`)}>Revisar</Button>}
      {operates && evaluation.lifecycleStatus === 'APPROVED' && !official && !closure && <Button disabled={!!busy} onClick={() => void act('Generar informe', async () => { const key = `portal-report-operation:${user?.id}:${id}`; const operationId = sessionStorage.getItem(key) || crypto.randomUUID(); sessionStorage.setItem(key, operationId); await core.generateReport(id, operationId); sessionStorage.removeItem(key) })}>{draft ? 'Regenerar borrador' : 'Generar informe'}</Button>}
      {operates && evaluation.lifecycleStatus === 'APPROVED' && draft && !closure && <Button disabled={!!busy} onClick={() => void act('Oficializar informe', () => core.officializeReport(id, draft.id))}>Oficializar informe</Button>}
      {official && institutional && <Button disabled={!!busy} onClick={() => void download()}>Descargar informe oficial</Button>}
      {operates && official && !closure && <Button disabled={!!busy} color="secondary" variant="contained" onClick={() => void act('Cerrar expediente', () => core.closeInspection(id, official.id))}>Cerrar expediente</Button>}
    </Stack>
    {canRecalculate && <Card sx={{ p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField label="Motivo de recálculo" value={reason} onChange={(event) => setReason(event.target.value)} fullWidth slotProps={{ htmlInput: { maxLength: 500 } }} /><Button disabled={!!busy || !reason.trim()} onClick={() => void act('Recalcular', async () => { await recalculate(id, reason.trim()); setReason('') })}>Recalcular</Button></Stack></Card>}
    <Card sx={{ p: 2 }}><Typography variant="h6">Cálculo vigente</Typography>{calculation ? <><Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }} useFlexGap><Typography>BPM: {money(calculation.bpmPercentage)} %</Typography><Typography>Riesgo producto: {money(calculation.productRiskScore)}</Typography><Typography>Riesgo establecimiento: {money(calculation.establishmentRiskScore)}</Typography><Typography>Riesgo total: {money(calculation.totalRiskScore)}</Typography><Typography>Frecuencia: {calculation.frequency}</Typography></Stack><Divider sx={{ my: 2 }} /><Typography variant="subtitle1">Factores</Typography><Table size="small"><TableHead><TableRow><TableCell>Factor</TableCell><TableCell>Selección</TableCell><TableCell>Peso</TableCell><TableCell>Aporte</TableCell></TableRow></TableHead><TableBody>{calculation.snapshots?.factors.map((factor) => <TableRow key={factor.riskFactorId}><TableCell>{factor.factorName}</TableCell><TableCell>{factor.optionLabel}</TableCell><TableCell>{money(factor.weight)}</TableCell><TableCell>{money(factor.weightedContribution)}</TableCell></TableRow>)}</TableBody></Table></> : <Typography>Aún no hay cálculo vigente.</Typography>}</Card>
    <Card sx={{ p: 2 }}><Typography variant="h6">Revisión</Typography>{review ? <><Typography>Estado: {review.status} · Ciclo {review.cycleNumber} · Devoluciones {review.returnCount}</Typography>{review.returnReason && <Alert severity="warning" sx={{ my: 1 }}>{review.returnReason}</Alert>}{review.events?.map((event) => <Typography key={event.id} variant="body2">{event.eventType} · {new Date(event.occurredAt).toLocaleString('es-DO')}</Typography>)}</> : <Typography>Aún no se ha abierto revisión.</Typography>}</Card>
    <Card sx={{ p: 2 }}><Typography variant="h6">Informes y cierre</Typography>{reports.length ? reports.map((report) => <Typography key={report.id}>{report.status} · {report.verificationId} · {new Date(report.generatedAt).toLocaleString('es-DO')}</Typography>) : <Typography>Sin informes.</Typography>}{closure && <Alert severity="success" sx={{ mt: 1 }}>Expediente cerrado el {new Date(closure.closedAt).toLocaleString('es-DO')}.</Alert>}</Card>
    <Card sx={{ p: 2 }}><Typography variant="h6">Cobertura BPM</Typography><Typography>{workPackage.responses.length} respuestas de {workPackage.bpmTemplate.items.filter((item) => item.isEvaluable).length} criterios evaluables.</Typography></Card>
  </Stack>
}
