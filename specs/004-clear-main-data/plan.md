# Plan: Borrado seguro del estado principal

## Alcance y archivos

| Archivo | Responsabilidad | RF |
|---|---|---|
| `README.md` | Documentar el botón, la advertencia exacta, la confirmación irreversible, sesiones borradas, objetivo conservado, backup intacto, errores, no reintento automático y verificación; revisar coherencia con `AGENTS.md` y `docs/constitution.md`. | RF-1–RF-6 |
| `repository.js` | Validar la petición estricta, serializarla, releer el principal, construir el documento vacío, escribir/releer/validar atómicamente, conservar backup y contadores, y aplicar idempotencia. | RF-2–RF-4, RF-6 |
| `server.js` | Exponer `clear-main-data` dentro de `/api/operations`, traducir validaciones y fallos a respuestas `{ok:false, code, message}` exactas y éxito con `deletedSessions`/`backupPending`. | RF-2, RF-4, RF-6 |
| `index.html` | Añadir acción destructiva y diálogo `alertdialog` con relaciones ARIA, texto exacto y región de resultados. | RF-1, RF-2, RF-5 |
| `styles.css` | Estilos del botón, diálogo, foco visible, estados bloqueados y presentación responsive sin ocultar la advertencia. | RF-1, RF-2, RF-5 |
| `app.js` | Abrir/cerrar diálogo, foco y Escape, generar `operationId`, enviar únicamente el contrato permitido, bloquear/desbloquear controles, tratar timeout/respuestas, recargar y renderizar estadísticas. | RF-1, RF-2, RF-4, RF-5, RF-6 |
| `tests/repository.test.js` | Tests primero del contrato raíz, borrado, conservación, errores, backup, contadores e idempotencia. | RF-2–RF-4, RF-6 |
| `tests/file-persistence.test.js` | Mantener regresiones de esquema, funciones puras y estadísticas derivadas; añadir cobertura de documento vacío si corresponde. | RF-3, RF-5, RF-6 |

No se añaden dependencias, endpoints nuevos ni formato persistido nuevo. `data/data.json`, `data/data.backup.json` y las claves históricas no se usan como fixtures destructivos reales; los tests usan directorios temporales.

## Decisiones y alternativas descartadas

- **Reutilizar la cola y escritura atómica del repositorio:** se descarta una ruta separada que pudiera saltarse la serialización o la relectura; la operación destructiva debe compartir consistencia con las demás.
- **Validar un contrato diferenciado y raíz exacta:** se descarta aceptar el payload general de operaciones con `payload`, porque la spec exige exactamente `{type, operationId, confirmation}` y rechaza campos adicionales.
- **No incrementar `successfulWrites` ni intentar backup:** se descarta tratar el borrado como una escritura ordinaria de sesiones; así el backup permanece byte a byte intacto y el borrado no crea una nueva condición de backup pendiente.
- **Conservar raíz, `metadata` y objetivo mediante copia estructural, reemplazando solo `sesiones`:** se descarta reconstruir un documento mínimo o reutilizar sesiones filtradas, porque se perderían campos desconocidos permitidos o datos de sesiones eliminadas.
- **No restaurar desde backup ante ningún error:** se descarta usar el backup como fallback, porque no es fuente de verdad y debe permanecer intacto.
- **Recargar después del éxito y ante respuesta incierta:** se descarta actualizar solo el DOM con la respuesta, porque la vista debe reflejar el documento real y nunca afirmar éxito tras timeout, desconexión o recarga inválida.
- **Diálogo nativo sustituido por `alertdialog` propio:** se descarta `window.confirm`, porque no permite cumplir el texto exacto, relaciones ARIA, foco inicial, Escape, bloqueo y región de resultados.
- **Funciones puras con `hoy` explícito:** las estadísticas y cualquier derivación posterior reciben `hoy`; se descarta leer el reloj dentro de la lógica testeable o usar conversiones UTC.

## Funciones puras y contratos

- `isValidClearRequest(operation)`: acepta únicamente las tres propiedades enumerables propias permitidas, con `type` exacto, `operationId` no vacío y confirmación `BORRAR TODO`; el orden de propiedades no importa.
- `operationFingerprint(operation)`: compara solo la representación de las propiedades permitidas del contrato, ignorando prototipos y propiedades no enumerables.
- `buildClearedDocument(document)`: devuelve una copia sin mutar el original, conserva raíz/`metadata`/objetivo y establece exactamente `sesiones: []`; devuelve también `deletedSessions`.
- `deriveBackupPending(document)`: calcula exclusivamente `successfulWrites - backupSuccessfulWrites >= 5`; no persiste `backupPending`.
- Las funciones existentes de racha, semana, mes, mapa y objetivo siguen recibiendo `hoy` como parámetro y, tras una recarga válida con sesiones vacías, producen cero actividad y progreso cero con el objetivo conservado.

## Flujo de persistencia y API

1. El servidor valida la raíz exacta antes de encolar; una petición inválida devuelve exactamente `INVALID_CLEAR_REQUEST` sin mutación.
2. La cola relee el último principal justo antes de aplicar la operación. Ausencia devuelve `MAIN_DATA_MISSING`; vacío, JSON inválido, esquema inválido o contadores incoherentes devuelven `DATA_CORRUPT`.
3. Se cuenta `sesiones.length`, se copia el documento válido, se reemplazan las sesiones por un array vacío y se escribe atómicamente. No se lee ni modifica el backup.
4. Tras escribir se relee y valida. Un fallo previo o posterior devuelve exactamente `CLEAR_WRITE_FAILED`; no se hace rollback automático después de una sustitución.
5. El éxito devuelve `ok: true`, `deletedSessions` entero no negativo y `backupPending` booleano. Los errores devuelven exactamente `{ok:false, code, message}` del inventario de la spec; el cliente convierte respuestas malformadas a `UNEXPECTED_RESPONSE`.
6. El mismo `operationId` y payload devuelve el resultado memorizado durante el proceso; otro payload devuelve exactamente `IDEMPOTENCY_CONFLICT`. Tras reinicio no se reintenta nada automáticamente.

## Estrategia de tests (`node --test`)

Los tests de repositorio se escriben primero, en temporales y con bytes capturados antes de la operación. Cubrirán: contrato raíz exacto y orden de propiedades; campos extra y valores inválidos; operación `clear-main-data`; sesiones vacías; objetivo, `version`, `metadata` y campos desconocidos de raíz/metadata conservados literalmente; campos de sesiones eliminados; `deletedSessions`; backup byte a byte intacto, incluso válido, antiguo, corrupto o ausente; ausencia de incremento/creación de contadores y backup; principal ausente o corrupto; objetivo ausente; escritura fallida; sustitución seguida de relectura/validación fallida; cola; cero sesiones; idempotencia equivalente y conflicto.

Se conservarán las regresiones existentes de esquema, migración, fechas locales y estadísticas. La suite comprobará que el estado vacío recalcula racha actual, mejor racha, minutos semanales, días del mes, mapa y progreso a cero sin guardar contadores derivados. Cada tarea termina con `node --test` verde y con `MEMORY.md` actualizado por el implementador.

## Verificación manual

Con `node server.js`, Chrome DevTools comprobará desktop y viewport móvil de 375 px: botón y nombres accesibles, `alertdialog`, `aria-modal`, `aria-labelledby`, `aria-describedby`, foco inicial y retorno, Escape/cancelación sin cambios, bloqueo durante la petición, estado «Borrado en curso…», timeout/desconexión sin reintento, mensajes exactos, consola limpia, ausencia de overflow, recarga posterior y estadísticas/lista vacías con objetivo conservado. Se verificará que el backup y los datos reales no se alteran accidentalmente.

## Trazabilidad

| RF | Evidencia principal |
|---|---|
| RF-1 | Acción, foco, nombres accesibles, responsive y tests de interacción |
| RF-2 | Diálogo exacto, contrato raíz, confirmación única, Escape y cancelación |
| RF-3 | Construcción del documento vacío, conservación literal y errores de corrupción |
| RF-4 | Cola, relectura, atomicidad, idempotencia, timeout y respuestas exactas |
| RF-5 | Recarga, anuncio `aria-live`, bloqueo y estadísticas derivadas a cero |
| RF-6 | Backup byte a byte, contadores sin cambios, migración intacta y `backupPending` derivado |
