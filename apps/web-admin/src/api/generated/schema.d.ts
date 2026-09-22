export interface paths {
    "/v1/inspections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar inspecciones
         * @description ADMIN, UNIVERSAL y COORDINATOR leen globalmente; EVALUATOR solo propias. Admite page, limit, status, evaluatorUserId, caseId, origin, createdFrom y createdTo.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Inspection"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Filtros inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Bearer requerido. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{caseId}/inspections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear inspección para la asignación activa
         * @description Solo EVALUATOR asignado. El servidor fija las últimas versiones BPM y riesgo PUBLISHED; no acepta contexto técnico.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Inspection"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload no permitido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Bearer requerido. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No es el evaluador asignado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso no asignado o inspección editable existente. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Detalle seguro de inspección */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Inspection"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/work-package": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Paquete autocontenido offline
         * @description Incluye solo las versiones fijadas, preguntas BPM con sus instrucciones auxiliares y trazabilidad segura, respuestas, seis factores, catálogo alimentario, snapshots, metadatos seguros de evidencia y cálculo vigente. Nunca storagePath, signedUrl, tokens ni secretos.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["InspectionWorkPackage"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Iniciar DRAFT
         * @description DRAFT → IN_PROGRESS. Solo evaluador asignado y version vigente.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Inspection"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION o transición inválida. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/finalize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Finalizar y calcular atómicamente
         * @description Online-required. IN_PROGRESS → PENDING_SUBMISSION y cálculo vigente en la misma transacción; exige BPM completo, seis factores y alimentos aplicables.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION o transición inválida. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Entradas de cálculo incompletas. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enviar inspección finalizada
         * @description PENDING_SUBMISSION → SUBMITTED; requiere cálculo COMPLETED current con igual contentRevision. No recalcula.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description STALE_VERSION, cálculo no vigente o ALREADY_SUBMITTED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/unlock": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Desbloqueo excepcional
         * @description ADMIN, UNIVERSAL y COORDINATOR requieren reautenticación reciente. PENDING_SUBMISSION → IN_PROGRESS, incrementa contentRevision y supersede cálculo; SUBMITTED es terminal.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        reason: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Inspection"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Reautenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/bpm-responses/{bpmItemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Crear o actualizar respuesta BPM
         * @description Solo evaluador asignado en DRAFT/IN_PROGRESS; criterio evaluable de la versión fijada.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["BpmResponseInput"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Criterio o respuesta inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION o inspección bloqueada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /** Eliminar respuesta BPM editable */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        baseVersion: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Respuesta inexistente. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION o inspección bloqueada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/risk-factors/{factorId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Seleccionar opción de factor oficial */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["RiskFactorSelectionInput"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Factor u opción fuera de versión. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/food-snapshots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar snapshots alimentarios */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Capturar snapshot desde catálogo servidor
         * @description No acepta nombres, códigos, riesgos ni puntajes del cliente. NULL/NULL representa NA.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["FoodSnapshotInput"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Subcategoría fuera de versión. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Duplicado o STALE_VERSION. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar metadatos seguros de evidencia */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Subir evidencia privada
         * @description multipart/form-data, un archivo, máximo 5 MB, PDF/JPEG/PNG/WebP con extensión, MIME y magic bytes coherentes. Máximo 10 activas; REJECTED cuenta. Para idempotencia, payloadHash es SHA-256 del JSON canónico con baseVersion, contentSha256 del binario, fileName normalizado, mimeType validado, operationType=ADD_EVIDENCE y sizeBytes. La identidad exige además la misma inspección y actor.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        /** Format: binary */
                        file: string;
                        /** Format: uuid */
                        operationId?: string;
                        baseVersion?: number;
                        payloadHash?: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Archivo o payloadHash inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Límite, estado, versión o identidad idempotente en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Máximo 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/evidence/{evidenceId}/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Archivar evidencia lógicamente
         * @description Solo evaluador asignado en estado editable. REJECTED también puede archivarse y libera cupo.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Versión o estado en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/evidence/{evidenceId}/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Validar evidencia UPLOADED
         * @description ADMIN, UNIVERSAL o COORDINATOR.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/evidence/{evidenceId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rechazar evidencia UPLOADED
         * @description Motivo obligatorio; REJECTED conserva cupo hasta archivado.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Motivo requerido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/evidence/{evidenceId}/download-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Emitir URL privada por 60 segundos
         * @description Solo roles globales o evaluador asignado; ARCHIVED no descarga. La auditoría nunca contiene URL ni storagePath.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No disponible. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/offline-operations/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sincronizar lote offline
         * @description Hasta 100, en orden y aisladas. Un reintento exige el mismo UUID, inspección, tipo, baseVersion, actor y hash canónico, y devuelve exactamente el mismo resultado funcional. Cualquier reutilización incompatible produce IDEMPOTENCY_KEY_REUSED. La reserva concurrente evita dobles efectos. Conflictos no se fusionan; FINALIZE es ONLINE_REQUIRED y ADD_EVIDENCE exige multipart.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OfflineBatch"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Lote o hash inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description IDEMPOTENCY_KEY_REUSED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/offline-operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Historial sanitizado de operaciones offline */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/offline-conflicts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Conflictos offline recuperables
         * @description currentValue contiene únicamente el recurso afectado; nunca PII, storagePath, URL o token.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/calculations/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Previsualizar cálculo sin persistencia
         * @description Misma fórmula oficial: BPM excluye NA; producto=max alimento aplicable; establecimiento=sum(score×weight); total=producto×establecimiento; rango con límites inclusivos/exclusivos.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description CALCULATION_INPUT_INCOMPLETE con códigos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/calculations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Historial de cálculos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Calculation"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/calculations/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Cálculo vigente */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Calculation"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description No existe vigente. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/calculations/{calculationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Detalle y snapshots históricos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Calculation"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{id}/calculations/recalculate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Recálculo administrativo SUBMITTED
         * @description ADMIN, UNIVERSAL o COORDINATOR. Motivo obligatorio, supersede current, serializa calculationNumber y conserva snapshots.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        reason: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Calculation"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Motivo requerido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Solo SUBMITTED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Entradas inválidas. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar asignaciones
         * @description ADMIN, UNIVERSAL y COORDINATOR ven el historial global. EVALUATOR solo sus asignaciones activas e históricas.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    active?: boolean;
                    evaluatorUserId?: string;
                    caseId?: string;
                    origin?: string;
                    assignedFrom?: string;
                    assignedTo?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Assignment"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Filtros inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o evaluador fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{caseId}/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                caseId: string;
            };
            cookie?: never;
        };
        /** Historial de asignaciones del caso */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Assignment"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Caso fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Asignar evaluador
         * @description Solo ADMIN, UNIVERSAL o COORDINATOR. El evaluador debe ser EVALUATOR APPROVED; la operación cambia el caso a ASSIGNED.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AssignmentCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Assignment"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload o evaluador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso o evaluador no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso no asignable o ya asignado. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{caseId}/reassign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reasignar atómicamente
         * @description Cierra la asignación anterior, crea la nueva y reemplaza cualquier agenda activa conservando fecha, hora y notas. Requiere versión optimista y motivo.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["Reassignment"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                assignment?: components["schemas"]["Assignment"];
                                schedule?: Record<string, never> | null;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso o evaluador no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, mismo evaluador o conflicto de estado. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/schedules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar agenda
         * @description EVALUATOR solo ve programaciones vinculadas a sus asignaciones activas o históricas.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    status?: "SCHEDULED" | "RESCHEDULED" | "CANCELLED";
                    evaluatorUserId?: string;
                    caseId?: string;
                    startFrom?: string;
                    startTo?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Schedule"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Filtros inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o evaluador fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{caseId}/schedules": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                caseId: string;
            };
            cookie?: never;
        };
        /** Agenda histórica del caso */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Schedule"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Caso fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Programar inspección
         * @description Solo roles administrativos. Inicio futuro, duración entre 15 minutos y 12 horas, timezone fijo America/Santo_Domingo. Los solapamientos generan meta.warnings y no bloquean.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScheduleCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Schedule"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Ventana temporal inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso sin asignación o agenda ya activa. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{caseId}/schedules/{scheduleId}/reschedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reprogramar inspección
         * @description Cierra la entrada anterior como RESCHEDULED y crea otra SCHEDULED. Devuelve advertencias de solapamiento sin revelar otros casos.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                    scheduleId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScheduleReschedule"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Ventana o payload inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Programación no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{caseId}/schedules/{scheduleId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancelar programación
         * @description Conserva caso y asignación activos; requiere versión y motivo. No crea otra entrada.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                    scheduleId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScheduleCancel"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Schedule"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Programación no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION o ALREADY_CANCELLED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar bandeja de casos de ingreso
         * @description Solo ADMIN, UNIVERSAL y COORDINATOR. La búsqueda usa únicamente referencias no sensibles.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    origin?: "INSTITUTIONAL_PROGRAM" | "HEALTH_ALERT" | "COMPLAINT";
                    status?: string;
                    priority?: string;
                    companyId?: string;
                    establishmentId?: string;
                    dateFrom?: string;
                    dateTo?: string;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Filtros inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cases/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar caso y fuente */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Caso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/institutional-program-cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear programa institucional
         * @description Crea atómicamente caso MEDIUM/PENDING_ASSIGNMENT. Empresa y establecimiento son opcionales.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["InstitutionalProgramCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Organización inexistente. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Organización inactiva. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/institutional-program-cases/{caseId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                caseId: string;
            };
            cookie?: never;
        };
        /** Consultar programa institucional */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar programa no asignado
         * @description Requiere version. Solo PENDING_ASSIGNMENT sin asignación activa.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["InstitutionalProgramPatch"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description STALE_VERSION o ALREADY_ASSIGNED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/health-alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear alerta sanitaria
         * @description Crea atómicamente caso HIGH/PENDING_REVIEW; alertNumber es oficial y único sin distinguir mayúsculas o espacios externos.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["HealthAlertCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Número duplicado u organización inactiva. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/health-alerts/{caseId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                caseId: string;
            };
            cookie?: never;
        };
        /** Consultar alerta */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar alerta pendiente
         * @description Requiere version; no acepta campos de decisión.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["HealthAlertPatch"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description STALE_VERSION o ALREADY_DECIDED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/health-alerts/{caseId}/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decidir alerta
         * @description PROCEEDS o NOT_PROCEEDS; reason es obligatorio para NOT_PROCEEDS. Decisión irreversible y sincronizada con el caso.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["HealthAlertDecision"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Campos condicionales inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description ALREADY_DECIDED o versión obsoleta. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/complaints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear denuncia anónima o identificada
         * @description Crea caso MEDIUM/PENDING_REVIEW. complainantData usa allowlist estricta y nunca se incluye en listados o auditoría.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ComplaintCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload o complainantData inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/complaints/{caseId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                caseId: string;
            };
            cookie?: never;
        };
        /**
         * Consultar denuncia
         * @description El detalle puede incluir complainantData.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar denuncia pendiente
         * @description Requiere version; no acepta campos de decisión.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    caseId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ComplaintPatch"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description STALE_VERSION o ALREADY_DECIDED. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/complaints/{caseId}/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Decidir denuncia
         * @description PROCEEDS, NOT_PROCEEDS o REFERRED. REFERRED exige referralReason y referralDestination; NOT_PROCEEDS exige decisionReason.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ComplaintDecision"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["IntakeCase"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Campos condicionales inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description ALREADY_DECIDED o versión obsoleta. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar solicitudes según alcance
         * @description ADMIN, UNIVERSAL y COORDINATOR leen globalmente; COMPANY_ADMIN y DELEGATE solo su empresa activa; EVALUATOR está prohibido. La respuesta incluye page, limit y total en meta.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    status?: "DRAFT" | "PENDING_ASSIGNMENT";
                    establishmentId?: string;
                    requestType?: string;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CompanyRequest"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Filtros inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /** Crear solicitud en borrador */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CompanyRequestCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CompanyRequest"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Organización no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Organización inactiva. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar solicitud y resumen */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CompanyRequestDetail"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modificar borrador con versión optimista */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CompanyRequestPatch"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CompanyRequest"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Sin escritura. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description ALREADY_SUBMITTED o STALE_VERSION. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/company-requests/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enviar solicitud y crear caso atómicamente
         * @description Exige 1–10 documentos activos, exactamente una carta válida, contactos y exactamente un contacto primario. Crea un caso MEDIUM/PENDING_ASSIGNMENT. Una repetición devuelve ALREADY_SUBMITTED.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CompanyRequestSubmitResult"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance o rol sin escritura. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Solicitud no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description ALREADY_SUBMITTED, precondición o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Vincular contacto al borrador */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["RequestContactCreate"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RequestContactLinkResult"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Payload inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Contacto fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Solicitud o contacto no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Solicitud enviada o relación duplicada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/contacts/{requestContactId}/remove": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                requestContactId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Retirar contacto del borrador */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    requestContactId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Contacto retirado lógicamente. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Solicitud no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION o solicitud enviada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        /** Listar metadatos de documentos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RequestDocument"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Cargar documento privado
         * @description Máximo 5 MB. Se validan MIME, extensión y bytes mágicos; si falla la persistencia se elimina el objeto cargado.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        /** @enum {string} */
                        documentType: "AUTHORIZATION_LETTER" | "SUPPORTING_DOCUMENT";
                        /** Format: binary */
                        file: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RequestDocument"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Archivo inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/documents/{documentId}/validate": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                documentId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Validar documento pendiente
         * @description ADMIN, UNIVERSAL o COORDINATOR.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    documentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RequestDocument"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/documents/{documentId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                documentId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rechazar documento pendiente */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    documentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": WithRequired<components["schemas"]["DocumentDecision"], "version" | "reason">;
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RequestDocument"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Motivo requerido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/documents/{documentId}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                documentId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Archivar documento rechazado
         * @description Archivado lógico; el objeto privado se conserva.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    documentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RequestDocument"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Solo documentos REJECTED o versión vigente. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/company-requests/{id}/documents/{documentId}/download-url": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                documentId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Emitir URL firmada de descarga
         * @description La URL privada vence en 60 segundos y la emisión queda auditada sin registrar URL ni storagePath.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    documentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["DownloadUrl"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Documento no disponible. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar contactos en alcance */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Contact"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /** Crear contacto global */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ContactRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Contact"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Solo administración global. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/contacts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        /**
         * Consultar contacto
         * @description ADMIN y UNIVERSAL requieren reautenticación reciente para recibir identityDocument; los demás reciben solo máscara.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Contact"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Reautenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Editar contacto con versión */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ContactPatchRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Contact"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Versión o documento en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/companies/{companyId}/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                companyId: string;
            };
            cookie?: never;
        };
        /** Listar relaciones de empresa */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    companyId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ContactRelation"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        /** Vincular contacto reutilizable a empresa */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    companyId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ContactLinkRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ContactRelation"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contacto o empresa fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Relación en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/companies/{companyId}/contacts/{relationId}/end": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                companyId: string;
                relationId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Finalizar relación histórica de empresa
         * @description Exige version y effectiveTo posterior a effectiveFrom.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    companyId: string;
                    relationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ContactRelationEndRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @constant */
                                ended: true;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Versión o fecha en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/establishments/{establishmentId}/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                establishmentId: string;
            };
            cookie?: never;
        };
        /** Listar relaciones de establecimiento */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    establishmentId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ContactRelation"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        /** Vincular contacto a establecimiento */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    establishmentId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ContactLinkRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ContactRelation"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contacto o establecimiento fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Relación en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/establishments/{establishmentId}/contacts/{relationId}/end": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                establishmentId: string;
                relationId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Finalizar relación histórica de establecimiento */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    establishmentId: string;
                    relationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ContactRelationEndRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @constant */
                                ended: true;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Versión o fecha en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/establishments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar establecimientos
         * @description Paginado y filtrable por estado, empresa, ubicación y vencimiento. ADMIN, UNIVERSAL, COORDINATOR y EVALUATOR leen globalmente; COMPANY_ADMIN y DELEGATE solo su empresa activa.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    search?: string;
                    status?: "ACTIVE" | "INACTIVE";
                    companyId?: string;
                    provinceCode?: string;
                    municipalityCode?: string;
                    healthJurisdictionCode?: string;
                    sanitaryPermitExpiresBefore?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Establishment"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Consulta inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear establecimiento activo
         * @description ADMIN y UNIVERSAL crean para cualquier empresa activa; COMPANY_ADMIN únicamente para su empresa activa.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["EstablishmentCreateRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Establishment"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Empresa inexistente. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Empresa inactiva. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/establishments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar establecimiento */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Establishment"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Modificar establecimiento
         * @description Exige versión y no permite traslado de empresa. Solo ADMIN, UNIVERSAL o el COMPANY_ADMIN de la empresa activa.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["EstablishmentPatchRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Establishment"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/establishments/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Desactivar establecimiento
         * @description Exige reautenticación reciente y versión. Es idempotente únicamente con versión coincidente; no elimina historial.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Establishment"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Reautenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/establishments/{id}/operational-profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar historial de perfiles
         * @description Orden descendente por effectiveFrom.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["OperationalProfile"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear perfil operativo vigente
         * @description Solo escritores permitidos. Empresa y establecimiento deben estar ACTIVE. Cierra el perfil vigente en la misma transacción; evita fecha igual, anterior y solapamientos.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["OperationalProfileCreateRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["OperationalProfile"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Fecha o estado en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/establishments/{id}/operational-profiles/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar perfil operativo vigente */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["OperationalProfile"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Establecimiento o perfil no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/companies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar empresas paginadas
         * @description ADMIN y UNIVERSAL consultan el alcance global. COMPANY_ADMIN recibe exclusivamente su empresa activa resuelta desde la membresía del servidor.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    search?: string;
                    status?: "ACTIVE" | "INACTIVE";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Company"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Consulta inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear empresa activa
         * @description Solo ADMIN o UNIVERSAL. El estado inicial es ACTIVE; el RNC debe ser único tras normalización.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CompanyCreateRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Company"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description RNC duplicado. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/companies/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar empresa */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Company"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Empresa fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Empresa no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Modificar empresa con versión optimista
         * @description ADMIN y UNIVERSAL tienen alcance global. COMPANY_ADMIN solo puede modificar su empresa activa. Una versión vieja retorna STALE_VERSION.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CompanyPatchRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Company"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Empresa fuera de alcance. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Empresa no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description RNC duplicado o versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/companies/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Desactivar empresa y establecimientos activos
         * @description Solo ADMIN o UNIVERSAL, con JWT reautenticado dentro del período configurado. La operación es transaccional e idempotente únicamente si la versión coincide.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Company"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Empresa no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar usuarios */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Consulta inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /** Crear usuario pendiente */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UserCreateRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Datos inválidos. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Correo duplicado. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar usuario */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modificar usuario con versión optimista */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UserPatchRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Modificación inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/users/{id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Aprobar usuario */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Solicitud inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/users/{id}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rechazar usuario */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Solicitud inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/users/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Desactivar usuario y revocar sesiones */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["VersionRequest"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["User"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Solicitud inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description No encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Versión desactualizada. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Comprobar que el proceso está activo */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @constant */
                                status?: "ok";
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Comprobar la conexión con PostgreSQL */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @constant */
                                status?: "ready";
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description La API no está lista. */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Iniciar sesión */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["Credentials"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["AccessToken"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Solicitud inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Credenciales inválidas. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rotar el refresh token
         * @description Usa y reemplaza la cookie HttpOnly refresh_token. La solicitud debe provenir de un Origin autorizado.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["AccessToken"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Refresh token inválido. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Origin no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cerrar sesión */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @constant */
                                loggedOut?: true;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Origin no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/reauthenticate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Confirmar nuevamente la contraseña */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["PasswordConfirmation"];
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["AccessToken"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Solicitud inválida. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o contraseña inválida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar la identidad autenticada */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["CurrentUser"];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Autenticación requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar ciclos de revisión
         * @description Lectura global institucional; EVALUATOR solo sobre su inspección. Nunca expone observaciones BPM ni texto de auditoría.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Abrir revisión
         * @description COORDINATOR abre normalmente; ADMIN/UNIVERSAL intervienen excepcionalmente. Exige inspección SUBMITTED, cálculo vigente coincidente, caso abierto y ausencia de ciclo activo o informe oficial.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": Record<string, never>;
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar revisión actual
         * @description Devuelve ciclo, devoluciones históricas, versiones de respuesta y eventos saneados.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews/{reviewId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar ciclo de revisión */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reviewId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews/{reviewId}/return": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Devolver criterios para corrección
         * @description COORDINATOR opera normalmente. ADMIN/UNIVERSAL requieren reautenticación reciente. Motivo general y uno o más criterios evaluables únicos; el cálculo previo queda supersedido atómicamente.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reviewId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        reason: string;
                        bpmItemIds: string[];
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews/{reviewId}/corrections/{bpmItemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Corregir criterio señalado
         * @description Solo el EVALUATOR asignado. baseVersion aplica control optimista. Factores, alimentos, evidencias, agenda y asignación continúan bloqueados.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reviewId: string;
                    bpmItemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        baseVersion: number;
                        /** @enum {string} */
                        responseValue: "C" | "CP" | "IT" | "NA";
                        observations?: string | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /**
         * Eliminar respuesta de criterio señalado
         * @description Solo el EVALUATOR asignado; eliminar cuenta como mutación trazable, pero el reenvío exige nuevamente todas las respuestas.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reviewId: string;
                    bpmItemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        baseVersion: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews/{reviewId}/resubmit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reenviar corrección y recalcular
         * @description Exclusivamente online y para el EVALUATOR asignado. En una transacción valida todas las correcciones, usa el motor oficial, crea un cálculo COMPLETED vigente y mueve el mismo ciclo a RESUBMITTED.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reviewId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": Record<string, never>;
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reviews/{reviewId}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Aprobar revisión
         * @description COORDINATOR opera normalmente; ADMIN/UNIVERSAL requieren reautenticación reciente. El ciclo aprobado y sus snapshots de participantes son inmutables.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reviewId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        note?: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar informes activos
         * @description Metadatos autorizados únicamente: nunca storagePath, SHA-256 interno ni URL firmada.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reports/{reportId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar metadatos de informe
         * @description Incluye verificationId público, estado y versiones; omite rutas y hashes.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reportId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reports/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generar o regenerar borrador PDF
         * @description COORDINATOR o intervención ADMIN/UNIVERSAL. operationId UUID hace el reintento idempotente. HTML/CSS controlado, sin recursos remotos, se convierte a PDF, calcula SHA-256 y guarda en Storage privado; cualquier fallo SQL compensa el objeto nuevo.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        operationId: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reports/{reportId}/officialize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Oficializar informe
         * @description Operación separada. Exige DRAFT, revisión APPROVED, cálculo vigente y snapshots de evaluador/aprobador. COORDINATOR normal; ADMIN/UNIVERSAL con reautenticación reciente. OFFICIAL es inmutable.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reportId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": Record<string, never>;
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/reports/{reportId}/download-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Emitir URL privada temporal
         * @description Solo usuario institucional autorizado. La URL firmada dura exactamente 60 segundos, se entrega únicamente aquí y se audita sin persistirla.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                    reportId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": Record<string, never>;
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uri */
                                signedUrl: string;
                                /** @constant */
                                expiresInSeconds: 60;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cerrar inspección y caso
         * @description Acción posterior e idempotente para la misma identidad. COORDINATOR normal; ADMIN/UNIVERSAL con reautenticación reciente. Cancela agenda, cierra asignación y caso, conserva historiales y crea inspection_closures atómicamente.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        reportId: string;
                        reason?: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inspections/{inspectionId}/closure": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar cierre
         * @description Metadatos históricos saneados del cierre. COMPANY_ADMIN y DELEGATE no tienen acceso.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    inspectionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description DTO estricto o identificador inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol o recurso fuera del alcance institucional. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Recurso no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Estado, idempotencia o versión en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PDF excede el límite privado de 5 MB. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Datos de cálculo incompletos. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar catálogos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear catálogos
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        code: string;
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar plantillas BPM */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                isDefault: boolean;
                                version: number;
                            }[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear plantillas BPM
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        code: string;
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar reglas de riesgo */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                isDefault: boolean;
                                version: number;
                            }[];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear reglas de riesgo
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        code: string;
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar catálogos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Actualizar metadatos antes de publicar
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        name?: string;
                        description?: string | null;
                        supportsHierarchy?: boolean;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar versiones */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear o clonar versión
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        cloneFromVersionId?: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar versión */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Previsualizar snapshot ordenado sin mutación */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Validar sin modificar versión, estado ni updatedAt */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publicar inmediata o programadamente
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        /** Format: date-time */
                        effectiveFrom: string;
                        publicationNote?: string | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/retire": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retirar conservando historia
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar plantillas BPM */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                isDefault: boolean;
                                version: number;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar versiones */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear o clonar versión
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        cloneFromVersionId?: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar versión */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Previsualizar snapshot ordenado sin mutación */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Validar sin modificar versión, estado ni updatedAt */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publicar inmediata o programadamente
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        /** Format: date-time */
                        effectiveFrom: string;
                        publicationNote?: string | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/retire": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retirar conservando historia
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar reglas de riesgo */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                isDefault: boolean;
                                version: number;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar versiones */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear o clonar versión
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        cloneFromVersionId?: string;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consultar versión */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Previsualizar snapshot ordenado sin mutación */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Validar sin modificar versión, estado ni updatedAt */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publicar inmediata o programadamente
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        /** Format: date-time */
                        effectiveFrom: string;
                        publicationNote?: string | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/retire": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retirar conservando historia
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/set-default": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Designar plantilla BPM predeterminada
         * @description ADMIN o UNIVERSAL con reautenticación reciente. Usa control optimista y lock global; afecta solo inspecciones futuras. La respuesta incluye isDefault=true.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                isDefault: boolean;
                                version: number;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/set-default": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Designar conjunto de riesgo predeterminado
         * @description ADMIN o UNIVERSAL con reautenticación reciente. Usa control optimista y lock global; afecta solo inspecciones futuras. La respuesta incluye isDefault=true.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** Format: uuid */
                                id: string;
                                code: string;
                                name: string;
                                isDefault: boolean;
                                version: number;
                            };
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear nodo de borrador
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        code: string;
                        name: string;
                        /** @enum {unknown} */
                        entryType: "NODE" | "LEAF";
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/items/{itemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar nodo sin hijos
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar nodo con versión
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/catalogs/{catalogId}/versions/{versionId}/items/{itemId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mover o reordenar nodo
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    catalogId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        /** Format: uuid */
                        parentId: string | null;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear SECTION, SUBSECTION, GROUP o CRITERION
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {unknown} */
                        itemKind: "SECTION" | "SUBSECTION" | "GROUP" | "CRITERION";
                        title: string;
                        sortOrder: number;
                        isEvaluable: boolean;
                        /** @enum {string|null} */
                        defaultCriticality?: "CRITICA" | "MAYOR" | "MENOR" | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items/{itemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar ítem BPM
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar ítem BPM
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items/{itemId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mover o reordenar ítem BPM
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        /** Format: uuid */
                        parentId: string | null;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items/{itemId}/guidance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar instrucciones del criterio */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["BpmGuidanceItem"][];
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Rol no autorizado. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Criterio no encontrado. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Crear instrucción auxiliar
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        text: string;
                        sortOrder: number;
                        /** @enum {string|null} */
                        criticality?: "CRITICA" | "MAYOR" | "MENOR" | null;
                        sourceReference?: string | null;
                        sourceRowNumber?: number | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items/{itemId}/guidance/{guidanceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar instrucción auxiliar
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                    guidanceId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar instrucción auxiliar
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    templateId: string;
                    versionId: string;
                    itemId: string;
                    guidanceId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        text?: string;
                        sortOrder?: number;
                        /** @enum {string|null} */
                        criticality?: "CRITICA" | "MAYOR" | "MENOR" | null;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear factors
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors/{factorId}/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear factors/{factorId}/options
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/food-categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear food-categories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/food-categories/{categoryId}/subcategories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear food-categories/{categoryId}/subcategories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/frequency-ranges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear frequency-ranges
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors/{factorId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar factors
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar factors
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors/{factorId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reordenar factors
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors/{factorId}/options/{optionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar factors/{factorId}/options
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                    optionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar factors/{factorId}/options
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                    optionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors/{factorId}/options/{optionId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reordenar factors/{factorId}/options
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    factorId: string;
                    optionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/food-categories/{categoryId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar food-categories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar food-categories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/food-categories/{categoryId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reordenar food-categories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/food-categories/{categoryId}/subcategories/{subcategoryId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar food-categories/{categoryId}/subcategories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                    subcategoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar food-categories/{categoryId}/subcategories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                    subcategoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/food-categories/{categoryId}/subcategories/{subcategoryId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reordenar food-categories/{categoryId}/subcategories
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    categoryId: string;
                    subcategoryId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/frequency-ranges/{rangeId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Eliminar frequency-ranges
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    rangeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Editar frequency-ranges
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    rangeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/frequency-ranges/{rangeId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reordenar frequency-ranges
         * @description ADMIN y UNIVERSAL mutan borradores con versión optimista. Publicar y retirar requieren reautenticación reciente. Las versiones publicadas o retiradas son históricas e inmutables; importación Excel queda fuera de alcance.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    setId: string;
                    versionId: string;
                    rangeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        version: number;
                        sortOrder: number;
                    };
                };
            };
            responses: {
                /** @description Operación completada. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            meta: {
                                /** Format: uuid */
                                correlationId: string;
                            };
                        };
                    };
                };
                /** @description Contrato estricto inválido. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Autenticación o reautenticación reciente requerida. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Rol sin acceso administrativo. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description Definición o versión no encontrada. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description STALE_VERSION, borrador único o vigencia en conflicto. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
                /** @description PUBLICATION_INVALID con códigos estables de todos los errores. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Credentials: {
            /**
             * Format: email
             * @example universal@ebr-bpm.local
             */
            email: string;
            /**
             * Format: password
             * @example PruebaSegura123!
             */
            password: string;
        };
        PasswordConfirmation: {
            /**
             * Format: password
             * @example PruebaSegura123!
             */
            password: string;
        };
        AccessToken: {
            /** @description JWT de acceso de corta duración. */
            accessToken: string;
        };
        CurrentUser: {
            /** Format: uuid */
            id: string;
            fullName: string;
            /** @enum {string} */
            roleCode: "ADMIN" | "COMPANY_ADMIN" | "DELEGATE" | "COORDINATOR" | "EVALUATOR" | "UNIVERSAL";
            /** @enum {string} */
            status: "PENDING_VALIDATION" | "APPROVED" | "REJECTED" | "INACTIVE";
            /**
             * Format: uuid
             * @description Alcance empresarial vigente disponible. No implica asignaciones por establecimiento.
             */
            companyId: string | null;
            /** @description Fecha Unix de la autenticación de contraseña. */
            authTime: number;
        };
        User: {
            /** Format: uuid */
            id: string;
            fullName: string;
            /** Format: email */
            email: string;
            phone: string | null;
            /** @enum {string} */
            status: "PENDING_VALIDATION" | "APPROVED" | "REJECTED" | "INACTIVE";
            version: number;
            /** @enum {string} */
            roleCode: "ADMIN" | "COMPANY_ADMIN" | "DELEGATE" | "COORDINATOR" | "EVALUATOR" | "UNIVERSAL";
            /** Format: uuid */
            companyId: string | null;
            companyName: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        UserCreateRequest: {
            fullName: string;
            /** Format: email */
            email: string;
            phone?: string;
            password: string;
            /** @enum {string} */
            roleCode: "ADMIN" | "COMPANY_ADMIN" | "DELEGATE" | "COORDINATOR" | "EVALUATOR" | "UNIVERSAL";
            /** Format: uuid */
            companyId?: string;
        };
        UserPatchRequest: {
            version: number;
            fullName?: string;
            phone?: string | null;
            /** @enum {string} */
            roleCode?: "ADMIN" | "COMPANY_ADMIN" | "DELEGATE" | "COORDINATOR" | "EVALUATOR" | "UNIVERSAL";
            /** Format: uuid */
            companyId?: string | null;
        };
        Company: {
            /** Format: uuid */
            id: string;
            legalName: string;
            tradeName: string | null;
            rnc: string | null;
            address: string | null;
            phone: string | null;
            /** Format: email */
            email: string | null;
            economicActivityCode: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "INACTIVE";
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            establishmentCount: number;
            activeEstablishmentCount: number;
        };
        CompanyCreateRequest: {
            legalName: string;
            tradeName?: string | null;
            rnc: string;
            address?: string | null;
            phone?: string | null;
            /** Format: email */
            email?: string | null;
            economicActivityCode?: string | null;
        };
        /** @description Incluya la versión actualmente leída y al menos un campo de empresa. */
        CompanyPatchRequest: {
            version: number;
            legalName?: string;
            tradeName?: string | null;
            rnc?: string;
            address?: string | null;
            phone?: string | null;
            /** Format: email */
            email?: string | null;
            economicActivityCode?: string | null;
        };
        VersionRequest: {
            version: number;
        };
        Establishment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            companyId: string;
            companyLegalName: string;
            companyTradeName: string | null;
            name: string;
            establishmentTypeCode: string | null;
            address: string | null;
            provinceCode: string | null;
            municipalityCode: string | null;
            healthJurisdictionCode: string | null;
            sanitaryPermitNumber: string | null;
            /** Format: date */
            sanitaryPermitExpiresAt: string | null;
            /** Format: date */
            operationsStartedAt: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "INACTIVE";
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            currentOperationalProfile: components["schemas"]["OperationalProfile"] | null;
        };
        OperationalProfile: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            establishmentId: string;
            annualProduction: number | null;
            marketTarget: string | null;
            commercializationScope: string | null;
            employeeCount: number | null;
            maleEmployeeCount: number | null;
            femaleEmployeeCount: number | null;
            haccpStatus: string | null;
            haccpImplementationLevel: string | null;
            samplingPlanStatus: string | null;
            samplingPlanScope: string | null;
            inabieSupplierStatus: string | null;
            inabieDistributionScope: string | null;
            /** Format: date */
            effectiveFrom: string;
            /** Format: date */
            effectiveTo: string | null;
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        EstablishmentCreateRequest: {
            /** Format: uuid */
            companyId: string;
            name: string;
            establishmentTypeCode?: string | null;
            address?: string | null;
            provinceCode?: string | null;
            municipalityCode?: string | null;
            healthJurisdictionCode?: string | null;
            sanitaryPermitNumber?: string | null;
            /** Format: date */
            sanitaryPermitExpiresAt?: string | null;
            /** Format: date */
            operationsStartedAt?: string | null;
        };
        /** @description companyId, status e id no son editables. */
        EstablishmentPatchRequest: {
            version: number;
            name?: string;
            establishmentTypeCode?: string | null;
            address?: string | null;
            provinceCode?: string | null;
            municipalityCode?: string | null;
            healthJurisdictionCode?: string | null;
            sanitaryPermitNumber?: string | null;
            /** Format: date */
            sanitaryPermitExpiresAt?: string | null;
            /** Format: date */
            operationsStartedAt?: string | null;
        };
        /** @description effectiveTo lo administra el servidor. Solo se acepta un perfil nuevo por establecimiento y día. */
        OperationalProfileCreateRequest: {
            annualProduction?: number | null;
            marketTarget?: string | null;
            commercializationScope?: string | null;
            employeeCount?: number | null;
            maleEmployeeCount?: number | null;
            femaleEmployeeCount?: number | null;
            haccpStatus?: string | null;
            haccpImplementationLevel?: string | null;
            samplingPlanStatus?: string | null;
            samplingPlanScope?: string | null;
            inabieSupplierStatus?: string | null;
            inabieDistributionScope?: string | null;
            /** Format: date */
            effectiveFrom: string;
        };
        Contact: {
            /** Format: uuid */
            id: string;
            fullName: string;
            /** @description Documento siempre enmascarado salvo detalle autorizado. */
            identityDocumentMasked: string | null;
            identityDocument?: string | null;
            phone: string | null;
            /** Format: email */
            email: string | null;
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        ContactRequest: {
            fullName: string;
            identityDocument?: string | null;
            phone?: string | null;
            /** Format: email */
            email?: string | null;
        };
        ContactPatchRequest: {
            version: number;
            fullName?: string;
            identityDocument?: string | null;
            phone?: string | null;
            /** Format: email */
            email?: string | null;
        };
        ContactLinkRequest: {
            /** Format: uuid */
            contactId?: string;
            contact?: components["schemas"]["ContactRequest"];
            /** @enum {string} */
            relationshipType: "LEGAL_REPRESENTATIVE" | "QUALITY_CONTACT" | "PRIMARY_CONTACT" | "OWNER" | "REPRESENTATIVE";
            isPrimary: boolean;
            /** Format: date */
            effectiveFrom: string;
        };
        ContactRelation: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            companyId?: string;
            /** Format: uuid */
            establishmentId?: string;
            /** @enum {string} */
            relationshipType: "LEGAL_REPRESENTATIVE" | "QUALITY_CONTACT" | "PRIMARY_CONTACT" | "OWNER" | "REPRESENTATIVE";
            isPrimary: boolean;
            /** Format: date */
            effectiveFrom: string;
            /** Format: date */
            effectiveTo: string | null;
            version: number;
            contact: components["schemas"]["Contact"];
        };
        ContactRelationEndRequest: {
            version: number;
            /** Format: date */
            effectiveTo: string;
        };
        CompanyRequest: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            companyId: string;
            /** Format: uuid */
            establishmentId: string;
            establishmentName?: string;
            requestType: string;
            reason: string;
            observations?: string | null;
            /** @enum {string} */
            status: "DRAFT" | "PENDING_ASSIGNMENT";
            /** Format: date-time */
            submittedAt?: string | null;
            /** Format: uuid */
            createdByUserId?: string;
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CompanyRequestCreate: {
            /**
             * Format: uuid
             * @description Obligatorio solo para ADMIN/UNIVERSAL.
             */
            companyId?: string;
            /** Format: uuid */
            establishmentId: string;
            requestType: string;
            reason: string;
            observations?: string | null;
        };
        CompanyRequestPatch: {
            version: number;
            /** Format: uuid */
            establishmentId?: string;
            requestType?: string;
            reason?: string;
            observations?: string | null;
        };
        RequestContactCreate: {
            /** Format: uuid */
            contactId: string;
            /** @enum {string} */
            relationshipType: "LEGAL_REPRESENTATIVE" | "QUALITY_CONTACT" | "PRIMARY_CONTACT" | "OWNER" | "REPRESENTATIVE";
            isPrimary: boolean;
        };
        RequestContactLinkResult: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            contactId: string;
            /** @enum {string} */
            relationshipType: "LEGAL_REPRESENTATIVE" | "QUALITY_CONTACT" | "PRIMARY_CONTACT" | "OWNER" | "REPRESENTATIVE";
            isPrimary: boolean;
        };
        RequestContact: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            contactId: string;
            /** @enum {string} */
            relationshipType: "LEGAL_REPRESENTATIVE" | "QUALITY_CONTACT" | "PRIMARY_CONTACT" | "OWNER" | "REPRESENTATIVE";
            fullName: string;
            phone: string | null;
            /** Format: email */
            email: string | null;
            isPrimary: boolean;
            /** Format: date-time */
            removedAt: string | null;
            version: number;
            /** Format: date-time */
            createdAt: string;
        };
        RequestDocumentSummary: {
            total: number;
            pending: number;
            valid: number;
            rejected: number;
            archived: number;
        };
        CompanyRequestDetail: components["schemas"]["CompanyRequest"] & {
            contacts: components["schemas"]["RequestContact"][];
            documentSummary: components["schemas"]["RequestDocumentSummary"];
        };
        RequestDocument: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            requestId: string;
            /** @enum {string} */
            documentType: "AUTHORIZATION_LETTER" | "SUPPORTING_DOCUMENT";
            fileName: string;
            /** @enum {string} */
            mimeType: "application/pdf" | "image/jpeg" | "image/png";
            sizeBytes: number;
            /** @enum {string} */
            status: "PENDING" | "VALID" | "REJECTED" | "ARCHIVED";
            /** Format: date-time */
            uploadedAt: string;
            /** Format: date-time */
            validatedAt: string | null;
            /** Format: uuid */
            validatedByUserId: string | null;
            rejectionReason: string | null;
            /** Format: date-time */
            archivedAt: string | null;
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        DocumentDecision: {
            version: number;
            reason?: string;
        };
        CompanyRequestSubmitResult: {
            request: components["schemas"]["CompanyRequest"];
            /** Format: uuid */
            caseId: string;
        };
        DownloadUrl: {
            /** Format: uri */
            signedUrl: string;
            expiresInSeconds: number;
        };
        IntakeOrganization: {
            /** Format: uuid */
            companyId?: string;
            /**
             * Format: uuid
             * @description Requiere companyId y debe pertenecer a esa empresa.
             */
            establishmentId?: string;
        };
        ComplainantData: {
            fullName?: string;
            phone?: string;
            /** Format: email */
            email?: string;
            /** @enum {string} */
            preferredContactMethod: "PHONE" | "EMAIL" | "NONE";
        };
        IntakeCase: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            origin: "INSTITUTIONAL_PROGRAM" | "HEALTH_ALERT" | "COMPLAINT";
            /** @enum {string} */
            status: "PENDING_REVIEW" | "PENDING_ASSIGNMENT" | "ASSIGNED" | "NO_ACTION" | "REFERRED" | "CLOSED";
            /** @enum {string} */
            priority: "MEDIUM" | "HIGH";
            /** Format: uuid */
            companyId: string | null;
            /** Format: uuid */
            establishmentId: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            /** @description Resumen seguro según origin; complainantData solo aparece en detalle autorizado. */
            source: Record<string, never>;
        };
        InstitutionalProgramCreate: {
            /** Format: uuid */
            companyId?: string;
            /** Format: uuid */
            establishmentId?: string;
            programReference?: string | null;
            /** Format: date */
            plannedDate?: string | null;
            reason: string;
            observations?: string | null;
        };
        InstitutionalProgramPatch: {
            version: number;
            programReference?: string | null;
            /** Format: date */
            plannedDate?: string | null;
            reason?: string;
            observations?: string | null;
        };
        HealthAlertCreate: {
            /** Format: uuid */
            companyId?: string;
            /** Format: uuid */
            establishmentId?: string;
            alertNumber: string;
            /** Format: date */
            alertDate: string;
            productDescription: string;
            description: string;
        };
        HealthAlertPatch: {
            version: number;
            /** Format: uuid */
            companyId?: string | null;
            /** Format: uuid */
            establishmentId?: string | null;
            alertNumber?: string;
            /** Format: date */
            alertDate?: string;
            productDescription?: string;
            description?: string;
        };
        HealthAlertDecision: {
            version: number;
            /** @enum {string} */
            decision: "PROCEEDS" | "NOT_PROCEEDS";
            /** @description Obligatorio para NOT_PROCEEDS; opcional para PROCEEDS. */
            reason?: string;
        };
        ComplaintCreate: {
            /** Format: uuid */
            companyId?: string;
            /** Format: uuid */
            establishmentId?: string;
            complaintType: string;
            /** Format: date-time */
            receivedAt: string;
            description: string;
            complainantData?: components["schemas"]["ComplainantData"];
        };
        ComplaintPatch: {
            version: number;
            /** Format: uuid */
            companyId?: string | null;
            /** Format: uuid */
            establishmentId?: string | null;
            complaintType?: string;
            /** Format: date-time */
            receivedAt?: string;
            description?: string;
            complainantData?: components["schemas"]["ComplainantData"] | null;
        };
        ComplaintDecision: {
            version: number;
            /** @enum {string} */
            decision: "PROCEEDS" | "NOT_PROCEEDS" | "REFERRED";
            /** @description Obligatorio para NOT_PROCEEDS; opcional para PROCEEDS y prohibido para REFERRED. */
            decisionReason?: string;
            /** @description Obligatorio únicamente para REFERRED. */
            referralReason?: string;
            /** @description Obligatorio únicamente para REFERRED. */
            referralDestination?: string;
        };
        Assignment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            caseId: string;
            evaluator: {
                /** Format: uuid */
                id: string;
                fullName: string;
            };
            assignedBy: {
                /** Format: uuid */
                id: string;
                fullName: string;
            };
            /** Format: date-time */
            assignedAt: string;
            /** Format: date-time */
            unassignedAt?: string | null;
            isActive: boolean;
            reason?: string | null;
            version: number;
            case: {
                origin?: string;
                status?: string;
                priority?: string;
                /** Format: uuid */
                companyId?: string | null;
                /** Format: uuid */
                establishmentId?: string | null;
            };
        };
        Schedule: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            caseId: string;
            /** Format: uuid */
            assignmentId: string;
            evaluator: {
                /** Format: uuid */
                id: string;
                fullName: string;
            };
            /** Format: date-time */
            scheduledStartAt: string;
            /** Format: date-time */
            scheduledEndAt: string;
            /** @constant */
            timezone: "America/Santo_Domingo";
            /** @enum {string} */
            status: "SCHEDULED" | "RESCHEDULED" | "CANCELLED";
            notes?: string | null;
            cancellationReason?: string | null;
            /** Format: date-time */
            cancelledAt?: string | null;
            /** Format: uuid */
            rescheduledFromScheduleId?: string | null;
            version: number;
        };
        AssignmentCreate: {
            /** Format: uuid */
            evaluatorUserId: string;
            reason?: string;
        };
        Reassignment: {
            /** Format: uuid */
            newEvaluatorUserId: string;
            currentAssignmentVersion: number;
            reason: string;
        };
        ScheduleCreate: {
            /** Format: date-time */
            scheduledStartAt: string;
            /** Format: date-time */
            scheduledEndAt: string;
            notes?: string;
        };
        ScheduleReschedule: {
            version: number;
            /** Format: date-time */
            scheduledStartAt: string;
            /** Format: date-time */
            scheduledEndAt: string;
            reason: string;
            notes?: string;
        };
        ScheduleCancel: {
            version: number;
            reason: string;
        };
        Inspection: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            caseId: string;
            /** Format: uuid */
            assignmentId: string;
            /** Format: uuid */
            evaluatorUserId: string;
            /** @enum {string} */
            status: "DRAFT" | "IN_PROGRESS" | "PENDING_SUBMISSION" | "SUBMITTED";
            /** @description Versión optimista general. */
            version: number;
            /** @description Cambia solamente con entradas que afectan el cálculo o unlock. */
            contentRevision: number;
            /** Format: uuid */
            bpmTemplateVersionId: string;
            /** Format: uuid */
            riskRuleVersionId: string;
            /** Format: date-time */
            startedAt?: string | null;
            /** Format: date-time */
            finalizedAt?: string | null;
            /** Format: date-time */
            submittedAt?: string | null;
        };
        BpmGuidanceItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            criterionItemId: string;
            text: string;
            sortOrder: number;
            /** @enum {string|null} */
            criticality: "CRITICA" | "MAYOR" | "MENOR" | null;
            sourceReference: string | null;
            sourceRowNumber: number | null;
            version?: number;
        };
        BpmTemplateItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            parentItemId?: string | null;
            /** @enum {string} */
            itemKind: "SECTION" | "SUBSECTION" | "GROUP" | "CRITERION";
            displayCode?: string | null;
            title: string;
            sortOrder: number;
            isEvaluable: boolean;
            /** @enum {string|null} */
            defaultCriticality: "CRITICA" | "MAYOR" | "MENOR" | null;
            guidanceItems: components["schemas"]["BpmGuidanceItem"][];
        };
        InspectionWorkPackage: {
            inspection: components["schemas"]["Inspection"];
            bpmTemplate: {
                /** Format: uuid */
                versionId: string;
                items: components["schemas"]["BpmTemplateItem"][];
            };
            responses: Record<string, never>[];
            riskRule: Record<string, never>;
            factorSelections: Record<string, never>[];
            foodSnapshots: Record<string, never>[];
            evidence: Record<string, never>[];
            currentCalculation?: Record<string, never> | null;
            /** Format: date-time */
            generatedAt: string;
        };
        BpmResponseInput: {
            baseVersion: number;
            /**
             * @description C=1, CP=0.5, IT=0, NA excluido del denominador.
             * @enum {string}
             */
            responseValue: "C" | "CP" | "IT" | "NA";
            observations?: string | null;
        };
        RiskFactorSelectionInput: {
            baseVersion: number;
            /** Format: uuid */
            optionId: string;
        };
        FoodSnapshotInput: {
            baseVersion: number;
            /** Format: uuid */
            foodRiskSubcategoryId: string;
        };
        OfflineBatch: {
            operations: {
                /** Format: uuid */
                operationId: string;
                /** @enum {string} */
                operationType: "UPSERT_BPM_RESPONSE" | "DELETE_BPM_RESPONSE" | "UPSERT_RISK_FACTOR_SELECTION" | "ADD_FOOD_SNAPSHOT" | "ADD_EVIDENCE" | "SOFT_DELETE_EVIDENCE" | "FINALIZE";
                baseVersion: number;
                payload: Record<string, never>;
                /** @description SHA-256 hexadecimal del JSON canónico de payload. */
                payloadHash: string;
                /** Format: date-time */
                createdAt: string;
            }[];
        };
        Calculation: {
            /** Format: uuid */
            id?: string;
            calculationNumber?: number;
            /** @enum {string} */
            status?: "COMPLETED" | "SUPERSEDED";
            isCurrent?: boolean;
            contentRevision?: number;
            bpmPercentage?: number;
            productRiskScore?: number;
            establishmentRiskScore?: number;
            totalRiskScore?: number;
            /** @enum {string} */
            frequency?: "ANNUAL" | "SEMIANNUAL" | "QUARTERLY";
            snapshots?: Record<string, never>;
        };
        ErrorResponse: {
            error: {
                code: string;
                message: string;
            };
            meta: {
                /** Format: uuid */
                correlationId: string;
            };
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
type WithRequired<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
export type operations = Record<string, never>;
