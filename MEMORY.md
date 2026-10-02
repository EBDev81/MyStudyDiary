# MEMORY.md — Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual

- v1 funcionando: registrar sesiones (fecha, tema, minutos), racha actual, mejor racha, minutos de la semana, días estudiados del mes y lista de sesiones.
- Datos en `data/data.json`, servidos por Node en `http://localhost:3000`; `localStorage` solo se usa en el puente de migración única.
- T1 de la spec 002 completada: el contrato del objetivo semanal queda separado en la clave `diario-de-estudio-objetivo-semanal`, con JSON entero de 1 a 5040; las sesiones y sus formatos históricos permanecen intactos.
- T2 de la spec 002 completada: `validateWeeklyGoal`, `isValidLocalDateText` e `isValidSessionMinutes` son validadores puros y estrictos; 12 tests pasan.
- T3 de la spec 002 completada: `getWeekStart` y `calculateWeeklyProgress` calculan semanas locales lunes-domingo con `today` explícito, excluyen futuras y sesiones inválidas, y no mutan registros; 16 tests pasan.
- T4 de la spec 002 completada: `getGoalStatus` y `buildWeeklyGoalViewModel` derivan estados `none`, `pending`, `completed` y `exceeded`, con restantes no negativos, exceso positivo y progreso reiniciado al cambiar la semana; 18 tests pasan.
- T5 de la spec 002 completada: `loadWeeklyGoal`, `saveWeeklyGoal` y `resetWeeklyGoal` usan la clave aislada del objetivo, distinguen ausencia/corrupción de errores de lectura, conservan el objetivo ante fallos y permiten reintentos; 22 tests pasan.
- T6 de la spec 002 completada: añadido el bloque accesible de objetivo semanal, alta/modificación, reset confirmado, mensajes exactos y destinos de foco; la actualización avanzada queda para T7.

## Aprendizajes y errores a evitar

- Los selectores CSS genéricos como `.racha span:last-child` pueden afectar elementos nuevos de forma inesperada; revisar la especificidad cuando se añadan iconos o bloques dentro de la racha.
- No dar por corregido un detalle visual sin comprobarlo realmente en el navegador y recargar la página.
- Revisar los archivos de instrucciones después de editarlos para detectar errores de formato, como guiones duplicados.
- Mantener las instrucciones de verificación sin pasos duplicados cuando describen la misma acción.
- Nunca borrar ni reiniciar datos del usuario para hacer pruebas sin consentimiento explícito; las pruebas deben conservar el almacenamiento existente.
- Las pruebas actuales conservan seis sesiones: tres anteriores y tres nuevas de hoy, ayer y anteayer, recordar no borrar sin pedir confirmación.
- T1 de la spec 003 completada: la documentación establece Node.js 18+ con `node server.js` en `http://localhost:3000`, JSON como fuente de verdad, migración única desde `localStorage` y backup separado.

## Decisiones (y por qué)

- Sin dependencias externas: el modo oficial es `node server.js` y `http://localhost:3000`; la migración es única y conserva las claves históricas.
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- La mejor racha se calcula a partir de las fechas únicas guardadas, en lugar de persistirse por separado.
- La mejor racha muestra el icono de trofeo y el número en la misma línea para representar el récord conseguido.
- El bloque de racha no debe mostrar ningún separador ni hueco visual extraño entre el fuego y su número.
- Los minutos semanales se calculan de lunes a domingo, excluyendo fechas futuras, y se muestran con el icono ⏱️.
- Los días estudiados del mes cuentan fechas únicas del mes actual, excluyen fechas futuras y se muestran con el icono 📅.
- La interfaz usa una identidad visual de cuaderno de progreso: azul tinta como base, coral para la racha y verde lima para las acciones.
- La etiqueta de la racha usa mayúscula inicial: `Día de racha` o `Días de racha`.
- Al revisar un contador incorrecto, comprobar primero la compatibilidad entre los nombres de campos guardados (`fecha`/`date`, `minutos`/`minutes`).

## Próximos pasos

- T7 de `specs/002-weekly-goal/tasks.md` completada: la interfaz recarga el objetivo global y actualiza objetivo, progreso y estadísticas inmediatamente tras guardar sesiones; la persistencia aislada conserva los flujos de recarga, cambio de semana y reintento.
- T8 de `specs/002-weekly-goal/tasks.md` completada: estilos responsive a 375 px, foco visible y colores de texto, estados, errores y mapa ajustados para contraste AA; no se modificaron datos ni lógica.
 - T9 de la spec 002 completada: `node --test` pasa (23/23). Chrome DevTools verificó una página nueva `file://` en contexto normal con emulación explícita `375x812x1,mobile,touch`; `innerWidth` y ancho de documento fueron 375, sin overflow ni errores de consola. Se comprobó conservación byte a byte de sesiones, validación/foco, alta y restablecimiento confirmado/cancelado; el objetivo de prueba se retiró al terminar y las sesiones no se modificaron. El error inicial de carga de localStorage fue transitorio del contexto file://, no un error de aplicación.
 - Restyling visual aplicado sin tocar lógica, datos ni persistencia: tokens de cuaderno de progreso, botones jerarquizados, estados de objetivo legibles, skip link, foco visible, responsive 375 px y reduced motion.
- `objetivo-vista` usa `data-goal-status` solo para presentación; no modifica el contrato ni el cálculo del objetivo.
- Restyling corregido: el campo de fecha usa `autocomplete="off"` en lugar de `bday`; no se modificaron lógica, datos ni sesiones. `node --test` (23/23) y `node --check app.js` pasan. Chrome DevTools confirmó `file://` sin avisos tras recargar, y viewport móvil 375x812 sin overflow.
- Creado `README.md` con el resumen de la aplicación, su estructura, tecnologías, datos, fechas, funcionalidades y verificación.
- `README.md` ampliado con el contexto OpenCode, agentes, skills, comandos SDD, workflow, arquitectura funcional y reglas de persistencia.
- T2 de la spec 003 completada: tests y funciones puras para documento inicial, esquema v1, normalización, metadatos, fechas locales, today y estadísticas derivadas; `node --test` pasa (28/28). No hay servidor todavía.
- T3 de la spec 003 completada: `repository.js` crea el principal solo si falta, valida principal y backup con el esquema v1 y bloquea archivos vacíos, corruptos, parciales o inválidos sin sobrescribirlos; `node --test` pasa (31/31).
- Cola de escrituras implementada en `repository.js`: operaciones con `operationId`, idempotencia en memoria, relectura previa, escritura atómica y validación posterior; reset confirmado conserva sesiones. `node --test` pasa (33/33).
- T4 de la spec 003 completada: `server.js` sirve estáticos en localhost:3000 y expone `GET /api/data`, devolviendo estados de error en español sin confundirlos con datos guardados.
- T6 de la spec 003 completada: la interfaz carga el JSON mediante `GET /api/data` y persiste sesiones, objetivo y restablecimiento confirmado mediante `POST /api/operations`; los fallos no actualizan la vista como si se hubieran guardado. `node --test` pasa (33/33).
- T7 de la spec 003 completada: añadido `migration.html` como puente temporal que lee las tres claves históricas, pide confirmación, conserva las claves y envía fecha local; el repositorio combina/normaliza/deduplica sesiones, resuelve objetivos y marca `completed` sin incrementar contadores. `node --test` pasa (33/33).
- T8 de la spec 003 completada: `repository.js` intenta backup atómico cada cinco escrituras confirmadas, valida la copia antes de actualizar `backupSuccessfulWrites`, conserva el principal ante fallos, reintenta en la siguiente escritura y devuelve `backupPending`; no restaura desde backups inválidos. `node --test` pasa (37/37).
- T9 de la spec 003 completada: la interfaz usa exclusivamente la API (sin consultas de `localStorage` en `app.js`), distingue conexión, corrupción, escritura fallida y timeout, anuncia backup pendiente, conserva estados no guardados y mejora foco/ARIA en aplicación y migración. `node --test` pasa (37/37).
- T10 de la spec 003 completada: `node --test` pasa (37/37); verificación oficial en `http://localhost:3000` con API válida, consola limpia y viewport móvil 375x812 sin overflow. Se conservaron byte a byte los datos de trabajo y no se alteraron sesiones ni JSON durante la revisión.
- T11 de la spec 003 completada: matriz final RF-1–RF-8 validada con `node --test` (37/37), revisión de atomicidad principal/backup, reintento de backup, contadores persistentes, migración reintentable e idempotencia limitada al proceso. Chrome DevTools confirmó API válida, consola limpia y móvil 375x812 sin overflow; no se modificaron sesiones ni datos.
- Correcciones de revisión Fase 6: el backup se valida antes de sustituir el anterior, las migraciones no cuentan como escrituras, las fuentes se limitan al inventario permitido y la interfaz exige decisión explícita ante objetivos distintos. Estado persistido en JSON mediante Node/localhost.
- Corrección final SDD: la migración solo procesa las tres claves autorizadas; objetivos distintos entre documento existente y fuente exigen `goalDecision`, no sobrescriben sin decisión y las fuentes auxiliares se registran como ignoradas. `node --test` pasa 38/38.
- Corrección de inventario: validación, migración, persistencia del objetivo y tests usan exactamente `diario-de-estudio-objetivo-semanal`; no se modificaron datos.
- Corrección final de migración: fuentes autorizadas corruptas, incompletas o con registros inválidos se excluyen de `sources` y quedan registradas en `ignoredSources` con motivo y conteo; se mantienen y migran sus registros válidos. Regresión cubierta; `node --test` pasa 40/40.
- Añadidas 33 sesiones de prueba, distribuidas en las 10 semanas anteriores y la semana actual (20/07/2026–02/10/2026), para comprobar el mapa de calor. Se conservaron el objetivo y los metadatos existentes.
- Igualado el ancho del botón «Restablecer objetivo» con «Establecer objetivo» sin cambiar sus colores.
