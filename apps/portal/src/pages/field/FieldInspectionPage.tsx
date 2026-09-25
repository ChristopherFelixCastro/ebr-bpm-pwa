import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSession } from '../../session/SessionContext'
import { core } from '../../api/core'
import { CoreApiError, type CoreInspection, type CoreReport } from '@ebr-bpm/core-client'
import { supportMessage } from '../../api/presentation'
import { acknowledgeRenewalConflict, addEvidence, addFood, compareRenewalConflict, confirmFieldRenewal, downloadFieldPackage, finalizeLocal, inspectStoredFieldState, previewFieldRenewal, rebaseConflict, removePendingEvidence, reviewFieldConflict, saveLocation, saveResponse, selectFactor, syncFieldState, type BpmValue, type FieldRenewalPreview, type FieldState, type StoredFieldState } from '../../field/model'

export function FieldInspectionPage() {
  const { id = '' } = useParams()
  const { user, offlineUser, unlockVaultOnline } = useSession()
  const actor = user ?? offlineUser
  const [state, setState] = useState<FieldState | null>(null)
  const [sealed, setSealed] = useState<Extract<StoredFieldState, { status: 'EXPIRED' }> | null>(null)
  const [renewalPreview, setRenewalPreview] = useState<FieldRenewalPreview | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const [serverDenied, setServerDenied] = useState(false)
  const [coreChanged, setCoreChanged] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [foodId, setFoodId] = useState('')
  const [evidenceItemId, setEvidenceItemId] = useState('')
  const [conflictReview, setConflictReview] = useState<{ operationId: string; version: number; status: string; current: unknown; local: unknown } | null>(null)
  const [officialReport, setOfficialReport] = useState<CoreReport | null>(null)
  const reload = useCallback(async () => {
    if (!actor || !id) return
    setState(null); setSealed(null); setRenewalPreview(null); setConflictReview(null); setOfficialReport(null)
    try {
      const stored = await inspectStoredFieldState(actor.id, id)
      setServerDenied(false); setReadOnly(false); setCoreChanged(false); setError('')
      if (stored.status === 'EXPIRED') { setSealed(stored); return }
      setState(stored.state)
      if (user && navigator.onLine) {
        try {
          const fresh = (await core.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}`, { cache: 'no-store' })).data
          if (fresh.assignmentId !== stored.state.inspection.assignmentId || fresh.version !== stored.state.inspection.version || !['DRAFT', 'IN_PROGRESS'].includes(fresh.status)) {
            setCoreChanged(true)
            setError('Core cambió el estado, la asignación o la versión. Los datos locales permanecen cifrados; revise antes de renovar o sincronizar.')
          }
        } catch (failure) {
          if (failure instanceof CoreApiError && (failure.status === 403 || failure.status === 404)) { setServerDenied(true); setState(null); setError('Core denegó el acceso a esta inspección.') }
        }
      }
    }
    catch (caught) {
      if (user && navigator.onLine) {
        try {
          const pkg = (await core.request<FieldState['signedPackage']>(`/v1/inspections/${encodeURIComponent(id)}/work-package`, { cache: 'no-store' })).data
          if (!['PENDING_SUBMISSION', 'SUBMITTED'].includes(pkg.inspection.status)) throw caught
          setState({ signedPackage: pkg, permit: null, inspection: pkg.inspection, responses: pkg.responses, factorSelections: pkg.factorSelections, foodSnapshots: pkg.foodSnapshots, evidence: [], queue: [], localFinalized: false, downloadedAt: '' })
          setReadOnly(true); setCoreChanged(false); setServerDenied(false); setError('')
          return
        } catch (failure) {
          if (failure instanceof CoreApiError && (failure.status === 403 || failure.status === 404)) { setServerDenied(true); setState(null); setError('Core denegó el acceso a esta inspección.'); return }
        }
      }
      setState(null); setError(caught instanceof Error ? caught.message : 'No se pudo abrir el paquete.')
    }
  }, [actor, id, user])
  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    if (!user || user.roleCode !== 'EVALUATOR' || !navigator.onLine || state?.inspection.status !== 'SUBMITTED') return
    let active = true
    void core.reports(id).then(({ data }) => { if (active) setOfficialReport(data.find((report) => report.status === 'OFFICIAL') ?? null) })
      .catch(() => { if (active) setOfficialReport(null) })
    return () => { active = false }
  }, [id, state?.inspection.status, user])
  useEffect(() => {
    if (!state?.permit) return
    const expiresAt = Date.parse(state.permit.claims.expiresAt)
    const earliest = Date.parse(state.permit.claims.issuedAt) - 5 * 60_000
    const sealIfExpired = () => { if (Date.now() >= expiresAt || Date.now() < earliest) { setState(null); setConflictReview(null); void reload() } }
    const timer = window.setTimeout(sealIfExpired, Math.max(0, Math.min(expiresAt - Date.now(), 2_147_483_647)))
    const interval = window.setInterval(sealIfExpired, 30_000)
    window.addEventListener('focus', sealIfExpired)
    return () => { window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener('focus', sealIfExpired) }
  }, [state?.permit, reload])
  const action = async (run: () => Promise<FieldState>, onSuccess?: () => void) => {
    setBusy(true); setError('')
    try { setState(await run()); setSealed(null); onSuccess?.() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo guardar el cambio.') }
    finally { setBusy(false) }
  }
  const compareAndRenew = async () => {
    if (!user) return
    setBusy(true); setError(''); setRenewalPreview(null)
    try { setRenewalPreview(await previewFieldRenewal(user.id, id)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo comparar con Core.') }
    finally { setBusy(false) }
  }
  const openOfficialReport = async () => {
    if (!user || !officialReport) return
    setBusy(true); setError('')
    try {
      const response = await core.reportDownloadUrl(id, officialReport.id)
      const link = document.createElement('a')
      link.href = response.data.signedUrl; link.rel = 'noopener noreferrer'; link.target = '_blank'
      document.body.append(link); link.click(); link.remove()
    } catch (cause) { setError(supportMessage(cause, 'No se pudo abrir el informe oficial.')) }
    finally { setBusy(false) }
  }
  if (!actor) return <Alert severity="error">Inicie sesión o desbloquee su cuenta local.</Alert>
  const permitCurrent = !state?.permit || (Date.now() >= Date.parse(state.permit.claims.issuedAt) - 5 * 60_000 && Date.now() < Date.parse(state.permit.claims.expiresAt))
  const editing = state && permitCurrent && !readOnly && !coreChanged && !state.renewalConflict && ['DRAFT', 'IN_PROGRESS'].includes(state.inspection.status) && !state.localFinalized
  const queue = state?.queue ?? []
  return <Stack spacing={2} sx={{ maxWidth: 1100, m: 'auto', p: offlineUser ? 3 : 0 }}>
    <Button component={Link} to={offlineUser ? '/campo/paquetes' : '/campo/asignadas'} sx={{ alignSelf: 'start' }}>Volver a mis inspecciones</Button>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>Inspección de campo</Typography>
    {error && <Alert severity="warning">{error}</Alert>}
    {sealed && <Alert severity="warning">El permiso local venció o requiere validar el reloj con Core. La firma y la integridad fueron verificadas; el contenido permanece cifrado y oculto. {sealed.hasPending ? `Hay ${sealed.pendingCount} operaciones pendientes.` : 'No hay operaciones pendientes.'} Reconéctese para comparar y renovar.</Alert>}
    {user && (sealed || coreChanged) && <Button disabled={busy} onClick={() => void compareAndRenew()}>Comparar con Core</Button>}
    {renewalPreview && <Card><CardContent><Typography variant="h6">Comparación previa a la renovación</Typography>
      <Typography>Versión local {renewalPreview.localVersion}; versión Core {renewalPreview.coreVersion}; {renewalPreview.pendingCount} operaciones pendientes. Estado Core: {renewalPreview.coreStatus}.</Typography>
      {(renewalPreview.assignmentChanged || renewalPreview.definitionsChanged || !['DRAFT', 'IN_PROGRESS'].includes(renewalPreview.coreStatus))
        ? <Alert severity="warning">La asignación, las definiciones o el estado cambiaron. Los pendientes se conservan; se requiere revisión antes de renovar.</Alert>
        : <><Typography>La renovación conserva la cola y los binarios. Si cambió la versión, abrirá una comparación detallada y bloqueará el envío hasta su confirmación.</Typography>
          <Button disabled={busy} onClick={() => void action(() => confirmFieldRenewal(user!.id, id, renewalPreview), () => { setRenewalPreview(null); setCoreChanged(false) })}>Renovar y abrir revisión</Button></>}
    </CardContent></Card>}
    {!state && !sealed && user && !serverDenied && <Card><CardContent><Typography>Para abrir o descargar, desbloquee el vault con la contraseña actual de Core.</Typography>
      <TextField label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button disabled={!password} onClick={() => void unlockVaultOnline(password).then(() => { setPassword(''); void reload() }).catch((caught: Error) => setError(caught.message))}>Desbloquear</Button>
      <Button disabled={busy} onClick={() => void action(() => downloadFieldPackage(user.id, id), () => setCoreChanged(false))}>Descargar paquete</Button>
    </CardContent></Card>}
    {state && permitCurrent && <>
      {readOnly && <Alert severity="info">Vista de solo lectura obtenida de Core. Esta inspección ya no admite captura de campo.</Alert>}
      {state.renewalConflict && <Card><CardContent><Typography variant="h6">Conflicto de versión tras renovar</Typography>
        <Typography>Versión anterior {state.renewalConflict.localVersion}; versión Core {state.renewalConflict.coreVersion}. Ningún cambio local se aplicó en Core. Revise cada diferencia antes de habilitar el reintento.</Typography>
        {compareRenewalConflict(state).map((entry) => <Box key={entry.operationId} sx={{ my: 2 }}><Typography>{entry.type} · {entry.status}</Typography>
          <Typography variant="body2">Cambio local: {JSON.stringify(entry.local)}</Typography>
          <Typography variant="body2">Valor Core al renovar: {JSON.stringify(entry.current)}</Typography></Box>)}
        <Button disabled={busy} onClick={() => void action(() => acknowledgeRenewalConflict(actor.id, id))}>Aceptar valores Core sin pendientes y habilitar reintento</Button>
      </CardContent></Card>}
      <Alert severity="info">Paquete de {state.inspection.establishmentName ?? state.inspection.caseId}. Estado Core: {state.inspection.status}; versión {state.inspection.version}. {state.permit && <>Permiso local hasta {new Date(state.permit.claims.expiresAt).toLocaleString('es-DO')}. La vigencia usa el reloj local como indicio; la revocación se comprueba al reconectar.</>}</Alert>
      {state.localFinalized && state.inspection.status !== 'SUBMITTED' && <Alert severity="warning">Finalización local pendiente. Aún no figura como SUBMITTED en Core.</Alert>}
      {state.inspection.status === 'SUBMITTED' && <Alert severity="success">Envío confirmado por Core.</Alert>}
      {user?.roleCode === 'EVALUATOR' && state.inspection.status === 'SUBMITTED' && officialReport && navigator.onLine &&
        <Button disabled={busy} onClick={() => void openOfficialReport()}>Abrir informe oficial</Button>}
      <Card><CardContent><Typography variant="h6">Respuestas BPM</Typography>
        {state.signedPackage.bpmTemplate.items.map((item) => <Box key={item.id} sx={{ borderBottom: '1px solid #ddd', py: 2 }}>
          <Typography sx={{ fontWeight: item.itemKind === 'CRITERION' ? 600 : 800 }}>{item.displayCode} {item.title}</Typography>
          {item.guidanceItems?.map((guidance) => <Typography key={guidance.id} variant="body2">Instrucción: {guidance.text}</Typography>)}
          {item.itemKind === 'CRITERION' && item.isEvaluable && <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <TextField select size="small" label="Respuesta" value={state.responses.find((response) => response.bpmItemId === item.id)?.responseValue ?? ''} disabled={!editing || busy}
              onChange={(event) => { const value = event.target.value as BpmValue; void action(() => saveResponse(actor.id, id, item.id, value, state.responses.find((response) => response.bpmItemId === item.id)?.observations ?? '')) }} sx={{ minWidth: 120 }}>
              {['C', 'CP', 'IT', 'NA'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Observaciones" defaultValue={state.responses.find((response) => response.bpmItemId === item.id)?.observations ?? ''} disabled={!editing || busy}
              onBlur={(event) => { const current = state.responses.find((response) => response.bpmItemId === item.id); if (current && current.observations !== event.target.value) void action(() => saveResponse(actor.id, id, item.id, current.responseValue, event.target.value)) }} sx={{ flex: 1 }} />
          </Stack>}
        </Box>)}
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Seis factores de riesgo</Typography>
        {state.signedPackage.riskRule.factors.map((factor) => <TextField key={factor.id} select fullWidth size="small" label={`${factor.code}: ${factor.name}`} sx={{ my: 1 }} disabled={!editing || busy}
          value={state.factorSelections.find((entry) => entry.riskFactorId === factor.id)?.optionId ?? ''}
          onChange={(event) => void action(() => selectFactor(actor.id, id, factor.id, event.target.value))}>
          {factor.options.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
        </TextField>)}
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Productos de riesgo</Typography>
        <Typography variant="body2">Los productos NA se conservan, pero no cuentan para el cálculo.</Typography>
        {editing && <Stack direction="row" spacing={1} sx={{ my: 1 }}><TextField select label="Producto" size="small" value={foodId} onChange={(event) => setFoodId(event.target.value)} sx={{ minWidth: 300 }}>
          {state.signedPackage.riskRule.foodCatalog.flatMap((category) => category.subcategories.map((sub) => <MenuItem key={sub.id} value={sub.id}>{category.name}: {sub.name} {sub.riskScore === null ? '(NA)' : ''}</MenuItem>))}
        </TextField><Button disabled={!foodId || busy} onClick={() => void action(() => addFood(actor.id, id, foodId))}>Agregar</Button></Stack>}
        {state.foodSnapshots.map((entry) => <Typography key={entry.foodRiskSubcategoryId}>{state.signedPackage.riskRule.foodCatalog.flatMap((category) => category.subcategories).find((sub) => sub.id === entry.foodRiskSubcategoryId)?.name ?? entry.foodRiskSubcategoryId}</Typography>)}
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Evidencias privadas</Typography><Typography variant="body2">Hasta diez activas, máximo 5 MB por archivo.</Typography>
        {editing && <><TextField select size="small" label="Criterio relacionado (opcional)" value={evidenceItemId} onChange={(event) => setEvidenceItemId(event.target.value)} sx={{ my: 1, minWidth: 260 }}>
          <MenuItem value="">General</MenuItem>{state.signedPackage.bpmTemplate.items.filter((item) => item.itemKind === 'CRITERION').map((item) => <MenuItem key={item.id} value={item.id}>{item.displayCode} {item.title}</MenuItem>)}
        </TextField>
        <input aria-label="Agregar evidencia" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm" disabled={!editing || busy}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void action(() => addEvidence(actor.id, id, file, evidenceItemId || null)); event.target.value = '' }} />
        </>}
        {state.signedPackage.evidence.filter((entry) => !entry.deletedAt && entry.status !== 'ARCHIVED').map((entry) => <Typography key={entry.id}>{entry.fileName} · {entry.status} (Core)</Typography>)}
        {state.evidence.map((entry) => <Box key={entry.id}><Typography component="span">{entry.fileName} · {entry.status} {entry.lastError ?? ''}</Typography>
          {editing && entry.status === 'PENDING' && state.queue.find((op) => op.operationId === entry.operationId)?.attempts === 0 &&
            <Button size="small" disabled={busy} onClick={() => void action(() => removePendingEvidence(actor.id, id, entry.id))}>Quitar</Button>}
        </Box>)}
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Ubicación opcional</Typography>
        {editing && <><FormControlLabel control={<Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />} label="Consiento capturar la ubicación de este dispositivo" />
        <Button disabled={!editing || !consent || busy || !navigator.geolocation} onClick={() => navigator.geolocation.getCurrentPosition(
          (position) => void action(() => saveLocation(actor.id, id, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() })),
          () => setError('No se obtuvo la ubicación. Puede continuar sin ella.'), { enableHighAccuracy: true, timeout: 15000 },
        )}>Capturar ubicación</Button></>}
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Envío</Typography>
        <Typography>Operaciones: {queue.filter((item) => item.status !== 'APPLIED' && item.status !== 'RESOLVED').length} pendientes; {queue.filter((item) => item.status === 'CONFLICT').length} conflictos; {queue.filter((item) => item.status === 'REJECTED').length} rechazos; {queue.filter((item) => item.status === 'APPLIED').length} confirmadas.</Typography>
        {queue.filter((item) => item.status !== 'APPLIED' && item.status !== 'RESOLVED').map((item) => <Box key={item.operationId} sx={{ my: 1 }}><Typography variant="body2">{item.type}: {item.status} {item.lastError ?? ''}</Typography>
          {item.status === 'CONFLICT' && user && <><Button disabled={busy} onClick={() => void reviewFieldConflict(user.id, id, item.operationId).then((review) => setConflictReview({ operationId: item.operationId, ...review })).catch((caught: Error) => setError(caught.message))}>Comparar con Core</Button>
            {conflictReview?.operationId === item.operationId && <Box sx={{ p: 1, bgcolor: '#F1F5F9' }}><Typography variant="body2">Core: {conflictReview.status}, versión {conflictReview.version}. Valor actual: {JSON.stringify(conflictReview.current)}</Typography><Typography variant="body2">Cambio local: {JSON.stringify(conflictReview.local)}</Typography><Button disabled={busy} onClick={() => void action(() => rebaseConflict(user.id, id, item.operationId), () => setConflictReview(null))}>Reintentar mi cambio</Button></Box>}</>}
        </Box>)}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {editing && <Button disabled={busy} onClick={() => void action(() => finalizeLocal(actor.id, id))}>Finalizar localmente</Button>}
          {user && !readOnly && !coreChanged && !state.renewalConflict && queue.some((item) => item.status === 'PENDING' || item.status === 'SENDING') && <Button variant="contained" disabled={busy} onClick={() => void action(() => syncFieldState(user.id, id))}>Sincronizar con Core</Button>}
        </Stack>
      </CardContent></Card>
    </>}
  </Stack>
}
