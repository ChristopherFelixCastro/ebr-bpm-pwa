import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Divider, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { core } from '../api/core';
import { useAutenticacion } from '../contexto/Autenticacion';
import { servicioAnalitica, type DetalleAnalitico } from '../servicios/analitica';
import { Cargando, ErrorVista } from '../componentes/EstadoVista';
import { EstadoChip, RiesgoChip } from '../componentes/EstadoChip';
import { formatearFecha, formatearFechaHora, numero } from '../utilidades/formato';

export function DetalleEvaluacion() {
  const { id = '' } = useParams(); const { canOperate, runAuthorized } = useAutenticacion();
  const [detail, setDetail] = useState<DetalleAnalitico>(); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [processing, setProcessing] = useState('');
  const load = useCallback(async () => { setError(''); try { setDetail(await servicioAnalitica.obtenerDetalle(id)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la evaluación.'); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  const operate = async (label: string, action: () => Promise<unknown>) => { setProcessing(label); setError(''); setMessage(''); try { await runAuthorized(action); await load(); setMessage(`${label} completado por el Core.`); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.'); } finally { setProcessing(''); } };
  if (!detail && error) return <ErrorVista mensaje={error} />; if (!detail) return <Cargando />;
  const { evaluation, calculation, review, reports, closure, workPackage } = detail;
  const draft = reports.find((report) => report.status === 'DRAFT'); const official = reports.find((report) => report.status === 'OFFICIAL');
  const canReview = evaluation.lifecycleStatus === 'PENDING_REVIEW' || evaluation.lifecycleStatus === 'RESUBMITTED';
  const canGenerate = evaluation.lifecycleStatus === 'APPROVED' && !closure;
  const download = async () => { if (!official) return; setProcessing('Descarga'); try { const result = await core.reportDownloadUrl(id, official.id); window.location.assign(result.data.signedUrl); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo generar la descarga temporal.'); } finally { setProcessing(''); } };
  return <Box sx={{ display: 'grid', gap: 3 }}>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}><Button component={Link} to="/evaluaciones" startIcon={<ArrowBackRoundedIcon />}>Volver</Button><Box sx={{ flexGrow: 1 }}><Typography variant="h1">Evaluación {evaluation.id.slice(0, 8)}</Typography><Typography color="text.secondary">{evaluation.companyName || 'Sin empresa'} · {evaluation.establishmentName || 'Sin establecimiento'}</Typography></Box><EstadoChip estado={evaluation.lifecycleStatus} />{evaluation.riskLevel && <RiesgoChip nivel={evaluation.riskLevel} />}
      {canOperate && evaluation.lifecycleStatus === 'READY_FOR_REVIEW' && <Button variant="contained" disabled={Boolean(processing)} onClick={() => void operate('Apertura de revisión', () => core.openReview(id))}>Abrir revisión</Button>}
      {canOperate && canReview && <Button component={Link} to={`/evaluaciones/${id}/revision`} variant="contained" startIcon={<RateReviewRoundedIcon />}>Revisar</Button>}
      {canOperate && canGenerate && !official && <Button variant="contained" disabled={Boolean(processing)} startIcon={<DescriptionRoundedIcon />} onClick={() => { const operationId = crypto.randomUUID(); void operate(draft ? 'Regeneración del informe' : 'Generación del informe', () => core.generateReport(id, operationId)); }}>{draft ? 'Regenerar borrador' : 'Generar informe'}</Button>}
      {canOperate && draft && <Button variant="contained" disabled={Boolean(processing)} onClick={() => void operate('Oficialización del informe', () => core.officializeReport(id, draft.id))}>Oficializar</Button>}
      {official && <Button startIcon={<DownloadRoundedIcon />} disabled={Boolean(processing)} onClick={() => void download()}>Descargar</Button>}
      {canOperate && official && !closure && <Button variant="contained" color="secondary" disabled={Boolean(processing)} startIcon={<InventoryRoundedIcon />} onClick={() => void operate('Cierre del expediente', () => core.closeInspection(id, official.id))}>Cerrar expediente</Button>}
    </Box>
    {!canOperate && <Alert severity="info">Modo de consulta: ADMIN puede inspeccionar cálculos, revisiones, informes y cierres, pero no mutarlos.</Alert>}{message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}{error && <Alert severity="error">{error}</Alert>}
    <Card><CardContent sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}><Datum label="Fecha de inspección" value={formatearFecha(evaluation.startedAt || evaluation.createdAt)} /><Datum label="Evaluador" value={evaluation.evaluatorName} /><Datum label="Origen" value={evaluation.origin} /><Datum label="Prioridad" value={evaluation.priority} /></CardContent></Card>
    <Card><CardContent><Typography variant="h2">Cálculo oficial vigente</Typography>{calculation ? <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(5,1fr)' }, gap: 2, my: 2 }}><Datum label="Cumplimiento BPM" value={`${numero(calculation.bpmPercentage)} %`} /><Datum label="Riesgo producto" value={numero(calculation.productRiskScore)} /><Datum label="Riesgo establecimiento" value={numero(calculation.establishmentRiskScore)} /><Datum label="Riesgo total" value={numero(calculation.totalRiskScore)} /><Datum label="Frecuencia" value={calculation.frequency} /></Box><Divider sx={{ my: 2 }} /><Typography variant="h3" sx={{ mb: 1 }}>Snapshot de factores</Typography><Table size="small"><TableHead><TableRow><TableCell>Factor</TableCell><TableCell>Selección</TableCell><TableCell align="right">Peso</TableCell><TableCell align="right">Aporte</TableCell></TableRow></TableHead><TableBody>{calculation.snapshots?.factors.map((factor) => <TableRow key={factor.riskFactorId}><TableCell>{factor.factorCode} · {factor.factorName}</TableCell><TableCell>{factor.optionLabel}</TableCell><TableCell align="right">{numero(factor.weight, 4)}</TableCell><TableCell align="right">{numero(factor.weightedContribution, 4)}</TableCell></TableRow>)}</TableBody></Table></> : <Typography color="text.secondary" sx={{ mt: 1 }}>La inspección todavía no tiene un cálculo vigente.</Typography>}</CardContent></Card>
    <Card><CardContent><Typography variant="h2">Revisión institucional</Typography>{review ? <Box sx={{ mt: 1 }}><Typography>Estado: <strong>{review.status}</strong> · Ciclo {review.cycleNumber} · Devoluciones {review.returnCount}</Typography>{review.returnReason && <Alert severity="warning" sx={{ mt: 2 }}>{review.returnReason}</Alert>}<Box sx={{ mt: 2 }}>{review.events?.map((event) => <Typography key={event.id} variant="body2">{event.eventType} · {formatearFechaHora(event.occurredAt)}</Typography>)}</Box></Box> : <Typography color="text.secondary" sx={{ mt: 1 }}>Todavía no se ha abierto una revisión.</Typography>}</CardContent></Card>
    <Card><CardContent><Typography variant="h2">Informe y cierre</Typography>{reports.length ? reports.map((report) => <Box key={report.id} sx={{ mt: 1.5 }}><Typography sx={{ fontWeight: 700 }}>{report.fileName} · {report.status}</Typography><Typography variant="body2" color="text.secondary">Generado {formatearFechaHora(report.generatedAt)}{report.officialAt ? ` · Oficial ${formatearFechaHora(report.officialAt)}` : ''} · Verificación {report.verificationId}</Typography></Box>) : <Typography color="text.secondary" sx={{ mt: 1 }}>No hay informes activos.</Typography>}{closure && <Alert severity="success" sx={{ mt: 2 }}>Cerrado el {formatearFechaHora(closure.closedAt)}. {closure.reason}</Alert>}</CardContent></Card>
    <Card><CardContent><Typography variant="h2">Cobertura BPM</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{workPackage.responses.length} respuestas registradas de {workPackage.bpmTemplate.items.filter((item) => item.isEvaluable).length} criterios evaluables.</Typography></CardContent></Card>
  </Box>;
}
function Datum({ label, value }: { label: string; value: string }) { return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography sx={{ fontWeight: 650 }}>{value}</Typography></Box>; }
