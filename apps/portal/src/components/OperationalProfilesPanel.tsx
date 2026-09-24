import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { establishmentsApi, type OperationalProfile, type OperationalProfileCreate } from '../api/resources'
import { isStaleVersion, supportMessage } from '../api/presentation'
import { useNotification } from './NoticeProvider'
import { todayInDominicanRepublic } from '../utils/date'

const fields = [
  ['annualProduction', 'Producción anual'], ['marketTarget', 'Mercado objetivo'], ['commercializationScope', 'Alcance de comercialización'],
  ['employeeCount', 'Empleados'], ['maleEmployeeCount', 'Empleados hombres'], ['femaleEmployeeCount', 'Empleadas mujeres'],
  ['haccpStatus', 'Estado HACCP'], ['haccpImplementationLevel', 'Nivel de implementación HACCP'],
  ['samplingPlanStatus', 'Estado del plan de muestreo'], ['samplingPlanScope', 'Alcance del muestreo'],
  ['inabieSupplierStatus', 'Estado de proveedor INABIE'], ['inabieDistributionScope', 'Distribución INABIE'],
] as const
const numeric = new Set<string>(['annualProduction', 'employeeCount', 'maleEmployeeCount', 'femaleEmployeeCount'])

export function OperationalProfilesPanel({ establishmentId, canCreate }: { establishmentId: string; canCreate: boolean }) {
  const { showError, showSuccess } = useNotification()
  const [profiles, setProfiles] = useState<OperationalProfile[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OperationalProfileCreate>({ effectiveFrom: todayInDominicanRepublic() })
  const latestDate = profiles.reduce((latest, profile) => profile.effectiveFrom > latest ? profile.effectiveFrom : latest, '')
  const load = useCallback(async () => { try { setProfiles(await establishmentsApi.profiles(establishmentId)) } catch (error) { showError(supportMessage(error, 'No fue posible consultar el historial de perfiles.')) } }, [establishmentId, showError])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (form.effectiveFrom <= latestDate) return showError(`La fecha debe ser posterior al último perfil (${latestDate}).`)
    const total = form.employeeCount ?? 0
    if ((form.maleEmployeeCount ?? 0) + (form.femaleEmployeeCount ?? 0) > total && form.employeeCount != null) return showError('El desglose de personal supera el total.')
    setSaving(true)
    try { await establishmentsApi.createProfile(establishmentId, form); setOpen(false); setForm({ effectiveFrom: todayInDominicanRepublic() }); showSuccess('Perfil histórico registrado.'); await load() }
    catch (error) { showError(isStaleVersion(error) ? 'El perfil cambió; recargue el historial.' : supportMessage(error, 'No fue posible registrar el perfil.')) }
    finally { setSaving(false) }
  }
  return <Card><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}><Typography variant="h6">Perfiles operativos históricos</Typography>{canCreate && <Button onClick={() => setOpen(true)}>Registrar perfil</Button>}</Box>
    {profiles.length === 0 ? <Alert severity="info">No hay perfiles operativos registrados.</Alert> : <Stack spacing={1}>{profiles.map((profile) => <Box key={profile.id} sx={{ border: '1px solid #E2E8F0', borderRadius: 2, p: 2 }}><Typography sx={{ fontWeight: 700 }}>Desde {profile.effectiveFrom} {profile.effectiveTo ? `hasta ${profile.effectiveTo}` : '· vigente'}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.5, mt: 1 }}>{fields.map(([key, label]) => <Typography key={key} variant="body2"><strong>{label}:</strong> {profile[key] ?? '—'}</Typography>)}</Box><Typography variant="caption">Versión {profile.version}</Typography></Box>)}</Stack>}
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth><DialogTitle>Nuevo perfil operativo</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><Alert severity="info">Cada alta conserva el perfil anterior y su vigencia histórica.{latestDate ? ` La nueva vigencia debe comenzar después de ${latestDate}.` : ''}</Alert><TextField type="date" label="Vigente desde" required value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />{fields.map(([key, label]) => <TextField key={key} type={numeric.has(key) ? 'number' : 'text'} label={label} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value === '' ? null : numeric.has(key) ? Number(event.target.value) : event.target.value })} />)}</Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={saving || !form.effectiveFrom || form.effectiveFrom <= latestDate} onClick={() => void save()}>Registrar</Button></DialogActions></Dialog>
  </CardContent></Card>
}
