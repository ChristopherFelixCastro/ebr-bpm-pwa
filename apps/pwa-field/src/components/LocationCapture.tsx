import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../db/schema';
import { saveLocation } from '../db/repositories';
import type { InspectionLocation } from '../types';

interface Props { inspectionId: string; finalized?: boolean }
export default function LocationCapture({ inspectionId, finalized }: Props) {
  const { user } = useAuth();
  const [location, setLocation] = useState<InspectionLocation | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    void db.locations.where('inspectionId').equals(inspectionId).first().then((row) => setLocation(row ?? null));
  }, [inspectionId]);
  function capture() {
    if (!user) return;
    if (!window.confirm('La ubicación es opcional. ¿Deseas vincular tu posición actual a esta inspección?')) return;
    if (!navigator.geolocation) { setMessage('Este dispositivo no dispone de geolocalización.'); return; }
    setWorking(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const next: InspectionLocation = {
          id: crypto.randomUUID(), inspectionId, latitude: position.coords.latitude,
          longitude: position.coords.longitude, accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        };
        await saveLocation(inspectionId, next, user.id);
        setLocation(next);
        setMessage('Ubicación guardada en este dispositivo; se enviará con la inspección.');
      } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'No se pudo guardar la ubicación.'); }
      finally { setWorking(false); }
    }, (error) => {
      setWorking(false);
      setMessage(error.code === error.PERMISSION_DENIED
        ? 'Permiso denegado; puedes continuar sin ubicación.'
        : 'No se obtuvo la ubicación; puedes continuar sin ella.');
    }, { enableHighAccuracy: true, timeout: 10000 });
  }
  return <section style={{ border: '1px dashed #777', padding: 12, margin: '16px 0' }}>
    <strong>Ubicación opcional</strong>
    {location && <p>Capturada: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} (±{location.accuracy.toFixed(0)} m)</p>}
    <button type="button" disabled={working || finalized} onClick={capture}>
      {working ? 'Obteniendo ubicación...' : location ? 'Actualizar ubicación' : 'Registrar ubicación'}
    </button>
    {message && <p role="status">{message}</p>}
  </section>;
}
