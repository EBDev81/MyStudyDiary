# Plan: Objetivo semanal de estudio

## Alcance y archivos

| Archivo | Trabajo previsto | RF |
|---|---|---|
| `index.html` | Añadir el bloque del objetivo, sus controles, estados, confirmación y regiones de mensajes accesibles, sin cambiar la estructura de sesiones. | RF-1, RF-4, RF-5 |
| `styles.css` | Hacer visibles y distinguibles los estados, con contraste, foco y reflujo móvil a viewport efectivo de 375 px. | RF-4, RF-5 |
| `app.js` | Añadir validación, cálculo puro, persistencia aislada e integración de carga, actualización, modificación y restablecimiento. | RF-1–RF-5 |
| `tests/weekly-goal.test.js` | Cubrir la lógica con `node --test` y un almacenamiento simulado, sin modificar sesiones reales. | RF-1–RF-5 |

El alcance no cambia la clave, formato ni contenido de las sesiones. Los formatos históricos ya soportados son exactamente los que usa el código actual: `fecha`/`tema`/`minutos` y `date`/`topic`/`minutes`; ambos deben leerse y sus registros deben conservarse byte por byte (no migrar, normalizar, ordenar ni reescribirlos como efecto de esta funcionalidad). La persistencia del objetivo usa exactamente la clave separada `diario-estudio-objetivo-semanal` y no guarda el progreso derivado. Su valor persistido es JSON de un entero positivo entre 1 y 5040 inclusive; ausencia de la clave significa sin objetivo, y cualquier otro JSON, tipo o rango es inválido y se trata como sin objetivo.

## Fechas y datos inválidos

Toda fecha es la fecha local del usuario. Las funciones puras reciben `today` explícitamente; no consultan el reloj, UTC ni el DOM. Queda prohibido usar `toISOString()`, `new Date("AAAA-MM-DD")` o conversiones UTC. Se construirán y compararán fechas mediante componentes locales, incluyendo el cambio de hora y el cruce de medianoche: el día local visible determina la semana y una sesión no cambia de día por el huso horario.

Una fecha de sesión solo es válida si tiene exactamente `AAAA-MM-DD` y, al reconstruirse con componentes locales, conserva año, mes y día reales; fechas malformadas, imposibles, vacías o futuras se ignoran para el cálculo y nunca se modifican. Los minutos se aceptan solo si son numéricos, finitos, positivos, enteros y están dentro de un límite seguro que permita sumar sin perder precisión (`Number.isSafeInteger`, incluido el rechazo de cero, negativos, decimales, `NaN`, infinitos y valores fuera de límites seguros). Las sesiones que fallen estas reglas permanecen intactas.

## Funciones puras previstas

Todas reciben sus entradas, y las relacionadas con calendario reciben `today`; no acceden a `localStorage`, DOM ni hora del sistema.

- `getWeekStart(today)`: lunes local de la semana, incluso al cruzar mes o año.
- `isValidLocalDateText(value)`: valida estrictamente una fecha local.
- `isValidSessionMinutes(value)`: aplica las reglas de finitud, positividad, integralidad y seguridad.
- `calculateWeeklyProgress(sessions, today)`: suma cada sesión válida entre lunes y `today`, sin futuras, sin mutar registros.
- `validateWeeklyGoal(value)`: acepta exactamente un entero de 1 a 5.040 inclusive, sin coerción parcial.
- `getGoalStatus(progress, goal)`: devuelve `pending`, `completed` o `exceeded`, y restante/exceso positivo.
- `buildWeeklyGoalViewModel(goal, sessions, today)`: produce `sin objetivo` o los datos calculados para la vista.

## Persistencia y fallos

La clave y el formato del objetivo se documentarán como contrato separado del array `diario-estudio-sesiones`. La lectura distingue ausente, JSON corrupto, tipo/formato inválido y excepción de lectura: los tres primeros muestran exactamente «No hay un objetivo semanal configurado» y el último «No se ha podido cargar el objetivo», sin borrar ni tocar sesiones. La escritura, modificación y eliminación son atómicas desde el punto de vista de la interfaz: solo se muestra el nuevo objetivo tras confirmar éxito; ante cualquier fallo se muestra exactamente «No se ha podido guardar el objetivo» y se conserva el objetivo anterior y sus datos mostrados. Un fallo debe permitir reintentar y demostrar después un reintento exitoso. El restablecimiento usa `window.confirm` con el texto exacto «¿Quieres restablecer el objetivo semanal?»; cancelar deja todo igual. Ningún camino de objetivo escribe la clave de sesiones.

## Interfaz verificable y accesible

Se deben distinguir con texto, no solo color, los estados: «No hay un objetivo semanal configurado», pendiente con minutos acumulados, «Objetivo cumplido» y «Objetivo superado» con exceso. Los controles visibles permiten alta y modificación; el restablecimiento está separado y pide confirmación explícita. Validación y errores usan `role="alert"`; progreso y éxito usan `role="status"` y `aria-live="polite"`; cada cambio produce un solo anuncio. El mensaje exacto de validación es «Introduce un número entero entre 1 y 5.040 minutos». Los mensajes se asocian mediante etiquetas y `aria-describedby`.

El flujo verificará orden lógico de teclado, foco visible, foco devuelto al control pertinente y que ningún significado dependa solo del color. Tras alta/modificación exitosa el foco queda en el mensaje de estado; tras validación/error, en el campo; tras cancelar reset, en el botón de restablecer; tras reset confirmado, en el control para establecer objetivo. En Chrome DevTools, a 375 px, se comprobará reflujo y contraste WCAG AA mínimo 4.5:1 para texto normal y 3:1 para controles/elementos gráficos, incluidos estados y errores.

## Decisiones y alternativas descartadas

- Clave separada para el objetivo; se descarta añadir campos al array de sesiones para proteger compatibilidad.
- Progreso calculado bajo demanda con `today`; se descarta persistirlo, porque quedaría obsoleto al cambiar de semana.
- Calendario local lunes-domingo; se descarta UTC/ISO basado en texto UTC.
- Validación estricta de objetivo y minutos seguros; se descarta redondear, truncar o aceptar valores ambiguos.
- Conservación del objetivo anterior ante cualquier fallo; se descarta borrar datos corruptos, sobrescribir sesiones o simular éxito.
- Confirmación explícita de restablecimiento; se descarta eliminar al cancelar o al cambiar de vista.
- `window.confirm` con texto español fijo; se descarta un diálogo personalizado para conservar simplicidad y accesibilidad nativa.
- `node --test` es la puerta para la lógica; Chrome DevTools complementa manualmente la interfaz, accesibilidad, `file://`, consola y móvil. No se modifica `AGENTS.md`.

## Estrategia de pruebas

Con `node --test` se probarán: ausencia, alta y restablecimiento global; clave y formato exactos; persistencia y reapertura; corrupto, tipo inválido, excepciones de lectura/escritura, reintento fallido/exitoso y sesiones intactas; objetivo global del mismo dispositivo; actualización tras guardar sesión; ambos formatos históricos; fechas y límites; estados y modelo sin mutación. El almacenamiento simulado debe verificar byte a byte que el array de sesiones permanece idéntico tras lectura, escritura, modificación, restablecimiento y cualquier error de persistencia. Esta puerta cubre lógica y persistencia, no DOM ni accesibilidad visual.

Chrome DevTools probará textos exactos, roles ARIA, un anuncio por cambio, teclado y destinos de foco, alta/modificación, entradas inválidas sin sobrescribir un objetivo válido, cancelación, confirmación, errores y reintentos, actualización DOM tras sesión, objetivo compartido, consola, recarga/reapertura, contraste y móvil a 375 px. Node y Chrome son verificaciones separadas; esta conservará el almacenamiento existente y nunca borrará sesiones.
