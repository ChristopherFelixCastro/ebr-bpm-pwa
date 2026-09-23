import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import type { AnalyticsEvaluation } from '@ebr-bpm/core-client';
import { servicioAnalitica } from '../servicios/analitica';
import { Cargando, ErrorVista, Vacio } from '../componentes/EstadoVista';
import { formatearFechaHora } from '../utilidades/formato';

export function Informes() {
  const [page, setPage] = useState(0); const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<AnalyticsEvaluation[]>(); const [total, setTotal] = useState(0); const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { const result = await servicioAnalitica.listarEvaluaciones({ page: page + 1, limit, reportStatus: 'OFFICIAL' }); setItems(result.data); setTotal(result.meta.total ?? 0); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los informes.'); } }, [page, limit]);
  useEffect(() => { void load(); }, [load]);
  return <Box sx={{ display: 'grid', gap: 3 }}><Box><Typography variant="h1">Informes oficiales</Typography><Typography color="text.secondary">Informes vigentes generados, oficializados y almacenados por el Core.</Typography></Box>{error ? <ErrorVista mensaje={error} /> : !items ? <Cargando /> : <Card><TableContainer><Table><TableHead><TableRow><TableCell>Verificación</TableCell><TableCell>Evaluación</TableCell><TableCell>Empresa</TableCell><TableCell>Oficialización</TableCell><TableCell align="right">Acción</TableCell></TableRow></TableHead><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.latestReport?.verificationId?.slice(0, 8) || '—'}</TableCell><TableCell>{item.id.slice(0, 8)}</TableCell><TableCell>{item.companyTradeName || item.companyName || 'Sin empresa'}</TableCell><TableCell>{formatearFechaHora(item.latestReport?.officialAt)}</TableCell><TableCell align="right"><Button component={Link} to={`/evaluaciones/${item.id}`} size="small">Ver informe</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>{items.length === 0 && <CardContent><Vacio titulo="Sin informes oficiales" detalle="Los informes aparecerán cuando el Core los oficialice." /></CardContent>}<TablePagination component="div" count={total} page={page} onPageChange={(_event, next) => setPage(next)} rowsPerPage={limit} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20, 50, 100]} labelRowsPerPage="Filas por página" /></Card>}</Box>;
}
