import { MOCK_INSPECTIONS, MOCK_TEMPLATE } from "../mock/mockData";
import type { Inspection, BpmTemplate } from "../types";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Permite forzar un error específico para pruebas, ej:
// http://localhost:5173/inspection/insp-mock-1?simulateError=409
function getSimulatedError(): number | null {
  const params = new URLSearchParams(window.location.search);
  const val = params.get("simulateError");
  return val ? parseInt(val, 10) : null;
}

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

  async sendSyncOperation(payload: unknown): Promise<{ status: number }> {
    await delay(500);

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      throw new ApiError(401, "TOKEN_EXPIRED", "La sesión expiró.");
    }

    const forced = getSimulatedError();
    if (forced === 401)
      throw new ApiError(401, "TOKEN_EXPIRED", "La sesión expiró.");
    if (forced === 403)
      throw new ApiError(
        403,
        "FORBIDDEN",
        "No tienes permiso para esta operación.",
      );
    if (forced === 409)
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "Otra modificación fue confirmada primero.",
      );
    if (forced === 413)
      throw new ApiError(
        413,
        "FILE_TOO_LARGE",
        "El archivo excede el límite permitido.",
      );
    if (forced === 422)
      throw new ApiError(422, "INVALID_STATE", "La evaluación ya fue enviada.");
    if (forced === 500)
      throw new ApiError(500, "SERVER_ERROR", "Error temporal del servidor.");

    console.log("MOCK sync operation enviada:", payload);
    return { status: 200 };
  },
};
