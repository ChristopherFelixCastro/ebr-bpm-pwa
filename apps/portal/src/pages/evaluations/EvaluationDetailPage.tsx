import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { CoreApiError } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { evaluationDetail, getReportContent, recalculate, saveReportContent, type EvaluationDetail, type ReportContent } from '../../api/evaluation'
import { routeForError, supportMessage } from '../../api/presentation'
import { displayLabel } from '../../api/displayLabels'
import { useSession } from '../../session/SessionContext'

const money = (value: number | string | null | undefined) => value == null ? '—' : Number(value).toLocaleString('es-DO', { maximumFractionDigits: 2 })

export function EvaluationDetailPage() {
  const { id = '' } = useParams(), navigate = useNavigate()
  const { user, runWithReauthentication } = useSession()
  const [detail, setDetail] = useState<EvaluationDetail | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(''), [reason, setReason] = useState('')
  const [reportContent, setReportContent] = useState<ReportContent | null>(null)
  const [contentForm, setContentForm] = useState({ executiveSummary: '', additionalFindings: '', recommendations: '' })
  const [confirmOfficialize, setConfirmOfficialize] = useState(false)
  const load = useCallback(async () => {
    try {
      const next = await evaluationDetail(id)
      setDetail(next); setError('')
      if ((user?.roleCode === 'COORDINATOR' || user?.roleCode === 'UNIVERSAL') && next.evaluation.lifecycleStatus === 'APPROVED' && !next.reports.some((item) => item.status === 'OFFICIAL')) {
        try {
          const received = (await getReportContent(id)).data
          const content = {
            ...received,
            executiveSummary: received.executiveSummary ?? '',
            additionalFindings: received.additionalFindings ?? '',
            recommendations: received.recommendations ?? '',
          }
          setReportContent(content)
          setContentForm({ executiveSummary: content.executiveSummary, additionalFindings: content.additionalFindings, recommendations: content.recommendations })
        } catch (cause) {
          setReportContent(null)
          setError(cause instanceof CoreApiError && cause.status === 404
            ? 'No se pudo cargar la preparación del informe. Reinicie la API con la versión actual de RF-16 y vuelva a abrir esta evaluación.'
            : supportMessage(cause, 'No se pudo cargar la preparación del informe.'))
        }
      } else {
        setReportContent(null)
      }
    }
    catch (cause) { const route = routeForError(cause); if (route) navigate(route, { replace: true }); else setError(supportMessage(cause, 'No se pudo cargar la evaluación.')) }
  }, [id, navigate, user?.roleCode])
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
  const contentDirty = Boolean(reportContent && (contentForm.executiveSummary !== reportContent.executiveSummary || contentForm.additionalFindings !== reportContent.additionalFindings || contentForm.recommendations !== reportContent.recommendations))
  const contentReady = Boolean(reportContent && reportContent.executiveSummary.trim() && reportContent.recommendations.trim() && !contentDirty)
  const usableDraft = draft?.renderVariant === 'SIRA_V2' && contentReady && draft.reportContentVersion === reportContent?.version
  const canViewDraft = draft?.renderVariant === 'SIRA_V2'
  const canRecalculate = institutional && evaluation.inspectionStatus === 'SUBMITTED' && !official && !closure
  const openReport = async (reportId: string | undefined) => {
    if (!reportId) return
    setBusy('Descarga'); setError('')
    try {
      const response = await core.reportDownloadUrl(id, reportId)
      const link = document.createElement('a'); link.href = response.data.signedUrl; link.rel = 'noopener noreferrer'; link.target = '_blank'; document.body.append(link); link.click(); link.remove()
    } catch (cause) { setError(supportMessage(cause, 'No se pudo abrir el informe.')) }
    finally { setBusy('') }
  }
  const saveContent = async () => {
    if (!reportContent) return
    setBusy('Guardar contenido'); setError('')
    try { const saved = (await saveReportContent(id, { version: reportContent.version, ...contentForm })).data; setReportContent(saved); setContentForm({ executiveSummary: saved.executiveSummary, additionalFindings: saved.additionalFindings, recommendations: saved.recommendations }) }
    catch (cause) { if (cause instanceof CoreApiError && cause.status === 409) await load(); setError(supportMessage(cause, 'No fue posible guardar el contenido del informe.')) }
    finally { setBusy('') }
  }
  return <Stack spacing={2}>
    <Box><Button onClick={() => navigate('/evaluaciones')}>← Evaluaciones</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>Evaluación {id.slice(0, 8)}</Typography><Typography color="text.secondary">{evaluation.companyName || 'Sin empresa'} · {evaluation.establishmentName || 'Sin establecimiento'} · {displayLabel(evaluation.lifecycleStatus)}</Typography></Box>
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
      {operates && evaluation.lifecycleStatus === 'READY_FOR_REVIEW' && <Button variant="contained" disabled={!!busy} onClick={() => void act('Abrir revisión', () => core.openReview(id))}>Abrir revisión</Button>}
      {operates && review && ['PENDING_REVIEW', 'RESUBMITTED'].includes(review.status) && <Button variant="contained" onClick={() => navigate(`/evaluaciones/${id}/revision`)}>Revisar</Button>}
      {operates && evaluation.lifecycleStatus === 'APPROVED' && !official && !closure && <Button disabled={!!busy || !contentReady} onClick={() => void act('Generar informe', async () => { const key = `portal-report-operation:${user?.id}:${id}`; const operationId = sessionStorage.getItem(key) || crypto.randomUUID(); sessionStorage.setItem(key, operationId); const result = await core.generateReport(id, operationId); sessionStorage.removeItem(key); if (result.data.status !== 'DRAFT' || result.data.renderVariant !== 'SIRA_V2') throw new Error('El servicio de informes está desactualizado. Reinicie Core y regenere el borrador.') })}>{draft ? 'Regenerar borrador' : 'Generar informe'}</Button>}
      {operates && evaluation.lifecycleStatus === 'APPROVED' && !official && !closure && <Button disabled={!!busy || !usableDraft} onClick={() => setConfirmOfficialize(true)}>Oficializar informe</Button>}
      {institutional && <Button disabled={!!busy || !canViewDraft} onClick={() => void openReport(draft?.id)}>Ver borrador PDF</Button>}
      {institutional && <Button disabled={!!busy || !official} onClick={() => void openReport(official?.id)}>Ver informe oficial</Button>}
      {operates && official && !closure && <Button disabled={!!busy} color="secondary" variant="contained" onClick={() => void act('Cerrar expediente', () => core.closeInspection(id, official.id))}>Cerrar expediente</Button>}
    </Stack>
    {operates && evaluation.lifecycleStatus === 'APPROVED' && !official && !closure && <Card sx={{ p: 2 }}><Stack spacing={2}>
      <Box><Typography variant="h6" sx={{ fontWeight: 750 }}>Preparar contenido del informe</Typography><Typography color="text.secondary">Redacte el resumen y las recomendaciones antes de generar el borrador. El PDF incorporará también los criterios incumplidos o parcialmente cumplidos, sus observaciones y las evidencias del expediente.</Typography></Box>
      <TextField label="Resumen ejecutivo" required multiline minRows={4} value={contentForm.executiveSummary} onChange={(event) => setContentForm((current) => ({ ...current, executiveSummary: event.target.value }))} slotProps={{ htmlInput: { maxLength: 4000 } }} />
      <TextField label="Hallazgos adicionales" multiline minRows={3} value={contentForm.additionalFindings} onChange={(event) => setContentForm((current) => ({ ...current, additionalFindings: event.target.value }))} helperText="Los hallazgos asociados a los criterios BPM se incorporan automáticamente." slotProps={{ htmlInput: { maxLength: 4000 } }} />
      <TextField label="Recomendaciones" required multiline minRows={4} value={contentForm.recommendations} onChange={(event) => setContentForm((current) => ({ ...current, recommendations: event.target.value }))} slotProps={{ htmlInput: { maxLength: 4000 } }} />
      <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={!!busy || !reportContent || !contentForm.executiveSummary.trim() || !contentForm.recommendations.trim() || !contentDirty} onClick={() => void saveContent()}>Guardar contenido</Button>
      {draft && draft.reportContentVersion !== reportContent?.version && <Alert severity="warning">El contenido cambió después de generar el borrador. Regenérelo y revíselo antes de oficializar.</Alert>}
    </Stack></Card>}
    {canRecalculate && <Card sx={{ p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField label="Motivo de recálculo" value={reason} onChange={(event) => setReason(event.target.value)} fullWidth slotProps={{ htmlInput: { maxLength: 500 } }} /><Button disabled={!!busy || !reason.trim()} onClick={() => void act('Recalcular', async () => { await recalculate(id, reason.trim()); setReason('') })}>Recalcular</Button></Stack></Card>}
    {draft && draft.renderVariant !== 'SIRA_V2' && <Alert severity="warning">Este borrador se creó con el generador anterior y puede mostrar un título incorrecto. Reinicie el servicio y pulse «Regenerar borrador» antes de abrirlo u oficializarlo.</Alert>}
    <Card sx={{ p: 2 }}><Typography variant="h6">Cálculo vigente</Typography>{calculation ? <><Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }} useFlexGap><Typography>BPM: {money(calculation.bpmPercentage)} %</Typography><Typography>Riesgo producto: {money(calculation.productRiskScore)}</Typography><Typography>Riesgo establecimiento: {money(calculation.establishmentRiskScore)}</Typography><Typography>Riesgo total: {money(calculation.totalRiskScore)}</Typography><Typography>Frecuencia: {displayLabel(calculation.frequency)}</Typography></Stack><Divider sx={{ my: 2 }} /><Typography variant="subtitle1">Factores</Typography><Table size="small"><TableHead><TableRow><TableCell>Factor</TableCell><TableCell>Selección</TableCell><TableCell>Peso</TableCell><TableCell>Aporte</TableCell></TableRow></TableHead><TableBody>{calculation.snapshots?.factors.map((factor) => <TableRow key={factor.riskFactorId}><TableCell>{factor.factorName}</TableCell><TableCell>{factor.optionLabel}</TableCell><TableCell>{money(factor.weight)}</TableCell><TableCell>{money(factor.weightedContribution)}</TableCell></TableRow>)}</TableBody></Table></> : <Typography>Aún no hay cálculo vigente.</Typography>}</Card>
    <Card sx={{ p: 2 }}><Typography variant="h6">Revisión</Typography>{review ? <><Typography>Estado: {displayLabel(review.status)} · Ciclo {review.cycleNumber} · Devoluciones {review.returnCount}</Typography>{review.returnReason && <Alert severity="warning" sx={{ my: 1 }}>{review.returnReason}</Alert>}{review.events?.map((event) => <Typography key={event.id} variant="body2">{displayLabel(event.eventType)} · {new Date(event.occurredAt).toLocaleString('es-DO')}</Typography>)}</> : <Typography>Aún no se ha abierto revisión.</Typography>}</Card>
    <Card sx={{ p: 2 }}><Typography variant="h6">Informes y cierre</Typography>{reports.length ? reports.map((report) => <Box key={report.id} sx={{ mt: 1 }}><Typography>{report.status === 'DRAFT' ? 'Borrador no oficial' : 'Informe oficial'} · {report.verificationId} · {new Date(report.generatedAt).toLocaleString('es-DO')}</Typography></Box>) : <Typography>Sin informes. Genere primero un borrador.</Typography>}{closure && <Alert severity="success" sx={{ mt: 1 }}>Expediente cerrado el {new Date(closure.closedAt).toLocaleString('es-DO')}.</Alert>}</Card>
    <Card sx={{ p: 2 }}><Typography variant="h6">Cobertura BPM</Typography><Typography>{workPackage.responses.length} respuestas de {workPackage.bpmTemplate.items.filter((item) => item.isEvaluable).length} criterios evaluables.</Typography></Card>
    <Dialog open={confirmOfficialize} onClose={() => setConfirmOfficialize(false)}><DialogTitle>¿Oficializar este informe?</DialogTitle><DialogContent><DialogContentText>Revise el borrador PDF antes de continuar. La oficialización creará el informe oficial y no se puede deshacer.</DialogContentText></DialogContent><DialogActions><Button onClick={() => setConfirmOfficialize(false)}>Cancelar</Button><Button variant="contained" disabled={!usableDraft || !!busy} onClick={() => { if (!usableDraft || !draft) return; setConfirmOfficialize(false); void act('Oficializar informe', () => core.officializeReport(id, draft.id)) }}>Sí, oficializar</Button></DialogActions></Dialog>
  </Stack>
}
