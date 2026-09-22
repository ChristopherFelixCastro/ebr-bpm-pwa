# Demostración del avance MVP

## Preparación

Desde la raíz del repositorio:

```bash
npm ci
npm run validate
npm run demo
```

Abra la URL indicada por Vite y seleccione **Guía del avance**. Es un mapa opcional de navegación, no un orden obligatorio para hablar con el profesor.

## Recorrido recomendado (5–7 minutos)

1. **Panel analítico:** explique que los contadores y la distribución se calculan desde el servicio de demostración.
2. **Resultado EBR-2026-0017:** muestre 81.25 % BPM, riesgo total medio y frecuencia semestral. Expanda **Cómo se calculó** para enseñar reglas y versiones.
3. **Revisión:** elija **Solicitar corrección**, escriba un comentario y marque un hallazgo. Destaque que solo los ítems seleccionados quedarían habilitados para el técnico.
4. **Informes:** muestre el informe oficial del expediente cerrado. La descarga está deshabilitada hasta integrar Storage privado y una URL temporal autorizada.
5. **Histórico:** abra el expediente cerrado y señale la revisión, el resultado congelado y la fecha de cierre.

## Qué decir con claridad

- Funciona hoy: motor de riesgo versionado, resultado explicable, portal responsive, revisión selectiva, generación PDF del lado servidor y flujo simulado de emisión/cierre.
- Usa datos semilla: no afirmar que las acciones están persistidas en PostgreSQL.
- El Core y su contrato OpenAPI ya tienen una base fusionada en `main`, pero los clientes todavía no la consumen en un entorno integrado.
- Pendiente del equipo: levantar PostgreSQL/Supabase compartido, conectar JWT/RBAC en los clientes, integrar coordinación/campo/analítica y validar la sincronización offline.
- Próximo hito: integrar una sola vertical real —inspección sincronizada → cálculo → revisión → informe → cierre— antes de ampliar extras.

## Recuperación rápida

Las mutaciones del modo demostración viven en memoria. Si se aprueba o devuelve EBR-2026-0017 durante un ensayo, recargue la página para restaurar los datos iniciales.
