import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { correctionInbox, type CorrectionInboxItem } from '../../api/evaluation'
import { routeForError, supportMessage } from '../../api/presentation'

export function CorrectionsInboxPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CorrectionInboxItem[]>([]), [page, setPage] = useState(0), [limit, setLimit] = useState(20), [total, setTotal] = useState(0), [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const result = await correctionInbox(page + 1, limit); setItems(result.data); setTotal(result.meta.total ?? result.data.length); setError('') }
    catch (cause) { const route = routeForError(cause); if (route) navigate(route, { replace: true }); else setError(supportMessage(cause, 'No fue posible cargar las correcciones.')) }
  }, [limit, navigate, page])
  useEffect(() => { void load() }, [load])
  return <Stack spacing={2}><Typography variant="h5" sx={{ fontWeight: 800 }}>Correcciones devueltas</Typography><Typography color="text.secondary">Solo inspecciones asignadas a su cuenta. La corrección y el reenvío requieren conexión con Core.</Typography>{error && <Alert severity="error">{error}</Alert>}
    <Card><TableContainer><Table><TableHead><TableRow><TableCell>Inspección</TableCell><TableCell>Empresa y establecimiento</TableCell><TableCell>Motivo</TableCell><TableCell>Devolución</TableCell><TableCell /></TableRow></TableHead><TableBody>{items.length === 0 ? <TableRow><TableCell colSpan={5}>No hay correcciones pendientes.</TableCell></TableRow> : items.map((item) => <TableRow key={item.reviewId}><TableCell>{item.inspectionId.slice(0, 8)}</TableCell><TableCell>{item.companyName || 'Sin empresa'} · {item.establishmentName || 'Sin establecimiento'}</TableCell><TableCell>{item.returnReason}</TableCell><TableCell>{item.returnCount}</TableCell><TableCell><Button onClick={() => navigate(`/campo/correcciones/${item.inspectionId}`)}>Corregir</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer><TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Filas por página:" /></Card>
  </Stack>
}
