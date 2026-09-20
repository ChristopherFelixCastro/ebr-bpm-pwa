import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/schema";
import type { InspectionLocation } from "../types";

interface Props {
  inspectionId: string;
}

export default function LocationCapture({ inspectionId }: Props) {
  const [location, setLocation] = useState<InspectionLocation | null>(null);
  const [status, setStatus] = useState<"idle" | "pidiendo" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function loadLocation() {
    const existing = await db.locations
      .where("inspectionId")
      .equals(inspectionId)
      .first();
    setLocation(existing ?? null);
  }

  useEffect(() => {
    loadLocation();
  }, [inspectionId]);

  function handleRequestLocation() {
    setStatus("pidiendo");
    setMessage(null);

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("Este dispositivo no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation: InspectionLocation = {
          id: uuidv4(),
          inspectionId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        };
        await db.locations.put(newLocation);
        setLocation(newLocation);
        setStatus("idle");
      },
      (err) => {
        setStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setMessage(
            "Permiso de ubicación denegado. Puedes continuar sin ubicación.",
          );
        } else {
          setMessage(
            "No se pudo obtener la ubicación en este momento. Puedes continuar sin ella.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleDiscard() {
    if (!location) return;
    await db.locations.delete(location.id);
    setLocation(null);
  }

  return (
    <div
      style={{
        margin: "16px 0",
        padding: 12,
        border: "1px dashed #666",
        borderRadius: 6,
      }}
    >
      <p style={{ margin: 0, fontWeight: "bold" }}>Ubicación (opcional)</p>
      {location ? (
        <div>
          <p style={{ fontSize: 13 }}>
            Lat: {location.latitude.toFixed(5)}, Lng:{" "}
            {location.longitude.toFixed(5)} (±{location.accuracy.toFixed(0)}m)
          </p>
          <button onClick={handleDiscard}>Descartar</button>
        </div>
      ) : (
        <div>
          <button
            onClick={handleRequestLocation}
            disabled={status === "pidiendo"}
          >
            {status === "pidiendo"
              ? "Obteniendo ubicación..."
              : "Registrar ubicación"}
          </button>
          {message && <p style={{ fontSize: 13, color: "#f90" }}>{message}</p>}
        </div>
      )}
    </div>
  );
}
