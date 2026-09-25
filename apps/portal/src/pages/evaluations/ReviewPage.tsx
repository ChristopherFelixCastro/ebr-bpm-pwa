import { useCallback, useEffect, useState } from 'react'
import { orderBpmItems } from '../../field/bpmOrder'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, Checkbox, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material'
import { CoreApiError } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { evaluationDetail, type EvaluationDetail } from '../../api/evaluation'
import { routeForError, supportMessage } from '../../api/presentation'
import { useSession } from '../../session/SessionContext'

export function ReviewPage() {
  const { id = '' } = useParams(), navigate = useNavigate()
  const { user, runWithReauthentication } = useSession()
  const [detail, setDetail] = useState<EvaluationDetail | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [decision, setDecision] = useState<'APPROVE' | 'RETURN'>('APPROVE'), [reason, setReason] = useState(''), [selected, setSelected] = useState<string[]>([])
  const load = useCallback(async () => {
    try { setDetail(await evaluationDetail(id)) }
    catch (cause) { const route = routeForError(cause); if (route) navigate(route, { replace: true }); else setError(supportMessage(cause, 'No se pudo cargar la revisión.')) }
  }, [id, navigate])
  useEffect(() => { void load() }, [load])
  const review = detail?.review
  const canDecide = (user?.roleCode === 'COORDINATOR' || user?.roleCode === 'UNIVERSAL') && review && ['PENDING_REVIEW', 'RESUBMITTED'].includes(review.status)
  const save = async () => {
    if (!review || !canDecide || (decision === 'RETURN' && (!reason.trim() || !selected.length))) return
    setBusy(true); setError('')
    try {
      await runWithReauthentication(() => decision === 'RETURN' ? core.returnReview(id, review.id, reason.trim(), selected) : core.approveReview(id, review.id, reason.trim() || undefined))
      navigate(`/evaluaciones/${id}`)
    } catch (cause) {
      if (cause instanceof CoreApiError && cause.status === 409) await load()
      setError(supportMessage(cause, 'La decisión no pudo registrarse. Revise el estado actualizado.'))
    } finally { setBusy(false) }
  }
  if (!detail) return error ? <Alert severity="error">{error}</Alert> : <Typography>Cargando revisión…</Typography>
  const responses = new Map(detail.workPackage.responses.map((entry) => [entry.bpmItemId, entry]))
  const criteria = orderBpmItems(detail.workPackage.bpmTemplate.items).map(({ item }) => item).filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable)
  return <Stack spacing={2}>
    <Box><Button onClick={() => navigate(`/evaluaciones/${id}`)}>← Evaluación</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>Revisión institucional</Typography></Box>
    {error && <Alert severity="error">{error}</Alert>}
    {!canDecide ? <Alert severity="info">Esta revisión no admite decisiones para su rol o estado actual.</Alert> : <>
      <Card sx={{ p: 2 }}><RadioGroup row value={decision} onChange={(event) => { setDecision(event.target.value as 'APPROVE' | 'RETURN'); setSelected([]) }}><FormControlLabel value="APPROVE" control={<Radio />} label="Aprobar" /><FormControlLabel value="RETURN" control={<Radio />} label="Devolver para corrección" /></RadioGroup><TextField fullWidth multiline minRows={2} label={decision === 'RETURN' ? 'Motivo obligatorio' : 'Nota opcional'} value={reason} onChange={(event) => setReason(event.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} /></Card>
      {decision === 'RETURN' && <Card sx={{ p: 2 }}><Typography variant="h6">Criterios habilitados para corrección</Typography>{criteria.map((item) => <Box key={item.id} sx={{ py: 1 }}><FormControlLabel control={<Checkbox checked={selected.includes(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />} label={`${item.displayCode || ''} ${item.title} · ${responses.get(item.id)?.responseValue || 'Sin respuesta'}`} /></Box>)}</Card>}
      <Button variant="contained" disabled={busy || (decision === 'RETURN' && (!reason.trim() || !selected.length))} onClick={() => void save()}>Registrar decisión</Button>
    </>}
  </Stack>
}
