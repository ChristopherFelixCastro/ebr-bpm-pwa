import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import { companiesApi, establishmentsApi, requestsApi, type Company, type Establishment } from '../../api/resources'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { useSession } from '../../session/SessionContext'
import { useNotification } from '../../components/NoticeProvider'
import { canEditRequest } from '../../access/resourceRules'

export const RequestFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const [companies, setCompanies] = useState<Company[]>([])
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const [establishmentSearch, setEstablishmentSearch] = useState('')
  const [companyId, setCompanyId] = useState(user?.companyId ?? '')
  const [establishmentId, setEstablishmentId] = useState('')
  const [requestType, setRequestType] = useState('REGISTRATION')
  const [reason, setReason] = useState('')
  const [observations, setObservations] = useState('')
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stale, setStale] = useState(false)
  const isGlobal = user?.roleCode === 'ADMIN' || user?.roleCode === 'UNIVERSAL'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let resolvedCompanyId = user?.companyId ?? ''
      let resolvedEstablishmentId = ''
      if (id) {
        const request = await requestsApi.get(id)
        if (!canEditRequest(user, request.companyId, request.status)) { navigate('/denegado', { replace: true }); return }
        resolvedCompanyId = request.companyId
        resolvedEstablishmentId = request.establishmentId
        setCompanyId(request.companyId); setEstablishmentId(request.establishmentId); setRequestType(request.requestType); setReason(request.reason); setObservations(request.observations || ''); setVersion(request.version)
      }
      const [companyResult, establishmentResult] = await Promise.all([
        isGlobal ? companiesApi.list({ page: 1, limit: 100, status: 'ACTIVE' }) : Promise.resolve({ data: [] as Company[], meta: { correlationId: '' } }),
        establishmentsApi.list({ page: 1, limit: 100, status: 'ACTIVE', ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}) }),
      ])
      const companyItems = companyResult.data
      const establishmentItems = establishmentResult.data
      if (isGlobal && resolvedCompanyId && !companyItems.some((item) => item.id === resolvedCompanyId)) companyItems.push(await companiesApi.get(resolvedCompanyId))
      if (id && resolvedEstablishmentId && !establishmentItems.some((item) => item.id === resolvedEstablishmentId)) establishmentItems.push(await establishmentsApi.get(resolvedEstablishmentId))
      setCompanies(companyItems)
      setEstablishments(establishmentItems)
      setStale(false)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar el formulario.')) }
    finally { setLoading(false) }
  }, [user, id, isGlobal, navigate, showError])

  useEffect(() => { void load() }, [load])

  const reloadEstablishments = async (nextCompanyId: string) => {
    setCompanyId(nextCompanyId); setEstablishmentId('')
    try { setEstablishments((await establishmentsApi.list({ page: 1, limit: 100, status: 'ACTIVE', companyId: nextCompanyId })).data) }
    catch (error) { showError(supportMessage(error, 'No fue posible cargar los establecimientos.')) }
  }
  const searchCompany = async () => {
    try { const found = (await companiesApi.list({ page: 1, limit: 100, status: 'ACTIVE', search: companySearch.trim() })).data; if (companyId && !found.some((item) => item.id === companyId)) found.push(await companiesApi.get(companyId)); setCompanies(found) }
    catch (error) { showError(supportMessage(error, 'No fue posible buscar empresas.')) }
  }
  const searchEstablishment = async () => {
    try { const found = (await establishmentsApi.list({ page: 1, limit: 100, status: 'ACTIVE', companyId, search: establishmentSearch.trim() })).data; if (establishmentId && !found.some((item) => item.id === establishmentId)) found.push(await establishmentsApi.get(establishmentId)); setEstablishments(found) }
    catch (error) { showError(supportMessage(error, 'No fue posible buscar establecimientos.')) }
  }

  const save = async () => {
    if (!establishmentId || !requestType.trim() || !reason.trim() || (isGlobal && !companyId)) return showError('Empresa, establecimiento, tipo y motivo son obligatorios.')
    setSaving(true)
    try {
      if (id && version) {
        const updated = await requestsApi.update(id, { version, establishmentId, requestType: requestType.trim(), reason: reason.trim(), observations: observations.trim() || null })
        setVersion(updated.version); setStale(false); showSuccess('Borrador actualizado.'); navigate(`/solicitudes/${id}`)
      } else {
        const created = await requestsApi.create({ ...(isGlobal ? { companyId } : {}), establishmentId, requestType: requestType.trim(), reason: reason.trim(), observations: observations.trim() || null })
        showSuccess('Borrador creado con UUID real.'); navigate(`/solicitudes/${created.id}`, { replace: true })
      }
    } catch (error) { if (isStaleVersion(error)) setStale(true); else { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible guardar el borrador.')) } }
    finally { setSaving(false) }
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>

  return <Stack spacing={3}>
    <Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate(id ? `/solicitudes/${id}` : '/solicitudes')}>Volver</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>{id ? 'Editar borrador' : 'Nueva solicitud BPM'}</Typography><Typography color="text.secondary">La solicitud se crea inicialmente en estado DRAFT.</Typography></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Descartar y recargar</Button>}>La versión cambió en Core. Recargue antes de volver a guardar.</Alert>}
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Stack spacing={2}>
      {isGlobal && <Stack direction="row" spacing={1}><TextField fullWidth label="Buscar empresa" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} /><Button onClick={() => void searchCompany()}>Buscar</Button></Stack>}
      {isGlobal && <TextField select label="Empresa" required value={companyId} onChange={(event) => void reloadEstablishments(event.target.value)}>{companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.legalName}</MenuItem>)}</TextField>}
      <Stack direction="row" spacing={1}><TextField fullWidth label="Buscar establecimiento" value={establishmentSearch} onChange={(event) => setEstablishmentSearch(event.target.value)} disabled={!companyId} /><Button onClick={() => void searchEstablishment()} disabled={!companyId}>Buscar</Button></Stack>
      <TextField select label="Establecimiento" required value={establishmentId} onChange={(event) => setEstablishmentId(event.target.value)} disabled={!companyId && isGlobal}>{establishments.map((establishment) => <MenuItem key={establishment.id} value={establishment.id}>{establishment.name}</MenuItem>)}</TextField>
      <TextField label="Tipo de solicitud" required value={requestType} onChange={(event) => setRequestType(event.target.value)} />
      <TextField label="Motivo" required multiline minRows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
      <TextField label="Observaciones" multiline minRows={3} value={observations} onChange={(event) => setObservations(event.target.value)} />
      <Button variant="contained" startIcon={<SaveIcon />} disabled={saving || stale} onClick={() => void save()}>{id ? 'Guardar borrador' : 'Crear borrador'}</Button>
    </Stack></CardContent></Card>
  </Stack>
}
