import { MOCK_INSPECTIONS, MOCK_TEMPLATE } from "../mock/mockData";
import type { Inspection, BpmTemplate } from "../types";

// Simula latencia de red real
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const api = {
  async getAssignedInspections(): Promise<Inspection[]> {
    await delay(400);
    return MOCK_INSPECTIONS;
  },

  async getOfflinePackage(
    inspectionId: string,
  ): Promise<{ inspection: Inspection; template: BpmTemplate }> {
    await delay(400);
    const inspection = MOCK_INSPECTIONS.find((i) => i.id === inspectionId);
    if (!inspection) throw new Error("Inspección no encontrada");
    return { inspection, template: MOCK_TEMPLATE };
  },

  // Simula el envío de una operación de sincronización.
  // Cuando conectes la API real, esta función es la única que cambia.
  async sendSyncOperation(payload: unknown): Promise<{ status: number }> {
    await delay(500);
    console.log("MOCK sync operation enviada:", payload);
    return { status: 200 };
  },
};
