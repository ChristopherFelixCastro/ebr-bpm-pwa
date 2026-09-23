import { useCallback, useEffect, useState } from 'react';
import { db } from '../db/schema';
import { syncNow } from '../offline/sync';
import { useAuth } from '../auth/AuthContext';
import type { SyncQueueItem } from '../types';

export default function SyncPanel() {
  const { user, onlineSession } = useAuth();
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [evidencePending, setEvidencePending] = useState(0);
  const [evidenceBlocked, setEvidenceBlocked] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const refresh = useCallback(async () => {
    const rows = await db.syncQueue.orderBy('order').toArray();
    setQueue(rows.filter((entry) => entry.ownerUserId === user?.id));
    const owned = new Set((await db.inspections.toArray()).filter((entry) => entry.ownerUserId === user?.id).map((entry) => entry.id));
    const evidence = (await db.evidences.toArray()).filter((entry) => owned.has(entry.inspectionId));
    setEvidencePending(evidence.filter((entry) => entry.status === 'PENDING' || entry.status === 'UPLOADING').length);
    setEvidenceBlocked(evidence.filter((entry) => entry.status === 'REJECTED').length);
  }, [user?.id]);
  const sync = useCallback(async () => {
    if (!user || !onlineSession || !navigator.onLine) return;
    setSyncing(true);
    try { await syncNow(user.id); } finally { await refresh(); setSyncing(false); }
  }, [user, onlineSession, refresh]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    const online = () => void sync();
    window.addEventListener('online', online);
    const timer = window.setInterval(() => void sync(), 15000);
    void sync();
    return () => { window.removeEventListener('online', online); window.clearInterval(timer); };
  }, [sync]);
  if (!user) return null;
  const waiting = queue.filter((entry) => ['PENDING', 'SENDING', 'RETRYABLE'].includes(entry.status));
  const blocked = queue.filter((entry) => ['AUTH_REQUIRED', 'CONFLICT', 'REJECTED'].includes(entry.status));
  if (!waiting.length && !blocked.length && !evidencePending && !evidenceBlocked) return null;
  return <aside aria-live="polite" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', padding: 12, borderTop: '1px solid #555' }}>
    <p>{waiting.length} operaciones pendientes. {blocked.length} requieren atención.</p>
    <p>{evidencePending} evidencias por enviar. {evidenceBlocked} evidencias requieren revisión.</p>
    {!onlineSession && navigator.onLine && <p>Inicia sesión nuevamente para enviar el trabajo guardado.</p>}
    {blocked.slice(0, 3).map((entry) => <p key={entry.operationId}>
      {entry.status}: {entry.lastError ?? 'Se requiere revisión'} · Inspección {entry.inspectionId.slice(0, 8)}
    </p>)}
    <button onClick={() => void sync()} disabled={syncing || !navigator.onLine || !onlineSession}>
      {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
    </button>
  </aside>;
}
