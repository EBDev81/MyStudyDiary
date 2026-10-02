# Plan: Persistencia local mediante backend Node.js

## Alcance y archivos

| Archivo | Responsabilidad prevista | RF |
|---|---|---|
| `docs/constitution.md` | Actualizar los principios 1 y 5 antes de activar el servidor oficial: Node/localhost y JSON con migración única. | RF-1, RF-4, RF-6 |
| `AGENTS.md` | Documentar la nueva ejecución, estructura, datos, verificación y la retirada de `file://`/`localStorage` como persistencia oficial. | RF-1, RF-4, RF-6 |
| `README.md` | Explicar `node server.js`, API conceptual, migración, archivos de datos y un historial breve del cambio y su motivo. | RF-1, RF-2, RF-4 |
| `server.js` | Servir estáticos, exponer únicamente la API necesaria y coordinar lectura, validación, cola, escritura, relectura y backups. | RF-1, RF-2, RF-2 bis, RF-7, RF-8 |
| `data/data.json` | Fuente de verdad JSON principal, creada solo si no existe; nunca se sobrescribe automáticamente si está vacío o inválida. | RF-2, RF-3, RF-6 |
| `data/data.backup.json` | Última copia válida solicitada por el contador; no es fuente alternativa ni se restaura automáticamente. | RF-7, RF-8 |
| `migration.html` | Puente temporal abierto desde el contexto que conserva el `localStorage`; pedir confirmación, empaquetar fuentes y mostrar resultado. | RF-4, RF-5, RF-6 |
| `index.html` | Consumir la API, mostrar errores de conexión/persistencia y conservar los controles y textos accesibles existentes. | RF-1, RF-2, RF-3, RF-6 |
| `app.js` | Sustituir la persistencia de sesiones/objetivo por llamadas a API, generar `operationId`, recalcular estadísticas derivadas y no consultar `localStorage` tras migración completada. | RF-1–RF-6 |
| `tests/file-persistence.test.js` | Probar contratos, funciones puras, servidor/repositorio, migración, cola, idempotencia, protección de datos y backups con `node --test`. | RF-1–RF-8 |
| `tests/weekly-goal.test.js`, `tests/heat-map.test.js` | Mantener y adaptar los tests existentes a la nueva separación de persistencia, sin perder la cobertura de fechas y estadísticas. | RF-2, RF-3, RF-5 |

No se añaden frameworks, paquetes, cuentas, autenticación ni base de datos. El uso oficial es `node server.js` y `http://localhost:3000`; `file://` no ofrece persistencia.

## Contratos conceptuales

### JSON principal y backup

La raíz debe ser un objeto con cuatro campos obligatorios de tipos exactos: `version: 1`, `sesiones: []`, `objetivoSemanal: null | entero 1..5040` y `metadata`. El conjunto no es cerrado: los campos desconocidos se conservan literalmente, se ignoran y no afectan validación ni cálculos, igual que los desconocidos dentro de sesiones y metadata. `metadata` contiene `migration.status` (`pending`, `failed` o `completed`), `sources` y `ignoredSources` como objetos `{source, reason, count}`, `completedAt` local o `null`, `successfulWrites` y `backupSuccessfulWrites`. `completedAt` solo es `AAAA-MM-DD` en `completed`; el segundo contador empieza en cero.

Una sesión válida es `{ fecha: "AAAA-MM-DD", tema: string, minutos: entero positivo seguro, creado: entero positivo opcional }`. `ignoredSources` solo registra las tres claves históricas permitidas; las ausentes se omiten y las inválidas se registran con motivo y conteo. La validación rechaza tipos obligatorios incoherentes, sesiones inválidas y JSON vacío, parcial o corrupto sin mutar ningún archivo. El backup exige el mismo contrato conceptual y solo representa el último estado principal válido.

### API del servidor

La API conceptual es deliberadamente pequeña:

- `GET /api/data`: devuelve el JSON principal validado y el estado necesario para renderizar.
- `POST /api/operations`: recibe una operación con `operationId` string, tipo (`session`, `goal`, `resetGoal` o `migration`) y payload validado; devuelve el estado persistido, el resultado de la operación y si queda backup pendiente.
- Los errores de conexión, lectura/corrupción y escritura se expresan en español; corrupción usa exactamente «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.» y escritura fallida exactamente «No se han podido guardar los datos. Inténtalo de nuevo.».

El servidor solo persiste fechas locales ya formadas por el cliente, valida calendario real y no usa UTC. No recibe ni intenta leer el `localStorage` del navegador.

## Funciones puras y contratos internos

Todas las funciones de calendario reciben `today` explícito y no acceden al DOM, reloj, almacenamiento ni red:

- `isValidLocalDateText(value)`, `formatLocalDate(date)` y `parseLocalDate(text)` validan/construyen fechas locales sin `toISOString()` ni `new Date("AAAA-MM-DD")`.
- `isValidSessionMinutes(value)`, `validateWeeklyGoal(value)` y `validateDataDocument(document)` aplican tipos, rangos y esquema.
- `normalizeSession(record)` acepta tanto `fecha/tema/minutos` como `date/topic/minutes`, conserva `creado` solo si es válido y devuelve una sesión normalizada o rechazo.
- `mergeMigrationSources(sources, existingDocument)` normaliza, deduplica solo por `fecha|tema|minutos`, conserva registros válidos existentes y resuelve la precedencia/conflicto del objetivo sin mutar entradas.
- `getWeekStart(today)`, `calculateWeeklyProgress(sessions, today)` y las funciones existentes de racha, mapa, semana y mes calculan únicamente estadísticas derivadas.
- `shouldBackup(document)` decide si `successfulWrites - backupSuccessfulWrites >= 5`.
- `operationFingerprint(operation)` permite rechazar el mismo `operationId` con payload diferente.

## Flujo de lectura, escritura, cola e idempotencia

Pseudocódigo conceptual:

```text
al iniciar:
  si data/data.json no existe: crear documento inicial válido
  si existe: leer y validar; si falla, bloquear operaciones y no mutar

GET:
  leer y validar principal; devolverlo o mensaje exacto de corrupción

POST operación:
  comprobar operationId y fingerprint en memoria
  si operationId conocido con mismo payload: devolver el mismo resultado
  si conocido con payload distinto: rechazar
  encolar una tarea
  al ejecutarla, releer y validar el principal inmediatamente antes de aplicar
  aplicar sobre ese documento recién leído
  incrementar successfulWrites solo para una escritura de sesión/objetivo confirmable
   construir desde el último válido, incrementar successfulWrites
   sustituir atómicamente, releer y validar el documento completo
  si falla: conservar último estado válido, registrar fallo y no confirmar guardado
  memorizar resultado mientras viva el proceso
   si successfulWrites - backupSuccessfulWrites >= 5:
     escribir backup completo de forma atómica, releer y validar
     si éxito: igualar backupSuccessfulWrites a successfulWrites
     si falla: conservar principal y contador, marcar aviso pendiente
  ejecutar la siguiente tarea sobre el JSON recién persistido
```

La cola serializa solicitudes, pero no deduplica sesiones con igual fecha/hora. Un timeout no se reintenta automáticamente: la interfaz pide recargar o reintentar explícitamente. Tras reinicio se recarga el JSON y no se garantiza idempotencia para resultados desconocidos anteriores.

## Migración única y puente de `localStorage`

`migration.html` lee solo desde el origen que contiene las claves, presenta el inventario y pide confirmación. Envía al servidor las tres fuentes permitidas y la fecha local `completedAt`. El servidor combina ambas claves de sesiones, acepta formatos actuales e históricos, deduplica únicamente campos normalizados iguales, registra inválidos en `ignoredSources`, prioriza el objetivo de `diario-de-estudio-objetivo-semanal` y exige decisión explícita ante dos objetivos históricos distintos. El fallo parcial marca `failed`; cancelar no envía ni modifica nada. Solo éxito marca `completed`; las claves originales se conservan intactas.

Cuando el documento marca `completed`, la aplicación normal no vuelve a consultar ni escribir `localStorage`. En `pending`/`failed`, el puente puede reintentarse y siempre deduplica contra el JSON actual. La migración no incrementa contadores ni dispara backup.

## Backups y protección de datos

Cada escritura principal válida de sesión u objetivo incrementa `successfulWrites`. Al alcanzar cinco escrituras desde el último backup exitoso se intenta copiar el documento completo, incluyendo el contador actualizado; un backup no incrementa contadores. Si falla, el principal no se deshace, `backupSuccessfulWrites` no avanza y cada escritura posterior reintenta. Nunca se restaura automáticamente ni se sobrescribe un principal/backup inválido. Toda mutación exige conservar el estado anterior hasta validar la escritura completa; no se borran claves históricas ni sesiones.

## Decisiones y alternativas descartadas

- JSON local y Node nativo: se descartan base de datos, Express y sincronización remota para conservar el proyecto educativo, legible y sin dependencias (RF-1, RF-2).
- Sustitución atómica mediante temporal y reemplazo: se descarta escribir directamente sobre el archivo, porque una interrupción podría dejar principal o backup parcialmente visibles (RF-2, RF-7).
- `data/data.json` como única fuente: se descarta usar el backup para reparar automáticamente o guardar estadísticas derivadas, porque podría ocultar corrupción o quedar obsoleto (RF-3, RF-7).
- Cola en memoria con relectura antes de cada operación: se descarta confiar en el documento cargado al iniciar, porque dos navegadores pueden escribir entre lecturas (RF-2 bis).
- `operationId` en memoria: se descarta prometer idempotencia tras reinicio, tal como exige la spec y para no convertir el JSON en registro de operaciones (RF-2 bis).
- Puente explícito de migración: se descarta que el servidor lea `localStorage`, por aislamiento de orígenes y protección de datos (RF-4).
- Backup cada quinta escritura confirmada: se descarta hacerlo por tiempo o por múltiplos absolutos, porque solo cuentan escrituras realmente persistidas desde el último backup (RF-7, RF-8).
- Validación antes y después de escribir: se descarta corregir o truncar archivos dañados automáticamente, porque la recuperación debe ser manual (RF-2, RF-6).

## Estrategia de pruebas

Se ejecutará `node --test` sin instalar nada. Primero se probarán funciones puras con `today` fijo: fechas locales, cambios de día/semana/mes/año, fechas futuras, minutos seguros, normalización, deduplicación, estadísticas y esquema. Después se probarán servidor y persistencia con directorios temporales y archivos simulados: ausencia inicial, vacío/corrupto/parcial, permisos, conservación literal de campos desconocidos, relectura tras escritura, objetivo sin tocar sesiones, errores y reintentos.

La suite cubrirá concurrencia, orden de cola, sesiones iguales independientes, `operationId` repetido/alterado, timeout sin reintento, reinicio, migración cancelada/fallida/completa, precedencia y conflicto de objetivos, contadores, quinta escritura, backup fallido/reintentado y ausencia de restauración automática. También simulará interrupciones antes y después de la sustitución para verificar que nunca queda un archivo parcial. Cada caso verificará que no se pierden ni sobrescriben datos y que los mensajes exactos se devuelven.

Chrome DevTools verificará `node server.js`, `localhost:3000`, consola, API no disponible, dos navegadores con el mismo estado, alta/objetivo/recarga, migración desde una página con localStorage, cancelación y reintento, corrupción sin mutación, aviso de backup, foco/ARIA, textos españoles, móvil a 375 px y ausencia de llamadas a localStorage tras `completed`. No se borrarán datos reales sin consentimiento.

## Matriz de trazabilidad RF → tests y Chrome DevTools

| RF | `node --test` | Chrome DevTools |
|---|---|---|
| RF-1 | arranque, estáticos y API no disponible | servidor, localhost y conexión caída |
| RF-2 | esquema, lectura, escritura atómica y relectura | alta, objetivo y recarga compartida |
| RF-2 bis | cola, relectura, concurrencia e idempotencia | dos navegadores y timeout |
| RF-3 | fechas locales y estadísticas derivadas | actualización con fecha local |
| RF-4 | puente, confirmación, estados y reintentos | migración desde contexto con localStorage |
| RF-5 | normalización, deduplicación y objetivos | formatos históricos visibles |
| RF-6 | errores, cancelaciones y conservación | mensajes, foco y no pérdida |
| RF-7 | backup atómico, interrupción y no restauración | aviso de backup pendiente |
| RF-8 | contadores persistentes y reintentos | quinta escritura y reinicio |
