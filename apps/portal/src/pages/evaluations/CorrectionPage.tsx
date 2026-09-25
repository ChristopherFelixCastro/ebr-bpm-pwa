import { useCallback, useEffect, useState } from 'react'
import { orderBpmItems } from '../../field/bpmOrder'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { CoreApiError, type CoreInspection, type CoreReview, type CoreWorkPackage } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { resubmitCorrection, saveCorrection } from '../../api/evaluation'
import { routeForError, supportMessage } from '../../api/presentation'
import { useSession } from '../../session/SessionContext'

type BpmValue = 'C' | 'CP' | 'IT' | 'NA'
type Draft = { responseValue: BpmValue; observations: string }
type CorrectionData = { inspection: CoreInspection; review: CoreReview; workPackage: CoreWorkPackage }
const values: BpmValue[] = ['C', 'CP', 'IT', 'NA']

export function CorrectionPage() {
  const { id = '' } = useParams(), navigate = useNavigate()
  const { user } = useSession()
  const [data, setData] = useState<CorrectionData | null>(null), [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [error, setError] = useState(''), [busy, setBusy] = useState('')
  const load = useCallback(async () => {
    try {
      const [inspection, review, workPackage] = await Promise.all([core.inspection(id), core.currentReview(id), core.workPackage(id)])
      if (inspection.data.evaluatorUserId !== user?.id || review.data.status !== 'RETURNED_FOR_CORRECTION') { navigate('/denegado', { replace: true }); return }
      setData({ inspection: inspection.data, review: review.data, workPackage: workPackage.data })
      setDrafts((current) => {
        const next = { ...current }
        for (const item of review.data.correctionItems?.filter((entry) => entry.returnNumber === review.data.returnCount) ?? []) {
          if (next[item.bpmItemId]) continue
          const response = workPackage.data.responses.find((entry) => entry.bpmItemId === item.bpmItemId)
          next[item.bpmItemId] = { responseValue: (response?.responseValue || 'C') as BpmValue, observations: response?.observations || '' }
        }
        return next
      })
    } catch (cause) { const route = routeForError(cause); if (route) navigate(route, { replace: true }); else setError(supportMessage(cause, 'No se pudo cargar la devolución.')) }
  }, [id, navigate, user?.id])
  useEffect(() => { void load() }, [load])
  const act = async (label: string, action: () => Promise<unknown>, refresh = true) => {
    if (!navigator.onLine || !core.authenticated) { setError('Conéctese con Core para corregir o reenviar.'); return }
    setBusy(label); setError('')
    try { await action(); if (refresh) await load() }
    catch (cause) { if (cause instanceof CoreApiError && cause.status === 409) await load(); setError(supportMessage(cause, `${label} no pudo completarse. Compare la versión actual sin perder su texto.`)) }
    finally { setBusy('') }
  }
  if (!data) return error ? <Alert severity="error">{error}</Alert> : <Typography>Cargando correcciones…</Typography>
  const { inspection, review, workPackage } = data
  const position = new Map(orderBpmItems(workPackage.bpmTemplate.items).map(({ item }, index) => [item.id, index]))
  const items = (review.correctionItems?.filter((entry) => entry.returnNumber === review.returnCount) ?? [])
    .sort((a, b) => (position.get(a.bpmItemId) ?? Infinity) - (position.get(b.bpmItemId) ?? Infinity))
  const canResubmit = items.length > 0 && items.every((entry) => entry.status === 'CORRECTED')
  return <Stack spacing={2}>
    <Box><Button onClick={() => navigate('/campo/correcciones')}>← Correcciones</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>Corregir inspección {id.slice(0, 8)}</Typography><Typography color="text.secondary">Versión Core {inspection.version} · devolución {review.returnCount}. Reenvío únicamente online.</Typography></Box>
    <Alert severity="info">Guardar una corrección sustituye la respuesta registrada en Core. La respuesta es obligatoria para el reenvío y no se puede eliminar desde este flujo.</Alert>
    {review.returnReason && <Alert severity="warning">{review.returnReason}</Alert>}{error && <Alert severity="error">{error}</Alert>}
    {items.map((entry) => {
      const criterion = workPackage.bpmTemplate.items.find((item) => item.id === entry.bpmItemId)
      const draft = drafts[entry.bpmItemId] ?? { responseValue: 'C' as const, observations: '' }
      const editable = entry.status === 'OPEN'
      return <Card key={entry.id} sx={{ p: 2 }}><Stack spacing={1.5}><Typography variant="h6">{criterion?.displayCode || 'Criterio'} · {criterion?.title || entry.bpmItemId}</Typography><Typography color="text.secondary">{entry.status === 'CORRECTED' ? 'Corrección registrada en Core' : 'Pendiente de corrección'}</Typography>
        {editable && <><TextField select label="Respuesta BPM" value={draft.responseValue} onChange={(event) => setDrafts((current) => ({ ...current, [entry.bpmItemId]: { ...draft, responseValue: event.target.value as BpmValue } }))}>{values.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><TextField label="Observaciones" multiline minRows={2} value={draft.observations} slotProps={{ htmlInput: { maxLength: 2000 } }} onChange={(event) => setDrafts((current) => ({ ...current, [entry.bpmItemId]: { ...draft, observations: event.target.value } }))} /><Button variant="contained" disabled={!!busy} onClick={() => void act('Guardar corrección', () => saveCorrection(id, review.id, entry.bpmItemId, { baseVersion: inspection.version, responseValue: draft.responseValue, observations: draft.observations.trim() || null }))}>Guardar corrección</Button></>}
      </Stack></Card>
    })}
    {canResubmit && <Button variant="contained" disabled={!!busy} onClick={() => void act('Reenviar revisión', async () => { await resubmitCorrection(id, review.id); navigate('/campo/correcciones') }, false)}>Reenviar a revisión</Button>}
  </Stack>
}
