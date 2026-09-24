import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { operationApi, type CaseOrigin, type OperationalCase } from '../../api/operation'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { canEditSource } from '../../access/operationRules'
import { useNotification } from '../../components/NoticeProvider'
import { useSession } from '../../session/SessionContext'
import { originNames } from './CaseListPage'

const dominicanDateTime = (value: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T')
const today = () => dominicanDateTime(new Date().toISOString()).slice(0, 10)
const nowLocal = () => dominicanDateTime(new Date().toISOString())
type Form = { companyId: string; establishmentId: string; reference: string; date: string; product: string; description: string; observations: string; named: boolean; fullName: string; phone: string; email: string; preferredContactMethod: 'NONE' | 'PHONE' | 'EMAIL' }
const emptyForm = (): Form => ({ companyId: '', establishmentId: '', reference: '', date: today(), product: '', description: '', observations: '', named: false, fullName: '', phone: '', email: '', preferredContactMethod: 'NONE' })
const fromCase = (item: OperationalCase): Form => ({ ...emptyForm(), companyId: item.companyId ?? '', establishmentId: item.establishmentId ?? '', reference: item.source.programReference || item.source.alertNumber || item.source.complaintType || '', date: item.source.plannedDate || item.source.alertDate || (item.source.receivedAt ? dominicanDateTime(item.source.receivedAt) : today()), product: item.source.productDescription || '', description: item.source.reason || item.source.description || '', observations: item.source.observations || '', named: Boolean(item.source.complainantData), fullName: item.source.complainantData?.fullName || '', phone: item.source.complainantData?.phone || '', email: item.source.complainantData?.email || '', preferredContactMethod: item.source.complainantData?.preferredContactMethod || 'NONE' })

export function CaseSourceFormPage({ origin }: { origin: Exclude<CaseOrigin, 'COMPANY_REQUEST'> }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const [item, setItem] = useState<OperationalCase | null>(null)
  const [form, setForm] = useState<Form>(() => ({ ...emptyForm(), date: origin === 'COMPLAINT' ? nowLocal() : today() }))
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [stale, setStale] = useState(false)
  const invalidComplainant = origin === 'COMPLAINT' && !id && form.named && (form.preferredContactMethod === 'PHONE' && !form.phone.trim() || form.preferredContactMethod === 'EMAIL' && !form.email.trim())
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const load = async () => {
    if (!id) return
    setLoading(true)
    try { const result = await operationApi.case(id); if (result.origin !== origin) return navigate('/no-encontrado', { replace: true }); setItem(result); setForm(fromCase(result)); setStale(false) }
    catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar el caso.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [id, origin]) // La recarga explícita tras 409 conserva el formulario hasta que se solicite.
  const save = async () => {
    if (saving || (id && (!item || !canEditSource(user, item)))) return
    setSaving(true)
    try {
      let result: OperationalCase
      const organization = { ...(form.companyId.trim() ? { companyId: form.companyId.trim() } : {}), ...(form.establishmentId.trim() ? { establishmentId: form.establishmentId.trim() } : {}) }
      if (origin === 'INSTITUTIONAL_PROGRAM') {
        const fields = { programReference: form.reference.trim() || null, plannedDate: form.date || null, reason: form.description.trim(), observations: form.observations.trim() || null }
        result = id ? await operationApi.updateProgram(id, { version: item!.source.version, ...fields }) : (await operationApi.createProgram({ ...organization, ...fields })).data
      } else if (origin === 'HEALTH_ALERT') {
        const fields = { alertNumber: form.reference.trim(), alertDate: form.date, productDescription: form.product.trim(), description: form.description.trim() }
        result = id ? await operationApi.updateAlert(id, { version: item!.source.version, ...fields }) : (await operationApi.createAlert({ ...organization, ...fields })).data
      } else {
        const fields = { complaintType: form.reference.trim(), receivedAt: new Date(`${form.date}:00-04:00`).toISOString(), description: form.description.trim() }
        const complainantData = form.named ? { ...(form.fullName.trim() ? { fullName: form.fullName.trim() } : {}), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), ...(form.email.trim() ? { email: form.email.trim() } : {}), preferredContactMethod: form.preferredContactMethod } : undefined
        result = id ? await operationApi.updateComplaint(id, { version: item!.source.version, ...fields }) : (await operationApi.createComplaint({ ...organization, ...fields, ...(complainantData ? { complainantData } : {}) })).data
      }
      showSuccess(id ? 'Caso actualizado.' : 'Caso creado.'); navigate(`/operacion/casos/${result.id}`)
    } catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible guardar el caso.')) }
    finally { setSaving(false) }
  }
  if (loading) return <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress /></Box>
  if (id && (!item || !canEditSource(user, item))) return <Alert severity="error">El estado del caso no permite editar esta fuente.</Alert>
  return <Stack spacing={2}><Box><Button onClick={() => navigate(id ? `/operacion/casos/${id}` : '/operacion/casos')}>Volver</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>{id ? 'Editar' : 'Crear'} {originNames[origin].toLowerCase()}</Typography></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Descartar cambios y recargar</Button>}>La versión cambió. El formulario se conserva hasta que decida recargar.</Alert>}
    <Card><CardContent><Stack spacing={2}>
      {!id && <><Typography variant="subtitle2">Organización opcional</Typography><TextField label="ID de empresa" value={form.companyId} onChange={(event) => set('companyId', event.target.value)} helperText="Deje vacío si el caso no corresponde a una empresa." /><TextField label="ID de establecimiento" value={form.establishmentId} onChange={(event) => set('establishmentId', event.target.value)} disabled={!form.companyId.trim()} /></>}
      <TextField label={origin === 'INSTITUTIONAL_PROGRAM' ? 'Referencia del programa' : origin === 'HEALTH_ALERT' ? 'Número oficial de alerta' : 'Tipo de denuncia'} value={form.reference} onChange={(event) => set('reference', event.target.value)} required={origin !== 'INSTITUTIONAL_PROGRAM'} />
      <TextField label={origin === 'INSTITUTIONAL_PROGRAM' ? 'Fecha planificada' : origin === 'HEALTH_ALERT' ? 'Fecha de alerta' : 'Fecha y hora de recepción'} type={origin === 'COMPLAINT' ? 'datetime-local' : 'date'} value={form.date} onChange={(event) => set('date', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required={origin !== 'INSTITUTIONAL_PROGRAM'} />
      {origin === 'HEALTH_ALERT' && <TextField label="Producto afectado" value={form.product} onChange={(event) => set('product', event.target.value)} required />}
      <TextField label={origin === 'INSTITUTIONAL_PROGRAM' ? 'Motivo' : 'Descripción'} value={form.description} onChange={(event) => set('description', event.target.value)} multiline minRows={3} required />
      {origin === 'INSTITUTIONAL_PROGRAM' && <TextField label="Observaciones" value={form.observations} onChange={(event) => set('observations', event.target.value)} multiline minRows={2} />}
      {origin === 'COMPLAINT' && !id && <><TextField select label="Identidad del denunciante" value={form.named ? 'NAMED' : 'ANONYMOUS'} onChange={(event) => set('named', event.target.value === 'NAMED')}><MenuItem value="ANONYMOUS">Anónima</MenuItem><MenuItem value="NAMED">Identificada</MenuItem></TextField>{form.named && <><TextField label="Nombre" value={form.fullName} onChange={(event) => set('fullName', event.target.value)} /><TextField label="Teléfono" value={form.phone} onChange={(event) => set('phone', event.target.value)} /><TextField label="Correo" value={form.email} onChange={(event) => set('email', event.target.value)} /><TextField select label="Contacto preferido" value={form.preferredContactMethod} onChange={(event) => set('preferredContactMethod', event.target.value as Form['preferredContactMethod'])}><MenuItem value="NONE">Ninguno</MenuItem><MenuItem value="PHONE">Teléfono</MenuItem><MenuItem value="EMAIL">Correo</MenuItem></TextField></>}</>}
      <Button variant="contained" onClick={() => void save()} disabled={saving || !form.description.trim() || (origin !== 'INSTITUTIONAL_PROGRAM' && !form.reference.trim()) || (origin === 'HEALTH_ALERT' && !form.product.trim()) || invalidComplainant}>Guardar</Button>
    </Stack></CardContent></Card>
  </Stack>
}
