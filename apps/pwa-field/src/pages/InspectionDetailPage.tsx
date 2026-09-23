import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import LocationCapture from '../components/LocationCapture';
import EvidenceUploader from '../components/EvidenceUploader';
import { addFood, finalizeInspectionOffline, getInspectionWithTemplate, getResponses, saveResponse, selectFactor } from '../db/repositories';
import type { BpmResponseValue, BpmTemplate, BpmTemplateItem, EvaluationResponse, Inspection } from '../types';

const OPTIONS: BpmResponseValue[] = ['C', 'CP', 'IT', 'NA'];
export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<BpmTemplate | null>(null);
  const [responses, setResponses] = useState<Record<string, EvaluationResponse>>({});
  const [error, setError] = useState<string | null>(null);
  async function load() {
    if (!id || !user) return;
    const result = await getInspectionWithTemplate(id, user.id);
    setInspection(result?.inspection ?? null);
    setTemplate(result?.template ?? null);
    if (result?.template) setResponses(Object.fromEntries((await getResponses(id)).map((row) => [row.bpmItemId, row])));
  }
  useEffect(() => { void load(); }, [id, user?.id]);
  async function updateResponse(itemId: string, value: BpmResponseValue, observation: string) {
    if (!id || !user) return;
    setError(null);
    setResponses((previous) => ({
      ...previous,
      [itemId]: { id: `${id}_${itemId}`, inspectionId: id, bpmItemId: itemId, value, observation, updatedAt: new Date().toISOString() },
    }));
    try {
      await saveResponse(id, itemId, value, observation, user.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar localmente.'); }
  }
  async function chooseFactor(factorId: string, optionId: string) {
    if (!id || !user) return;
    try { await selectFactor(id, factorId, optionId, user.id); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar el factor.'); }
  }
  async function chooseFood(subcategoryId: string) {
    if (!id || !user) return;
    try { await addFood(id, subcategoryId, user.id); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar el producto.'); }
  }
  async function finalize() {
    if (!id || !user) return;
    try { await finalizeInspectionOffline(id, user.id); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo finalizar localmente.'); }
  }
  if (!inspection || !template) return <p style={{ padding: 24 }}>Descarga esta inspección con conexión antes de abrirla en campo.</p>;
  const editable = inspection.status === 'DRAFT' || inspection.status === 'IN_PROGRESS';
  const evaluable = template.items.filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable);
  const answered = evaluable.filter((item) => responses[item.id]?.value).length;
  const byId = new Map(template.items.map((item) => [item.id, item]));
  function depth(item: BpmTemplateItem): number {
    let level = 0;
    let parentId = item.parentItemId;
    while (parentId && level < 5) { level += 1; parentId = byId.get(parentId)?.parentItemId ?? null; }
    return level;
  }
  return <main style={{ padding: 24, paddingBottom: 130, maxWidth: 850, margin: 'auto' }}>
    <h1>{inspection.establishmentName ?? inspection.companyName ?? 'Evaluación BPM'}</h1>
    <p>{inspection.establishmentAddress}</p>
    <p>Estado: {inspection.status === 'LOCAL_PENDING' ? 'Pendiente de envío (guardado en este dispositivo)' : inspection.status}</p>
    <p>Progreso BPM: {answered} de {evaluable.length} criterios</p>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    <h2>Evaluación BPM</h2>
    {template.items.map((item) => item.itemKind === 'CRITERION' ? <section key={item.id} style={{ border: '1px solid #bbb', borderRadius: 8, padding: 12, margin: '10px 0', marginLeft: depth(item) * 8 }}>
      <strong>{item.displayCode} {item.title}</strong>
      {item.guidanceItems?.map((guidance) => <p key={guidance.id} style={{ fontSize: 13 }}>{guidance.text}</p>)}
      {item.isEvaluable && <>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {OPTIONS.map((option) => <button key={option} type="button" disabled={!editable}
            aria-pressed={responses[item.id]?.value === option}
            onClick={() => void updateResponse(item.id, option, responses[item.id]?.observation ?? '')}>{option}</button>)}
        </div>
        <label>Observación
          <textarea style={{ width: '100%', display: 'block' }} disabled={!editable}
            value={responses[item.id]?.observation ?? ''}
            onChange={(event) => {
              const observation = event.target.value;
              setResponses((previous) => ({
                ...previous, [item.id]: {
                  id: `${inspection.id}_${item.id}`, inspectionId: inspection.id, bpmItemId: item.id,
                  value: previous[item.id]?.value ?? null, observation, updatedAt: new Date().toISOString(),
                },
              }));
              const value = responses[item.id]?.value;
              if (value) void updateResponse(item.id, value, observation);
            }} />
        </label>
        <details><summary>Evidencia de este criterio</summary>
          <EvidenceUploader inspectionId={inspection.id} bpmItemId={item.id} finalized={!editable} />
        </details>
      </>}
    </section> : <h3 key={item.id} style={{ marginLeft: depth(item) * 12 }}>{item.displayCode} {item.title}</h3>)}
    <h2>Factores de riesgo</h2>
    {template.factors.map((factor) => <label key={factor.id} style={{ display: 'block', marginBottom: 12 }}>{factor.name}
      <select disabled={!editable} value={template.factorSelections.find((entry) => entry.riskFactorId === factor.id)?.optionId ?? ''}
        onChange={(event) => void chooseFactor(factor.id, event.target.value)}>
        <option value="">Seleccione una opción</option>
        {factor.options.map((option) => <option key={option.id} value={option.id}>{option.label} ({option.score})</option>)}
      </select>
    </label>)}
    <h2>Productos alimentarios</h2>
    {template.foodCatalog.map((category) => <label key={category.id} style={{ display: 'block', marginBottom: 12 }}>{category.name}
      <select disabled={!editable} value="" onChange={(event) => void chooseFood(event.target.value)}>
        <option value="">Agregar subcategoría</option>
        {category.subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
      </select>
    </label>)}
    <p>Seleccionados: {template.foodSnapshots.length}</p>
    <h2>Evidencias de la inspección</h2>
    <EvidenceUploader inspectionId={inspection.id} bpmItemId={null} finalized={!editable} />
    <LocationCapture inspectionId={inspection.id} finalized={!editable} />
    {editable ? <button type="button" onClick={() => void finalize()}>Finalizar localmente y preparar envío</button>
      : <p>Los cambios locales se conservan hasta que el Core confirme el envío.</p>}
  </main>;
}
