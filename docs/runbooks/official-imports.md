# Importaciones oficiales y bootstrap

Los importadores son comandos administrativos. No existe un endpoint de carga. Los archivos fuente se leen sin modificarlos y sus binarios no se guardan en PostgreSQL.

## Preparación

1. Copie el manifiesto de ejemplo correspondiente fuera de Git y ajuste solo rutas y metadatos no sensibles.
2. Ejecute primero `dry-run`; revise el JSON completo y corrija la fuente o el manifiesto. No añada equivalencias inventadas.
3. Ejecute `apply` con un actor identificable. Si se usa `--actor-user-id`, debe ser un usuario `ADMIN` o `UNIVERSAL` aprobado. Para automatización controlada puede usarse `--actor-label`.

```bash
npm run import:official:bpm -- --manifest ./private/bpm-manifest.json --dry-run
npm run import:official:bpm -- --manifest ./private/bpm-manifest.json --apply --actor-user-id <uuid>
npm run import:official:risk -- --manifest ./private/risk-manifest.json --dry-run
npm run import:official:risk -- --manifest ./private/risk-manifest.json --apply --actor-label deployment-job
```

`--file` es alias de `--manifest`. Cada salida incluye hashes, hojas, conteos, advertencias, errores, transformaciones e identificadores creados. Las versiones nuevas permanecen `DRAFT`; se publican y se seleccionan como predeterminadas con los endpoints administrativos existentes.

El paquete BPM conserva códigos fuente repetidos y genera `display_code` determinista. Los registros `C` son secciones, `S/SS` subsecciones, `A` grupos no evaluables e `I` criterios evaluables. Las líneas atómicas delimitadas por cada encabezado semántico de la hoja `Guía de Llenado` se almacenan en `bpm_criterion_guidance_items` como instrucciones auxiliares del criterio asociado; no crean preguntas adicionales. La criticidad auxiliar se lee únicamente en las columnas situadas antes del texto de la instrucción, incluyendo el rango vertical de celdas combinadas, y es sensible a mayúsculas: `C=CRITICA`, `M=MAYOR`, `m=MENOR`. Su ausencia es válida. `C:`, `CP`, `IT` y `NA` de las columnas de respuesta nunca se interpretan como criticidad.

`allItemsOverrides` identifica cada corrección por `itemOrder` y exige coincidencia exacta del código y descripción originales antes de aplicar el código canónico. El importador rechaza bloques sin asociación, asociaciones ambiguas y criticidades contradictorias dentro de una misma instrucción.

El paquete de riesgo lee la matriz únicamente hasta el primer encabezado `Puntaje`; ignora toda columna posterior. `standaloneCategoryLeaves` permite declarar una fila autónoma verificando categoría, subcategoría originalmente vacía, riesgo y puntaje. `additionalFactorOptions` incorpora opciones declaradas sin modificar el Excel y valida duplicados, puntajes y rangos porcentuales. Se importan exactamente seis factores, la escala `LOW=1`, `MEDIUM=2`, `HIGH=3`, `NA=NULL` y tres rangos de frecuencia explícitos.

El reporte separa `issueCounts` de los conteos de registros. Cada conjunto de `breakdown` cumple `accepted + rejected + skipped = read`; `rejected` y `warned` cuentan registros fuente distintos, no objetos de error. Las filas formateadas pero vacías no se cuentan como leídas ni omitidas. Para BPM, `breakdown` separa `allItems` y `bpmGuidance`; `summary` informa secciones, subsecciones, grupos, criterios, instrucciones totales, con criticidad y sin criticidad.

La migración `0030` registra SHA-256 por archivo, hash del paquete bruto y hash funcional después de normalizar datos. `apply` usa transacción y `pg_advisory_xact_lock`; una repetición exitosa termina como `SKIPPED` sin crear versiones. El mismo paquete con tipo o manifiesto incompatible se rechaza. Un error crítico revierte los datos funcionales. Las advertencias permanecen en el reporte.

### Recuperación

- `REJECTED`: corrija la fuente/manifiesto y repita `dry-run`.
- Error durante `apply`: no publique ni edite manualmente; confirme que no existe una versión nueva y repita el mismo paquete.
- `DRAFT_ALREADY_EXISTS`: publique, retire o elimine mediante el flujo administrativo autorizado el borrador preexistente; el importador nunca lo sobrescribe.
- Hash incompatible: no cambie tipo o manifiesto para los mismos archivos. Prepare un paquete corregido y trazable.

Para las fuentes institucionales revisadas, el manifiesto declara la fila 102 como categoría y hoja `Alimentos preparados`, después de verificar `BAJO=1`, y declara la cuarta opción BPM `96%–100%=1`. Las tres opciones BPM presentes en el Excel deben seguir coincidiendo exactamente con `≤81%=3`, `82%–89%=2.33` y `90%–95%=1.67`; cualquier cambio, duplicado, hueco o solapamiento vuelve a bloquear el `dry-run`.

### Modelo de guía y publicación

La `Guía de Llenado` institucional revisada contiene 162 instrucciones: 70 con criticidad explícita y 92 sin criticidad. Todas son válidas y se conservan bajo su criterio `AllItems I`; `default_criticality` del criterio puede ser `NULL` porque no representa una criticidad agregada. La migración `0031` admite subsecciones y grupos anidados, `GROUP → CRITERION`, instrucciones auxiliares con criticidad nullable, clonación profunda e inmutabilidad después de publicar.

## Primer usuario UNIVERSAL

El comando no admite contraseña por argumento. Use una variable no versionada y elimínela del entorno al terminar.

```powershell
$env:BOOTSTRAP_UNIVERSAL_PASSWORD = '<contraseña-segura-de-12-o-más-caracteres>'
npm run bootstrap:universal -- --name '<nombre>' --email '<correo>'
Remove-Item Env:BOOTSTRAP_UNIVERSAL_PASSWORD
```

También se aceptan `BOOTSTRAP_UNIVERSAL_NAME`, `BOOTSTRAP_UNIVERSAL_EMAIL` y `--password-env <NOMBRE_VARIABLE>`. El comando usa Argon2id, normaliza el correo, crea/reutiliza el rol canónico, aprueba el primer usuario y registra `BOOTSTRAP_UNIVERSAL_CREATED`. Una repetición con el mismo correo devuelve `created: false`; nunca sobrescribe datos ni imprime contraseña/hash. Si ya existe otro `UNIVERSAL` aprobado, se detiene.
