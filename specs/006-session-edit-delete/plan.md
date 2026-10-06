# Plan: editar y borrar una sesión individual

## Alcance y archivos

| Archivo | Responsabilidad | RF |
|---|---|---|
| `README.md` | Actualizar y revisar únicamente al final, después de implementar, probar y verificar. | RF-10 |
| `app.js` | Mantener validación de formulario y funciones puras; enviar los contratos de edición/borrado, gestionar modales, integridad de respuestas, foco, paginación y reconstrucción desde el documento confirmado. | RF-2–RF-4, RF-7–RF-9 |
| `index.html` | Añadir acciones por sesión y el modal `#dialogo-edicion`; reutilizar `#dialogo-borrado` para el borrado individual, con los destinos ARIA exactos. | RF-4, RF-9 |
| `styles.css` | Presentar acciones, modal de edición y estados bloqueados sin overflow, manteniendo foco visible y objetivos táctiles. | RF-9 |
| `repository.js` | Ser autoridad exclusiva de clasificación, normalización, IDs, cola, operaciones, persistencia atómica, idempotencia y backup. | RF-1, RF-2, RF-5–RF-6 |
| `server.js` | Validar JSON y contratos exactos antes de encolar, mapear códigos HTTP/mensajes y devolver `{ok, document, backupPending}`. | RF-2 |
| `tests/*.test.js` | Tests primeros de pureza, normalización, repositorio, API, cola, backup, derivados y contratos de UI automatizables. | RF-1–RF-10 |

README.md y la documentación pública deben leerse obligatoriamente al inicio para conocer reglas y contexto, pero su actualización queda reservada a T10, tras implementar, probar y verificar la funcionalidad real. MEMORY.md es la excepción acordada para documentación operativa y se actualiza tras cada tarea conforme a AGENTS.md. T1 registra su comprensión únicamente en el resultado de la tarea y MEMORY.md, sin tocar README ni otros documentos públicos. No se modifican `spec.md`, README antes de T10, los datos JSON ni se usa el backup como fuente. El alta existente conserva su contrato, pero debe consumir `metadata.nextSessionId` ya normalizado en la cola.

## Responsabilidades y contratos

### Normalización y `id`/`nextSessionId`

El repositorio leerá exclusivamente `data/data.json`. Distinguirá `NORMALIZABLE` de `DATA_CORRUPT`: los campos obligatorios válidos permiten reparar IDs ausentes, inválidos o duplicados; cualquier fallo obligatorio invalida el documento. Recorrerá las sesiones en su orden actual, conservará IDs positivos seguros únicos y asignará a los demás el menor ID libre. `nextSessionId` será el menor entero seguro positivo mayor que el máximo usado (o `1`). También eliminará `creado` inválido, sin inventarlo, y conservará todos los campos desconocidos y la estructura de migración.

La normalización se ejecutará al arranque o en la primera operación, dentro de la misma cola, con una única escritura atómica, relectura y validación. No incrementará `successfulWrites`, no activará backup y dejará el backup intacto. Si falla la asignación, escritura, sustitución, relectura o validación, responderá según el contrato sin rollback automático.

### Operaciones y API

Se aceptarán únicamente:

```text
{ type: "edit-session", operationId, payload: { id, session: { fecha, tema, minutos } } }
{ type: "delete-session", operationId, payload: { id } }
```

La validación sintáctica exacta ocurre antes de la cola. Los datos inválidos producen `INVALID_SESSION_DATA`; IDs inválidos o campos extra producen `INVALID_SESSION_OPERATION`; un ID válido inexistente produce `SESSION_NOT_FOUND`. El servidor nunca produce `SESSION_INTEGRITY_ERROR`. Toda respuesta exitosa será HTTP 200 con documento y `backupPending`; los errores usarán los códigos y mensajes exactos de la spec.

Editar sustituirá solo fecha, tema y minutos, con tema recortado; borrar quitará únicamente el ID indicado. La cola releerá el principal antes de cada operación. El mismo `operationId` y representación lógica devuelve exactamente la respuesta memorizada; otro payload devuelve `IDEMPOTENCY_CONFLICT`. Una petición incierta no se reintenta automáticamente.

### Persistencia y backup: opción A

Se adopta la **opción A: principal confirmado, copia del principal y ajuste secundario de metadata**. Cada edición/borrado construye un único documento, incrementa una vez `successfulWrites`, escribe/relee/valida atómicamente el principal y solo después, si al inicio se alcanzó el umbral de cinco, el backup falta o es corrupto, intenta escribir y validar el backup desde el principal confirmado. Finalmente ajusta `backupSuccessfulWrites` en una segunda escritura lógica, sin contarla como operación de datos. Un fallo secundario conserva el éxito principal, devuelve `backupPending: true` y se reintenta en la siguiente operación. Nunca se restaura ni se altera el backup durante la normalización.

Alternativa descartada: hacer el backup antes del principal o restaurar desde él; podría ocultar corrupción, publicar un estado no confirmado o perder el principal válido.

### UI, modales y reutilización

Cada fila conservará su `id` y tendrá botones `Editar sesión` y `Borrar sesión`. Se reutilizará el modal existente `#dialogo-borrado` cambiando de forma segura fecha/tema/minutos y su operación; no se duplicará un segundo diálogo de borrado masivo. Se añadirá `#dialogo-edicion` con foco inicial en fecha, campos fecha→tema→minutos y botones exactos. Ambos tendrán roles, etiquetas, descripción, `aria-modal`, focus trap, Escape, bloqueo durante fetch y retorno al botón origen. El texto de fecha se construirá con componentes locales y meses fijos en español; tema y fecha se insertarán con `textContent`/valor, nunca HTML.

El cliente solo valida los tres campos del formulario y, tras 200, aplica el guard mínimo (`document` objeto, `sesiones` array, `metadata` objeto). Si falla o no encuentra el ID, ejecuta la única ruta `SESSION_INTEGRITY_ERROR`, conserva la vista, cierra/desbloquea, devuelve foco, anuncia y hace `GET /api/data`; un fallo de recarga conserva la vista y anuncia su error.

### Orden, paginación e integridad de sesión

La vista ordenará por fecha descendente, `creado` válido descendente, `id` descendente e índice estable final. Este desempate por `id` sustituye únicamente el desempate final de la spec 005. La paginación seguirá siendo 1-based, salvo lista vacía en página 0; editar o borrar conservará la página si existe y la ajustará a la última cuando proceda.

### Derivados actualizados

Todo éxito reconstruirá lista, racha, mejor racha, minutos semanales, días del mes, mapa y objetivo desde el documento devuelto y con `hoy` explícito en funciones puras.

## Decisiones y alternativas descartadas

- Servidor/repositorio como autoridad de normalización: se descarta reparar documentos completos en el cliente para evitar divergencia y pérdida de datos (RF-1).
- Identificación solo por `id`: se descarta fecha/tema/posición/huella porque no son únicos (RF-1, RF-3).
- Cola en memoria con fingerprint lógico: se descarta persistir un registro de operaciones, pues la spec solo garantiza idempotencia durante el proceso (RF-5).
- Opción A de backup descrita arriba: se descarta backup previo al principal o restauración automática (RF-6).
- Un modal de edición y reutilización del borrado: se descarta duplicar diálogos y contratos visuales, manteniendo accesibilidad coherente (RF-9).
- Cálculos puros con `hoy`: se descarta leer reloj/DOM durante los cálculos para conservar determinismo (RF-8).

## Funciones puras previstas

`normalizeSessionForDocument`, clasificación/normalización del documento, asignación de IDs, fingerprint lógico, validadores de operación y sesión, `buildSessionPaginationView`, orden de sesiones, formateo local de fecha y derivados existentes recibirán datos explícitos; las funciones de calendario y estadísticas recibirán `hoy`. Ninguna accederá a DOM, red, almacenamiento ni reloj implícito.

## Estrategia de tests

Puerta obligatoria: los tests se escriben primero y se ejecuta `node --test` después de cada tarea, conservando toda la suite existente. Si `node --test` falla tras cualquier tarea, se detiene el flujo y se informa; no se avanza con tests en rojo. Se cubrirán precedencia NORMALIZABLE/DATA_CORRUPT, IDs, `nextSessionId`, desconocidos, `creado`, migración intacta, principal/backup, contratos exactos, edición/borrado, not found, cola/concurrencia, idempotencia, escritura atómica, umbral y fallos secundarios de backup. También se probarán orden/paginación, página vacía, integridad cliente y todos los derivados con `hoy` fijo.

Chrome DevTools verificará `node server.js` en `1440x900` y `375x812` (móvil/tacto): alta existente, edición, borrado y cancelación, foco/focus trap/Escape/ARIA, bloqueo, errores e incertidumbre sin reintento, página ajustada, botones táctiles, sin overflow ni errores de consola y sin alterar datos reales.

## Matriz RF

| RF | Evidencia prevista |
|---|---|
| RF-1 | Tests de clasificación, normalización, IDs, metadata y campos desconocidos; revisión de autoridad servidor. |
| RF-2 | Tests HTTP de forma exacta, códigos, mensajes y guard cliente. |
| RF-3 | Tests de edición por ID, validación y conservación estructural; flujo UI. |
| RF-4 | Tests y DevTools de confirmación, cancelación, Escape y borrado único. |
| RF-5 | Tests de cola, orden, idempotencia, concurrencia y respuesta incierta. |
| RF-6 | Tests de contador, escritura atómica, opción A, backup pendiente y reintento. |
| RF-7 | Tests de orden, paginación, integridad por ID y página ajustada. |
| RF-8 | Tests de racha, mejor racha, semana, mes, mapa y progreso con fecha local y exclusión de futuras. |
| RF-9 | Tests de estructura y DevTools de modales, foco, ARIA, teclado y responsive. |
| RF-10 | README y documentación actualizados y revisados únicamente al final, después de implementación y verificaciones, con acciones, IDs, modales, backup, errores, no reintento, foco/ARIA, paginación, orden por `id`, responsive y desplazamiento de 005. |

Tras cada tarea se ejecutará además `node --test`, `node --check app.js` y `node --check server.js` cuando los archivos existan y sean aplicables, y se actualizará `MEMORY.md`. Cada tarea que modifique o integre funcionalidad se verificará en Chrome DevTools; la última tarea hará la revisión final de matriz RF, README y contratos.
