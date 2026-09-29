import { displayLabel } from '../../api/displayLabels'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSession } from '../../session/SessionContext'
import { core } from '../../api/core'
import { CoreApiError, type CoreInspection, type CoreReport } from '@ebr-bpm/core-client'
import { supportMessage } from '../../api/presentation'
import { OfflinePackageMissingError } from '../../offline/vault'
import { orderBpmItems } from '../../field/bpmOrder'
import { captureProgress, matchesKeywords, responseDisplay } from '../../field/formPresentation'
import { criticalityLabels } from '../configuration/labels'
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
  const [online, setOnline] = useState(navigator.onLine)
  const [retryEpoch, setRetryEpoch] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)
  const lastAutoSyncKey = useRef('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [foodId, setFoodId] = useState('')
  const [evidenceItemId, setEvidenceItemId] = useState('')
  const [conflictReview, setConflictReview] = useState<{ operationId: string; version: number; status: string; current: unknown; local: unknown } | null>(null)
  const [officialReport, setOfficialReport] = useState<CoreReport | null>(null)
  const orderedItems = useMemo(() => state ? orderBpmItems(state.signedPackage.bpmTemplate.items) : [], [state])
  const foodOptions = state?.signedPackage.riskRule.foodCatalog.flatMap((category) => category.subcategories.map((sub) => ({ ...sub, categoryName: category.name }))) ?? []
  const responseByItem = new Map(state?.responses.map((response) => [response.bpmItemId, response.responseValue] as const) ?? [])
  const evidenceOptions = orderedItems.map(({ item }) => item).filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable)
    .map((item) => ({ ...item, result: responseDisplay[responseByItem.get(item.id) ?? 'UNANSWERED'] }))
    .sort((a, b) => a.result.order - b.result.order)
  const progress = state ? captureProgress(state) : null
  const reload = useCallback(async () => {
    if (!actor || !id) return
    setState(null); setSealed(null); setRenewalPreview(null); setConflictReview(null); setOfficialReport(null)
    try {
      const stored = await inspectStoredFieldState(actor.id, id)
      setServerDenied(false); setReadOnly(false); setCoreChanged(false); setError('')
      if (stored.status === 'EXPIRED') { setSealed(stored); return }
      if (user && navigator.onLine) {
        try {
          const fresh = (await core.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}`, { cache: 'no-store' })).data
          if (fresh.assignmentId !== stored.state.inspection.assignmentId || fresh.version !== stored.state.inspection.version ||
            (fresh.status !== stored.state.inspection.status && !['DRAFT', 'IN_PROGRESS'].includes(fresh.status))) {
            setCoreChanged(true)
            setError('Cambió el estado, la asignación o la versión de la inspección. Los datos locales permanecen cifrados; compare los cambios antes de continuar.')
          }
        } catch (failure) {
          if (failure instanceof CoreApiError && (failure.status === 403 || failure.status === 404)) { setServerDenied(true); setState(null); setError('No tiene acceso a esta inspección.'); return }
        }
      }
      setState(stored.state)
    }
    catch (caught) {
      if (user && navigator.onLine) {
        try {
          if (caught instanceof OfflinePackageMissingError) {
            const fresh = (await core.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}`, { cache: 'no-store' })).data
            if (['DRAFT', 'IN_PROGRESS'].includes(fresh.status)) {
              const prepared = await downloadFieldPackage(user.id, id)
              setState(prepared); setReadOnly(false); setCoreChanged(false); setServerDenied(false); setError('')
              return
            }
          }
          const pkg = (await core.request<FieldState['signedPackage']>(`/v1/inspections/${encodeURIComponent(id)}/work-package`, { cache: 'no-store' })).data
          if (!['PENDING_SUBMISSION', 'SUBMITTED'].includes(pkg.inspection.status)) throw caught
          setState({ signedPackage: pkg, permit: null, inspection: pkg.inspection, responses: pkg.responses, factorSelections: pkg.factorSelections, foodSnapshots: pkg.foodSnapshots, evidence: [], queue: [], localFinalized: false, downloadedAt: '' })
          setReadOnly(true); setCoreChanged(false); setServerDenied(false); setError('')
          return
        } catch (failure) {
          if (failure instanceof CoreApiError && (failure.status === 403 || failure.status === 404)) { setServerDenied(true); setState(null); setError('No tiene acceso a esta inspección.'); return }
          if (caught instanceof OfflinePackageMissingError) { setError(supportMessage(failure, 'No fue posible preparar la inspección.')); return }
        }
      }
      setState(null); setError(caught instanceof Error ? caught.message : 'No se pudo abrir la inspección.')
    }
  }, [actor, id, user])
  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    const connected = () => { setOnline(true); setRetryEpoch((value) => value + 1); void reload() }
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected) }
  }, [reload])
  const pendingOperations = state?.queue.filter((item) => item.status === 'PENDING' || item.status === 'SENDING') ?? []
  const autoSyncKey = `${id}:${retryEpoch}:${pendingOperations.map((item) => item.operationId).join(',')}`
  useEffect(() => {
    if (!user || !online || !core.authenticated || busy || syncingRef.current || readOnly || coreChanged || state?.renewalConflict || !pendingOperations.length ||
      state?.queue.some((item) => item.status === 'CONFLICT' || item.status === 'REJECTED') || lastAutoSyncKey.current === autoSyncKey) return
    lastAutoSyncKey.current = autoSyncKey
    syncingRef.current = true; setSyncing(true)
    void syncFieldState(user.id, id).then((updated) => setState(updated))
      .catch((caught) => setError(supportMessage(caught, 'Los cambios permanecen guardados; el envío se reintentará al reconectar.')))
      .finally(() => { syncingRef.current = false; setSyncing(false) })
  }, [autoSyncKey, busy, coreChanged, id, online, pendingOperations.length, readOnly, state, user])
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
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron comparar los cambios.') }
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
  const editing = state && permitCurrent && !busy && !syncing && !readOnly && !coreChanged && !state.renewalConflict && ['DRAFT', 'IN_PROGRESS'].includes(state.inspection.status) && !state.localFinalized
  const queue = state?.queue ?? []
  return <Stack spacing={2} sx={{ maxWidth: 1100, m: 'auto', p: offlineUser ? 3 : 0 }}>
    <Button component={Link} to={offlineUser ? '/campo/paquetes' : '/campo/asignadas'} sx={{ alignSelf: 'start' }}>Volver a mis inspecciones</Button>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>Inspección de campo</Typography>
    {(error || (state && permitCurrent)) && <Box sx={{ position: 'sticky', top: offlineUser ? 0 : { xs: 56, sm: 64 }, zIndex: (theme) => theme.zIndex.appBar - 1, bgcolor: 'background.default', borderRadius: 2, py: 1, maxHeight: '55vh', overflowY: 'auto', boxShadow: '0 5px 14px rgba(69,26,3,.12)' }}>
      <Stack spacing={1}>
        {error && <Alert severity="warning" role="alert">{error}</Alert>}
        {state && permitCurrent && <>
          {state.localFinalized && state.inspection.status !== 'SUBMITTED' && <Alert severity="warning">Inspección finalizada y guardada en este dispositivo. {online ? 'El envío está pendiente o en curso.' : 'Se enviará automáticamente cuando vuelva la conexión.'}</Alert>}
          {state.inspection.status === 'SUBMITTED' && <Alert severity="success" role="status">Inspección enviada correctamente.</Alert>}
          {progress && <Card><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 800 }}>Avance de captura</Typography>
              <Typography sx={{ fontWeight: 800 }}>{progress.percent} %</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress.percent} aria-label="Avance de captura de la inspección" sx={{ height: 8, borderRadius: 5, mb: 1 }} />
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
              <Chip size="small" label={`Criterios BPM: ${progress.criteria} de ${progress.criteriaTotal}`} color={progress.criteria === progress.criteriaTotal ? 'success' : 'default'} />
              <Chip size="small" label={`Factores de riesgo: ${progress.factors} de ${progress.factorsTotal}`} color={progress.factors === progress.factorsTotal ? 'success' : 'default'} />
              <Chip size="small" label={`Producto aplicable: ${progress.hasProduct ? 'agregado' : 'pendiente'}`} color={progress.hasProduct ? 'success' : 'default'} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{state.inspection.status === 'SUBMITTED' ? 'Envío confirmado por el sistema.' : state.localFinalized ? 'Captura completa; el envío está pendiente o en curso.' : `Siguiente: ${progress.next}.`}</Typography>
          </CardContent></Card>}
        </>}
      </Stack>
    </Box>}
    {sealed && <Alert severity="warning">El permiso local venció o requiere validar la fecha y hora. La firma y la integridad fueron verificadas; el contenido permanece cifrado y oculto. {sealed.hasPending ? `Hay ${sealed.pendingCount} operaciones pendientes.` : 'No hay operaciones pendientes.'} Reconéctese para comparar y renovar.</Alert>}
    {user && (sealed || coreChanged) && <Button disabled={busy} onClick={() => void compareAndRenew()}>Comparar cambios</Button>}
    {renewalPreview && <Card><CardContent><Typography variant="h6">Comparación previa a la renovación</Typography>
      <Typography>Versión local {renewalPreview.localVersion}; versión registrada {renewalPreview.coreVersion}; {renewalPreview.pendingCount} operaciones pendientes. Estado: {displayLabel(renewalPreview.coreStatus)}.</Typography>
      {(renewalPreview.assignmentChanged || renewalPreview.definitionsChanged || !['DRAFT', 'IN_PROGRESS'].includes(renewalPreview.coreStatus))
        ? <Alert severity="warning">La asignación, las definiciones o el estado cambiaron. Los pendientes se conservan; se requiere revisión antes de renovar.</Alert>
        : <><Typography>La renovación conserva la cola y los binarios. Si cambió la versión, abrirá una comparación detallada y bloqueará el envío hasta su confirmación.</Typography>
          <Button disabled={busy} onClick={() => void action(() => confirmFieldRenewal(user!.id, id, renewalPreview), () => { setRenewalPreview(null); setCoreChanged(false) })}>Renovar y abrir revisión</Button></>}
    </CardContent></Card>}
    {!state && !sealed && user && !serverDenied && <Card><CardContent><Typography>Para abrir el trabajo guardado en este dispositivo, desbloquéelo con su contraseña actual. Si es la primera vez que abre esta inspección, el portal la preparará automáticamente cuando tenga conexión.</Typography>
      <TextField label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button disabled={!password} onClick={() => void unlockVaultOnline(password).then(() => { setPassword(''); void reload() }).catch((caught: Error) => setError(caught.message))}>Desbloquear</Button>
    </CardContent></Card>}
    {state && permitCurrent && <>
      {readOnly && <Alert severity="info">Vista de solo lectura. Esta inspección ya no admite captura de campo.</Alert>}
      {state.renewalConflict && <Card><CardContent><Typography variant="h6">Conflicto de versión tras renovar</Typography>
        <Typography>Versión anterior {state.renewalConflict.localVersion}; versión registrada {state.renewalConflict.coreVersion}. Ningún cambio local se aplicó al registro. Revise cada diferencia antes de habilitar el reintento.</Typography>
        {compareRenewalConflict(state).map((entry) => <Box key={entry.operationId} sx={{ my: 2 }}><Typography>{displayLabel(entry.type)} · {displayLabel(entry.status)}</Typography>
          <Typography variant="body2">Cambio local: {JSON.stringify(entry.local)}</Typography>
          <Typography variant="body2">Valor registrado al actualizar: {JSON.stringify(entry.current)}</Typography></Box>)}
        <Button disabled={busy} onClick={() => void action(() => acknowledgeRenewalConflict(actor.id, id))}>Aceptar valores registrados y volver a intentar</Button>
      </CardContent></Card>}
      <Alert severity="info">Inspección de {state.inspection.establishmentName ?? state.inspection.caseId}. Estado: {displayLabel(state.inspection.status)}; versión {state.inspection.version}. {state.permit && <>Disponible sin conexión hasta {new Date(state.permit.claims.expiresAt).toLocaleString('es-DO')}. La revocación de acceso se comprueba al reconectar.</>}</Alert>
      {user?.roleCode === 'EVALUATOR' && state.inspection.status === 'SUBMITTED' && officialReport && navigator.onLine &&
        <Button disabled={busy} onClick={() => void openOfficialReport()}>Abrir informe oficial</Button>}
      <Card><CardContent><Typography variant="h6">Respuestas BPM</Typography>
        {orderedItems.map(({ item, depth }) => <Box key={item.id} sx={{ borderBottom: '1px solid #ddd', py: 2, pl: (depth - 1) * 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: item.itemKind === 'CRITERION' ? 600 : 800 }}>{item.displayCode} {item.title}</Typography>
            {item.itemKind === 'CRITERION' && item.criticality && <Chip size="small" variant="outlined" label={`Criticidad ${criticalityLabels[item.criticality].toLowerCase()}`} />}
          </Stack>
          {item.guidanceItems?.map((guidance) => <Stack key={guidance.id} direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mt: 0.5 }}>
            <Typography variant="body2">Instrucción: {guidance.text}</Typography>
            {guidance.criticality && <Chip size="small" variant="outlined" color="warning" label={`Criticidad ${criticalityLabels[guidance.criticality].toLowerCase()}`} />}
          </Stack>)}
          {item.itemKind === 'CRITERION' && item.isEvaluable && <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <TextField select size="small" label="Respuesta" value={state.responses.find((response) => response.bpmItemId === item.id)?.responseValue ?? ''} disabled={!editing || busy}
              onChange={(event) => { const value = event.target.value as BpmValue; void action(() => saveResponse(actor.id, id, item.id, value, state.responses.find((response) => response.bpmItemId === item.id)?.observations ?? '')) }} sx={{ minWidth: 120 }}>
              {(['C', 'CP', 'IT', 'NA'] as const).map((value) => <MenuItem key={value} value={value}>{responseDisplay[value].label}</MenuItem>)}
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
        {editing && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ my: 1, alignItems: { sm: 'flex-start' } }}>
          <Autocomplete size="small" options={foodOptions} value={foodOptions.find((option) => option.id === foodId) ?? null}
            onChange={(_, option) => setFoodId(option?.id ?? '')}
            getOptionLabel={(option) => `${option.categoryName}: ${option.name}${option.riskScore === null ? ' (No aplica)' : ''}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, { inputValue }) => options.filter((option) => matchesKeywords(`${option.categoryName} ${option.name}`, inputValue))}
            noOptionsText="No se encontraron productos" sx={{ width: { xs: '100%', sm: 460 }, maxWidth: '100%' }}
            renderInput={(params) => <TextField {...params} label="Buscar producto" helperText="Escriba palabras del producto o su categoría." />} />
          <Button disabled={!foodId || busy} onClick={() => void action(() => addFood(actor.id, id, foodId), () => setFoodId(''))}>Agregar</Button>
        </Stack>}
        {state.foodSnapshots.map((entry) => <Typography key={entry.foodRiskSubcategoryId}>{state.signedPackage.riskRule.foodCatalog.flatMap((category) => category.subcategories).find((sub) => sub.id === entry.foodRiskSubcategoryId)?.name ?? entry.foodRiskSubcategoryId}</Typography>)}
      </CardContent></Card>
      <Card><CardContent><Typography variant="h6">Evidencias privadas</Typography><Typography variant="body2">Hasta diez activas, máximo 5 MB por archivo.</Typography>
        {editing && <><Autocomplete size="small" options={evidenceOptions} value={evidenceOptions.find((option) => option.id === evidenceItemId) ?? null}
          onChange={(_, option) => setEvidenceItemId(option?.id ?? '')}
          getOptionLabel={(option) => `${option.displayCode ?? ''} ${option.title}`.trim()}
          groupBy={(option) => option.result.label}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(options, { inputValue }) => options.filter((option) => matchesKeywords(`${option.displayCode ?? ''} ${option.title} ${option.result.label}`, inputValue))}
          renderOption={(props, option) => <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" color={option.result.color} label={option.result.label} />
            <Typography variant="body2">{option.displayCode} {option.title}</Typography>
          </Box>}
          noOptionsText="No se encontraron criterios" sx={{ my: 1, maxWidth: 700 }}
          renderInput={(params) => <TextField {...params} label="Criterio relacionado (opcional)" helperText="Busque por código, descripción o resultado. Sin seleccionar un criterio, la evidencia será general." />} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Chip size="small" label={evidenceItemId ? `Vinculación: ${evidenceOptions.find((option) => option.id === evidenceItemId)?.result.label ?? 'Criterio'}` : 'Vinculación: General'}
            color={evidenceOptions.find((option) => option.id === evidenceItemId)?.result.color ?? 'default'} />
          {evidenceItemId && <Button size="small" onClick={() => setEvidenceItemId('')}>Usar como evidencia general</Button>}
        </Stack>
        <input aria-label="Agregar evidencia" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm" disabled={!editing || busy}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void action(() => addEvidence(actor.id, id, file, evidenceItemId || null)); event.target.value = '' }} />
        </>}
        {state.signedPackage.evidence.filter((entry) => !entry.deletedAt && entry.status !== 'ARCHIVED').map((entry) => <Typography key={entry.id}>{entry.fileName} · {displayLabel(entry.status)}</Typography>)}
        {state.evidence.map((entry) => <Box key={entry.id}><Typography component="span">{entry.fileName} · {displayLabel(entry.status)} {entry.lastError ?? ''}</Typography>
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
        {syncing && <Alert severity="info" sx={{ mt: 1 }}>Enviando cambios automáticamente…</Alert>}
        {!online && queue.some((item) => item.status === 'PENDING') && <Alert severity="info" sx={{ mt: 1 }}>Los cambios están cifrados en este dispositivo. Se enviarán cuando vuelva la conexión y haya iniciado sesión.</Alert>}
        {online && !user && queue.some((item) => item.status === 'PENDING') && <Alert severity="info" sx={{ mt: 1 }}>La conexión volvió. Inicie sesión para autorizar el envío de los cambios guardados.</Alert>}
        {queue.filter((item) => item.status !== 'APPLIED' && item.status !== 'RESOLVED').map((item) => <Box key={item.operationId} sx={{ my: 1 }}><Typography variant="body2">{displayLabel(item.type)}: {displayLabel(item.status)} {item.lastError ?? ''}</Typography>
          {item.status === 'CONFLICT' && user && <><Button disabled={busy} onClick={() => void reviewFieldConflict(user.id, id, item.operationId).then((review) => setConflictReview({ operationId: item.operationId, ...review })).catch((caught: Error) => setError(caught.message))}>Comparar cambios</Button>
            {conflictReview?.operationId === item.operationId && <Box sx={{ p: 1, bgcolor: '#fffbeb' }}><Typography variant="body2">Estado registrado: {displayLabel(conflictReview.status)}, versión {conflictReview.version}. Valor actual: {JSON.stringify(conflictReview.current)}</Typography><Typography variant="body2">Cambio local: {JSON.stringify(conflictReview.local)}</Typography><Button disabled={busy} onClick={() => void action(() => rebaseConflict(user.id, id, item.operationId), () => setConflictReview(null))}>Reintentar mi cambio</Button></Box>}</>}
        </Box>)}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {editing && <Button disabled={busy || syncing} variant="contained" onClick={() => void action(() => finalizeLocal(actor.id, id))}>Finalizar inspección</Button>}
          {user && online && !readOnly && !coreChanged && !state.renewalConflict && !syncing && lastAutoSyncKey.current === autoSyncKey && queue.some((item) => item.status === 'PENDING' || item.status === 'SENDING') && <Button disabled={busy} onClick={() => { setRetryEpoch((value) => value + 1) }}>Reintentar envío pendiente</Button>}
        </Stack>
      </CardContent></Card>
    </>}
  </Stack>
}
