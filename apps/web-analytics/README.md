# Portal analítico EBR/BPM

El portal usa la sesión, los cálculos vigentes, las revisiones, los informes y los cierres del Core. No calcula riesgos ni genera PDF en el navegador.

## Ejecutar

Con el API Core en `http://localhost:3000`:

```bash
npm run analytics:dev
```

Vite usa exclusivamente el puerto `5177` y dirige `/v1` y `/health` al Core. Si el puerto está ocupado, no inicia en otro. El API debe permitir `http://localhost:5177` en `CORS_ORIGINS` cuando se acceda directamente; con el proxy, el navegador usa el mismo origen del portal.

## Contratos

- `POST /v1/auth/login`, `/refresh`, `/logout`, `/reauthenticate` y `GET /v1/auth/me`: sesión Core con refresh cookie HttpOnly. El access token solo vive en memoria.
- `GET /v1/analytics/summary`, `/evaluations` paginado y `/evaluations/{inspectionId}`: proyecciones de solo lectura.
- `GET /v1/inspections/{id}/work-package`, `/calculations/{calculationId}`, `/reviews/current`, `/reports`, `/closure`: detalle autoritativo.
- Los cambios de revisión, informe y cierre usan los endpoints existentes de `inspection-reviews` y mantienen su validación, auditoría y Storage.

`ADMIN` solo consulta desde este portal. `COORDINATOR` y `UNIVERSAL` pueden operar; el Core puede requerir reautenticación reciente de `UNIVERSAL`.

## Verificación focalizada

```bash
npm run typecheck -w @ebr-bpm/web-analytics
npm run test -w @ebr-bpm/web-analytics
npm run build -w @ebr-bpm/web-analytics
```
