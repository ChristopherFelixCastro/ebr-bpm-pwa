import Dexie, { type Table } from "dexie";
import type {
  Inspection,
  BpmTemplate,
  EvaluationResponse,
  Evidence,
  InspectionLocation,
  SyncQueueItem,
  SyncLogEntry,
} from "../types";

export class PwaFieldDatabase extends Dexie {
  inspections!: Table<Inspection, string>;
  templates!: Table<BpmTemplate, string>;
  responses!: Table<EvaluationResponse, string>;
  evidences!: Table<Evidence, string>;
  locations!: Table<InspectionLocation, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  syncLog!: Table<SyncLogEntry, string>;

  constructor() {
    super("pwa-field-db");

    this.version(1).stores({
      inspections: "id, status, updatedAt",
      templates: "templateVersionId",
      responses: "id, inspectionId, bpmItemId, [inspectionId+bpmItemId]",
      evidences: "id, inspectionId, status",
      locations: "id, inspectionId",
      syncQueue: "operationId, inspectionId, status, order",
      syncLog: "id, operationId, occurredAt",
    });
  }
}

export const db = new PwaFieldDatabase();
