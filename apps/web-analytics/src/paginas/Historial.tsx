import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, TablePagination, TextField, Typography } from '@mui/material';
import type { AnalyticsEvaluation } from '@ebr-bpm/core-client';
import { servicioAnalitica } from '../servicios/analitica';
import { EstadoChip, RiesgoChip } from '../componentes/EstadoChip';
import { Cargando, ErrorVista, Vacio } from '../componentes/EstadoVista';
import { formatearFecha, formatearFechaHora } from '../utilidades/formato';

export function Historial() {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(0); const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<AnalyticsEvaluation[]>(); const [total, setTotal] = useState(0); const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { const result = await servicioAnalitica.listarEvaluaciones({ page: page + 1, limit, search: search || undefined, lifecycleStatus: 'CLOSED' }); setItems(result.data); setTotal(result.meta.total ?? 0); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo consultar el histórico.'); } }, [page, limit, search]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);
  return <Box sx={{ display: 'grid', gap: 3 }}><Box><Typography variant="h1">Consulta histórica</Typography><Typography color="text.secondary">Cierres reales con el cálculo y la revisión vigentes al cerrar.</Typography></Box><Card><CardContent><TextField fullWidth label="Buscar por empresa, establecimiento, evaluador o UUID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></CardContent></Card>{error ? <ErrorVista mensaje={error} /> : !items ? <Cargando /> : <>{items.length === 0 && <Card><Vacio titulo="Sin expedientes cerrados" detalle="No hay cierres que coincidan con la búsqueda." /></Card>}{items.map((item) => <Card key={item.id}><CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr auto' }, gap: 2, alignItems: 'center' }}><Box><Typography variant="h3">Evaluación {item.id.slice(0, 8)}</Typography><Typography>{item.companyTradeName || item.companyName || 'Sin empresa'} · {item.establishmentName || 'Sin establecimiento'}</Typography><Typography variant="caption" color="text.secondary">Inspección: {formatearFecha(item.startedAt || item.createdAt)} · Cierre: {formatearFechaHora(item.closure?.closedAt)}</Typography></Box><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><EstadoChip estado={item.lifecycleStatus} />{item.riskLevel && <RiesgoChip nivel={item.riskLevel} />}</Box><Button component={Link} to={`/evaluaciones/${item.id}`}>Consultar</Button></CardContent></Card>)}<Card><TablePagination component="div" count={total} page={page} onPageChange={(_event, next) => setPage(next)} rowsPerPage={limit} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50, 100]} labelRowsPerPage="Filas por página" /></Card></>}</Box>;
}
