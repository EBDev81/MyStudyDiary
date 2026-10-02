# Borrado del archivo principal de datos

**Estado: borrador**

## Contexto y objetivo

Diario de Estudio guarda las sesiones, el objetivo semanal y los metadatos de migración en un documento principal. La persona usuaria necesita una forma visible y controlada de empezar de nuevo, pero el borrado es irreversible y no debe destruir la copia de seguridad ni las copias históricas de migración.

Esta funcionalidad añade una acción accesible para borrar únicamente el contenido activo del documento principal, con una confirmación inequívoca que explique qué se perderá y que no hay marcha atrás. El backup permanece intacto y nunca se utiliza para restaurar automáticamente el principal.

## Usuarios e historias

- Como estudiante, quiero encontrar una acción para borrar todos mis datos activos para poder reiniciar el diario voluntariamente.
- Como estudiante, quiero leer exactamente qué se borrará y que no hay marcha atrás antes de confirmar.
- Como estudiante, quiero cancelar sin cambios para no perder mis sesiones por accidente.
- Como estudiante, quiero que la copia de seguridad permanezca intacta para conservar una recuperación manual.
- Como estudiante, quiero ver estadísticas y listas vacías después del borrado confirmado, sin datos antiguos mostrados como si siguieran activos.
- Como estudiante, quiero recibir un error claro si el borrado no se completa, sin que la interfaz confirme una operación desconocida.

## Alcance

La funcionalidad cubre una acción accesible desde la aplicación oficial que, solo tras confirmación explícita, sustituye el estado activo por un documento válido con `sesiones: []`. Conserva `version`, el objetivo semanal actual, los metadatos de migración y los campos desconocidos de la raíz y de `metadata`; no conserva ningún campo perteneciente a las sesiones eliminadas. El objetivo no se borra: se conserva explícitamente para que el reinicio afecte únicamente a los datos de sesiones. No elimina ni modifica `data/data.backup.json`, las claves históricas de `localStorage` ni otros archivos.

El borrado se considera una escritura del principal y participa en la consistencia, serialización, validación y escritura segura ya definidas. No incrementa `successfulWrites`, no intenta crear ni actualizar el backup y no lo restaura. Si `backupSuccessfulWrites > successfulWrites`, el documento v1 es inválido/corrupto y el borrado devuelve `DATA_CORRUPT` sin mutar. `backupPending` no pertenece al esquema v1 ni se persiste: es únicamente un booleano obligatorio de la respuesta exitosa y un estado visual derivado al recargar a partir del cálculo de contadores (`successfulWrites - backupSuccessfulWrites >= 5`). El cliente acepta campos desconocidos adicionales en las respuestas y los ignora. `deletedSessions` cuenta las sesiones del documento válido releído inmediatamente antes de construir el documento vacío.

### Resumen normativo del documento v1

El documento v1 que se valida debe tener en su raíz, como mínimo, `version: 1`, `sesiones` como array, `objetivoSemanal` como `null` o como entero entre 1 y 5040 inclusive, y `metadata` como objeto. En `metadata`, `migration` puede tener `status` `pending`, `failed` o `completed`; `sources` debe ser un array de fuentes del inventario autorizado; `ignoredSources` debe ser un array de objetos `{source,reason,count}`; y `completedAt` debe ser `null` o una fecha local con formato `AAAA-MM-DD`. `successfulWrites` y `backupSuccessfulWrites` deben ser enteros no negativos.

Cada sesión debe tener `fecha` con formato `AAAA-MM-DD`, `tema` como string y `minutos` como entero positivo seguro; `creado`, si existe, debe ser un entero positivo. Los campos desconocidos permitidos por el validador se conservan y se ignoran. “Conservar literalmente” significa conservar el mismo valor JSON, sin reinterpretarlo ni transformarlo; el orden de propiedades y el formato textual no son una garantía. Las fechas se validan como texto de fecha local, no como fechas UTC. “Backup byte a byte” significa que los bytes del backup deben ser exactamente los mismos antes y después de la operación.

## Requisitos funcionales

### RF-1. Acción visible y accesible

La aplicación debe ofrecer una acción claramente identificada como borrado de todos los datos de sesiones.

- **Criterio EARS:** Cuando la persona usuaria consulte la aplicación, el control de borrado debe estar disponible con texto en español que indique que afecta a todas las sesiones y que es una acción irreversible.
- **Criterio EARS:** Cuando una persona navegue con teclado, lector de pantalla o controles táctiles, debe poder localizar, comprender, enfocar y activar la acción sin depender del color, del puntero ni de un gesto oculto.
- **Criterio EARS:** Cuando el control reciba foco, debe mostrar un foco visible y conservar un orden de navegación comprensible, también en móvil.

### RF-2. Confirmación destructiva inequívoca

El borrado requiere consentimiento explícito inmediatamente antes de ejecutarse.

- **Criterio EARS:** Cuando la persona active el borrado, el sistema debe explicar que eliminará todas las sesiones, que conservará el objetivo semanal actual, que la acción no tiene marcha atrás y que la copia de seguridad no se borrará.
- **Criterio EARS:** Cuando la persona no confirme de forma inequívoca, cierre o cancele la confirmación, el sistema no debe cambiar el principal, el backup, las claves históricas ni la interfaz de datos.
- **Criterio EARS:** Cuando la persona confirme, el sistema debe ejecutar una única operación de borrado y no debe requerir una confirmación implícita posterior.
  - **Criterio EARS:** Cuando se solicite el borrado, la aplicación debe procesar mediante la API existente exactamente el objeto raíz `{type: 'clear-main-data', operationId: string, confirmation: 'BORRAR TODO'}`; `type`, `operationId` y `confirmation` son obligatorios en la raíz y no existe un payload alternativo.
- **Criterio EARS:** Cuando falte cualquiera de esos campos, tenga un tipo o valor distinto, o se incluya cualquier otro valor no permitido en el objeto raíz, el sistema debe rechazar la petición sin mutación.
- **Criterio EARS:** Cuando la interfaz permita confirmar, debe requerir interacción explícita después de mostrar la advertencia irreversible y enviar exactamente el objeto raíz del contrato; la operación debe conservar las reglas de idempotencia de la API existente.
  - **Criterio EARS:** Cuando se muestre la advertencia, el único contenido de advertencia del diálogo debe ser exactamente «Vas a borrar todas las sesiones de estudio. Esta acción no se puede deshacer y la copia de seguridad no se borrará. El objetivo semanal se conservará.»; puede incluir el título accesible «Confirmar borrado de sesiones», sin alterar ni añadir contenido a la advertencia. Confirmar y el botón deben decir exactamente «Borrar todas las sesiones» y cancelar exactamente «Cancelar».
  - **Criterio EARS:** Cuando se abra el diálogo, debe usar `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al título visible y `aria-describedby` apuntando al texto exacto de advertencia; los botones deben tener exactamente los nombres accesibles «Borrar todas las sesiones» y «Cancelar», sin sustituir la descripción; el foco irá a confirmar, cancelar devolverá el foco al botón de borrado y Escape equivaldrá a cancelar sin mutar.
  - **Criterio EARS:** Cuando se comunique un resultado, el mensaje debe mostrarse fuera del diálogo en una región `aria-live`; ningún mensaje de resultado puede formar parte del contenido de advertencia.

### RF-3. Borrado exclusivo del estado principal

La operación debe retirar del estado activo todas las sesiones, conservando el objetivo semanal actual y un documento válido.

- **Criterio EARS:** Cuando el borrado confirmado termine correctamente, la raíz del documento principal resultante debe conservar `version`, `objetivoSemanal`, `metadata` y los campos desconocidos permitidos de la raíz y de `metadata`; además, la propiedad `sesiones` debe existir y ser exactamente un array vacío (`sesiones: []`). El documento no se reduce a un único campo: se conservan todos los campos de raíz permitidos por este requisito.
- **Criterio EARS:** Cuando el documento contenga campos desconocidos, el documento resultante debe conservarlos literalmente solo en la raíz y en `metadata`, porque el validador v1 los permite; los registros de sesión eliminados y todos sus campos, incluidos los desconocidos, deben desaparecer.
- **Criterio EARS:** Cuando falte un campo obligatorio o un campo obligatorio tenga un tipo inválido, el documento debe considerarse corrupto y el borrado debe bloquearse sin mutación.
- **Criterio EARS:** Cuando el documento principal carezca de `objetivoSemanal`, aunque el resto de la estructura parezca válida, el documento debe considerarse inválido, el borrado debe bloquearse y debe mostrarse exactamente «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.»; no se debe normalizar, completar ni sobrescribir automáticamente `objetivoSemanal`.
- **Criterio EARS:** Cuando existan datos de migración en el documento, el borrado debe conservar su estado y sus registros; no debe volver a leer, borrar ni reiniciar las claves históricas de `localStorage`.
- **Criterio EARS:** Cuando la operación se confirme, nunca debe borrar, sustituir, truncar ni actualizar la copia de seguridad.
- **Criterio EARS:** Cuando exista un backup corrupto, antiguo o ausente, el borrado del principal no debe restaurarlo, corregirlo ni usarlo como fuente alternativa.

### RF-4. Consistencia, concurrencia y seguridad de persistencia

El borrado debe respetar la protección de datos y el modelo de operaciones existente.

- **Criterio EARS:** Cuando se solicite el borrado, el proceso del servidor debe releer el último JSON válido justo antes de ejecutarlo y procesarlo en la cola común a todos los navegadores conectados, sin sobrescribir silenciosamente otra escritura.
  - **Criterio EARS:** Cuando otra operación válida se encuentre en la cola, el sistema debe conservar el orden serializado y cada resultado confirmado debe corresponder al estado que realmente quedó persistido; una operación en cola debe releer y contar las sesiones inmediatamente antes de construir el documento vacío, después de las operaciones precedentes.
- **Criterio EARS:** Cuando el borrado falle antes de una confirmación completa del principal, debe conservarse el último documento principal válido y la interfaz no debe anunciar el borrado como realizado.
  - **Criterio EARS:** Cuando la respuesta sea desconocida por desconexión o timeout, la interfaz no debe repetir automáticamente el borrado; debe informar de la incertidumbre, cerrar el diálogo y devolver el foco al botón desbloqueado. Durante la vida del mismo proceso, recibir de nuevo el mismo `operationId` y payload debe devolver el resultado memorizado; tras recargar, un nuevo intento manual usa un `operationId` nuevo. Reutilizar manualmente el anterior sigue las reglas de idempotencia y no se considera un intento nuevo.
  - **Criterio EARS:** Cuando el servidor escriba el nuevo documento, solo debe responder éxito después de escribirlo atómicamente, releerlo y validarlo; si falla antes de sustituir, el principal anterior queda intacto; si sustituye pero falla la relectura o validación posterior, devuelve `CLEAR_WRITE_FAILED`, no hace rollback, deja el principal como esté, conserva intacto el backup y el cliente recarga. Nunca restaura desde backup. La respuesta exitosa debe incluir `deletedSessions` y `backupPending`; si la respuesta se pierde, la interfaz no debe afirmar éxito y debe recargar para mostrar el estado real.
   - **Criterio EARS:** Cuando se repita, durante la vida del proceso, el mismo `operationId`, la comparación debe usar solo la representación JSON de las propiedades enumerables propias de `{type,operationId,confirmation}`, con orden de propiedades irrelevante; prototipos y propiedades no enumerables no forman parte del contrato HTTP. Con payload equivalente se devuelve el mismo resultado guardado en memoria, incluido un error; si cambia esa representación, se devuelve exactamente `{ok:false, code:'IDEMPOTENCY_CONFLICT', message:'La operación ya existe con otros datos.'}`.
  - **Criterio EARS:** Cuando una respuesta no cumpla el contrato de éxito o error, debe producirse en el cliente exactamente `{ok:false, code:"UNEXPECTED_RESPONSE", message:"No se pudo confirmar la respuesta del borrado. Recarga la página antes de intentarlo de nuevo."}`. Todos los errores deben tener obligatoriamente `{ok:false, code:string, message:string}` y los códigos y mensajes deben coincidir exactamente con el inventario de esta spec; se permiten campos extra, que se ignoran. Solo una respuesta malformada o no contratada produce `UNEXPECTED_RESPONSE`; la UI no afirmará éxito, no actualizará estadísticas ni reintentará automáticamente.
- **Criterio EARS:** Cuando el payload no tenga `type` válido, `operationId` string no vacío o `confirmation` igual a `BORRAR TODO`, debe devolverse exactamente `{ok:false, code:"INVALID_CLEAR_REQUEST", message:"La confirmación de borrado no es válida."}` y sin mutar; el orden de propiedades es irrelevante y solo se valida contenido y valor.
- **Criterio EARS:** Cuando se reutilice un `operationId` con acción o confirmación distintas, se devolverá el error de idempotencia existente; el mismo payload devolverá el mismo resultado durante el proceso.
- **Criterio EARS:** Cuando el servidor se reinicie, no debe reintentar automáticamente ninguna operación anterior; la interfaz debe recargar el estado y solicitar una confirmación nueva.
  - **Criterio EARS:** Antes de construir el documento vacío, si el principal está ausente debe devolver exactamente `{ok:false, code:"MAIN_DATA_MISSING", message:"No se pueden borrar los datos porque no existe el archivo principal."}`; si está vacío, tiene JSON inválido, esquema inválido o contadores inválidos, debe devolver exactamente `{ok:false, code:"DATA_CORRUPT", message:"No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar."}`, sin modificar ningún archivo.
  - **Criterio EARS:** Cuando no se pueda escribir el principal antes de sustituirlo, debe devolverse exactamente `{ok:false, code:"CLEAR_WRITE_FAILED", message:"No se han podido borrar los datos. Inténtalo de nuevo."}` y el principal queda igual. Cuando se sustituya pero falle la relectura o validación, se devuelve exactamente ese error, el backup permanece intacto y el nuevo principal se conserva si es válido; nunca se hace rollback automático ni se restaura desde backup.
   - **Criterio EARS:** Cuando se reciba una operación `clear-main-data`, el servidor debe aplicarle una validación y un flujo diferenciados del contrato general de operaciones: debe aceptar únicamente el objeto raíz exacto definido para esta operación, rechazar cualquier payload alternativo o campo adicional, no crear un principal ausente, no incrementar `successfulWrites` y no intentar crear ni actualizar el backup. La exigencia de “objeto raíz exacto” aplica únicamente a la petición `clear-main-data`; las respuestas exitosas y de error pueden incluir campos desconocidos adicionales, que se conservan o ignoran y nunca se interpretan.
    - **Criterio EARS:** Antes de escribir, un principal ausente produce `MAIN_DATA_MISSING`; JSON, esquema o contadores inválidos producen `DATA_CORRUPT`. Un fallo al escribir o sustituir produce `CLEAR_WRITE_FAILED` y deja intacto el principal anterior. Si la sustitución se realizó pero falla la relectura o validación posterior, produce `CLEAR_WRITE_FAILED`, no hace rollback, deja el principal como esté, conserva el backup intacto y el cliente recarga.

### RF-5. Estadísticas y estado de la interfaz

El resultado visible debe derivarse del nuevo estado vacío.

- **Criterio EARS:** Cuando el borrado confirmado se persista y la recarga sea válida, la lista de sesiones debe quedar vacía y mostrar el estado de ausencia de sesiones.
- **Criterio EARS:** Cuando el borrado confirmado se persista y la recarga sea válida, la racha actual, la mejor racha, los minutos semanales, los días del mes y el mapa de calor deben reflejar cero actividad, mientras el objetivo semanal conservado debe seguir visible con progreso cero.
- **Criterio EARS:** Cuando el borrado falle o se cancele, la interfaz debe conservar los datos y estadísticas anteriores conocidos.
- **Criterio EARS:** Cuando el borrado termine correctamente, debe comunicarse el resultado en español mediante el anuncio `aria-live`; el anuncio recibe el texto sin recibir foco y el foco vuelve al botón de borrado.
  - **Criterio EARS:** Cuando termine correctamente, se anunciará con `aria-live` exactamente «Se han borrado {deletedSessions} sesiones. La copia de seguridad se ha conservado.»; el anuncio recibe el texto sin recibir foco. Tras cualquier resultado conocido (éxito o error), y tras timeout o desconexión, el diálogo se cierra, el botón se desbloquea antes de devolverle el foco y el foco vuelve al botón de borrado.
- **Criterio EARS:** Cuando se inicie el borrado, el botón y todos sus controles deben quedar bloqueados, debe mostrarse «Borrado en curso…» y no debe permitirse una segunda confirmación hasta conocer la respuesta.
- **Criterio EARS:** Mientras opere, quedarán bloqueados el botón de borrado, confirmación y cancelación, formulario de sesión, formulario de objetivo y restablecimiento de objetivo; usarán `disabled` o equivalente accesible `inert` y no aceptarán teclado ni táctil.
- **Criterio EARS:** La cancelación nunca debe dejar bloqueado el botón de borrado; en todos los resultados, el botón se desbloquea antes de devolverle el foco.
  - **Criterio EARS:** Cuando el borrado termine correctamente, la aplicación debe recargar el documento, reflejar el estado real y comunicar `deletedSessions`. Si la recarga falla o es corrupta, debe conservar el último anuncio, añadir el error de recarga mediante el mismo `aria-live`, no afirmar éxito ni deshacer la persistencia; una recarga posterior obtiene el estado real.
  - **Criterio EARS:** Cuando ocurra un timeout o una desconexión antes de conocer la respuesta, la aplicación debe mostrar «No se puede confirmar si los datos se han borrado. Recarga la página antes de intentarlo de nuevo.», no reintentar automáticamente, desbloquear el botón antes de devolverle el foco y, al recargar, reflejar el estado real.

### RF-6. Contadores, backup y migración

El borrado debe integrarse con las reglas persistentes sin convertir estadísticas en datos activos.

- **Criterio EARS:** Cuando el principal se actualice correctamente por un borrado, no debe incrementarse `successfulWrites`; un fallo tampoco debe incrementar contadores.
  - **Criterio EARS:** Cuando, al recargar, `successfulWrites - backupSuccessfulWrites >= 5`, la interfaz debe derivar `backupPending: true`; en caso contrario debe derivar `false`, incluso si el backup está ausente. El borrado no debe crear esa condición ni incrementar `successfulWrites`; `backupPending` no se guarda en el documento v1.
- **Criterio EARS:** Cuando falle cualquier intento posterior de backup, el principal vacío debe conservarse y el borrado no debe deshacerse.
- **Criterio EARS:** Cuando el estado de migración sea `pending`, `failed` o `completed`, el borrado no debe cambiarlo ni marcar la migración como completada.

## Requisitos de accesibilidad y seguridad

- El control, la confirmación, sus botones y mensajes deben tener nombres accesibles, relación semántica, foco visible y estado anunciable.
- La advertencia debe ser comprensible sin color, iconos ni texto ambiguo; debe distinguir cancelar de borrar definitivamente.
- No se debe permitir activar el borrado por una ruta no confirmada, una petición incompleta o una repetición automática.
- La operación solo afecta al estado local autorizado y no envía datos fuera del ordenador.
- Los errores deben estar en español y nunca deben afirmar éxito si la persistencia no fue validada.

## Contrato de respuestas

La respuesta exitosa completa exige `ok: true`, `deletedSessions` como entero no negativo y `backupPending` como booleano. No hay otros campos obligatorios; se permiten extras ignorables. `backupPending` no se persiste en el esquema v1 y, al recargar, se deriva exclusivamente del cálculo de contadores.

Todos los errores exigen `{ok:false, code:string, message:string}`; se permiten extras ignorables. El inventario exacto es: `INVALID_CLEAR_REQUEST` — «La confirmación de borrado no es válida.»; `IDEMPOTENCY_CONFLICT` — «La operación ya existe con otros datos.»; `MAIN_DATA_MISSING` — «No se pueden borrar los datos porque no existe el archivo principal.»; `DATA_CORRUPT` — «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.»; `CLEAR_WRITE_FAILED` — «No se han podido borrar los datos. Inténtalo de nuevo.»; `UNEXPECTED_RESPONSE` — «No se pudo confirmar la respuesta del borrado. Recarga la página antes de intentarlo de nuevo.». Solo respuestas malformadas o no contratadas producen `UNEXPECTED_RESPONSE` en el cliente.

## Contrato conceptual de la operación

La aplicación debe poder solicitar, mediante la API existente, únicamente el objeto raíz `{type: 'clear-main-data', operationId: string, confirmation: 'BORRAR TODO'}`. El orden de propiedades es irrelevante; la idempotencia compara solo la representación JSON de sus propiedades enumerables propias, no prototipos ni propiedades no enumerables. `operationId` debe ser un string no vacío y único por intento, generado por el cliente. Las respuestas de éxito y error permiten campos desconocidos adicionales, que se ignoran. Solo la ausencia o tipo incorrecto de un campo obligatorio, un código o mensaje desconocido o una mezcla inválida produce `UNEXPECTED_RESPONSE`. Los mensajes son los definidos en esta spec. La exigencia de objeto raíz exacto se aplica solo a la petición `clear-main-data`. `deletedSessions` debe ser igual a `sesiones.length` del último documento válido releído inmediatamente antes de construir el documento vacío. `backupPending` solo aparece en la respuesta exitosa y al recargar se deriva de los contadores; nunca se persiste. `clear-main-data` debe pasar por una validación diferenciada, no mutar ante error, no crear un principal ausente, no incrementar `successfulWrites` y no intentar backup.

La regla de creación inicial de la spec 003 solo aplica al arranque o a la lectura normal. No aplica a esta operación destructiva: si el principal está ausente, el borrado no lo crea ni lo sustituye y no toca el backup.

## Casos límite y errores

- Cancelación, cierre o rechazo de la confirmación: ningún dato cambia.
- Confirmación repetida o doble activación: solo una operación efectiva.
- Dos navegadores borran o escriben simultáneamente: se respeta la cola y el resultado real del principal.
- Principal ausente: se devuelve `MAIN_DATA_MISSING` con exactamente «No se pueden borrar los datos porque no existe el archivo principal.»; no se crea ni sustituye ningún archivo y el backup permanece intacto. No se usa el mensaje de corrupción ni el de escritura fallida.
- Principal inválido, vacío o parcialmente escrito, incluido el documento sin `objetivoSemanal`: se bloquea sin mutación y devuelve el objeto exacto de error `DATA_CORRUPT`; no se normaliza. Un fallo de escritura, relectura o validación del principal devuelve exclusivamente el objeto exacto `CLEAR_WRITE_FAILED` con «No se han podido borrar los datos. Inténtalo de nuevo.»; el backup permanece intacto.
- `backupSuccessfulWrites` mayor que `successfulWrites`: el documento v1 es inválido/corrupto, se devuelve `DATA_CORRUPT` y no se muta ningún archivo.
- Error de escritura, interrupción o timeout: se conserva el último estado conocido; no hay reintento automático, el diálogo se cierra y el foco vuelve al botón desbloqueado. El mismo `operationId` y payload durante el mismo proceso devuelve el resultado memorizado; un payload distinto devuelve `IDEMPOTENCY_CONFLICT`. Tras recargar, un nuevo intento manual usa `operationId` nuevo; reutilizar el anterior manualmente sigue las reglas de idempotencia.
- Inicio de la operación: botón y controles bloqueados, estado «Borrado en curso…» visible y ninguna segunda confirmación hasta conocer la respuesta.
- Timeout o desconexión: se anuncia exactamente «No se puede confirmar si los datos se han borrado. Recarga la página antes de intentarlo de nuevo.»; se cierra el diálogo, se desbloquea el botón, se devuelve el foco al botón y una recarga posterior determina el estado real.
- Backup válido con datos antiguos: permanece idéntico, incluso si el principal queda vacío.
- Backup inválido o inexistente: no impide por sí solo proteger el principal válido, pero nunca se corrige ni se usa para restaurar.
- Documento con cero sesiones ya: la confirmación sigue siendo necesaria; el resultado mantiene el contrato y no altera backup ni migración.
- Objetivo ausente: el documento es inválido, el borrado se bloquea con exactamente «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.» y no se normaliza ni se modifica ningún archivo. Sesiones futuras, duplicados o campos desconocidos solo se procesan tras validar que `objetivoSemanal` está presente y es compatible; entonces las sesiones y todos sus campos se eliminan y el objetivo actual, los metadatos y los campos desconocidos de raíz o `metadata` se conservan según esta spec.
- Migración pendiente o completada y claves históricas presentes: no se consultan ni se eliminan por el borrado.
- Recarga tras éxito: el estado vacío debe mantenerse y las estadísticas deben recalcularse, no quedar en caché visual.
- `backupPending` tras recarga: se deriva de los contadores actuales; nunca se lee de un campo persistido.

## Fuera de alcance

- Borrar o modificar `data/data.backup.json`.
- Restaurar datos, ofrecer deshacer, papelera, exportación o recuperación automática.
- Borrar claves históricas de `localStorage`, cambiar el estado de migración o repetir la migración.
- Borrar selectivamente sesiones, editar sesiones o eliminar solo el objetivo.
- Cuentas, permisos multiusuario, autenticación, sincronización remota o cifrado.
- Cambiar las reglas de fechas, rachas, estadísticas o el esquema general del documento.

## Criterios de finalización

- Existe una acción visible, accesible y claramente destructiva en español.
- La confirmación explica sesiones, objetivo, irreversibilidad y backup intacto, y cancelar no cambia datos; la petición usa exactamente el objeto raíz definido, sin payload alternativo.
- Un borrado confirmado deja el principal válido, con `sesiones: []` y el objetivo semanal actual, conservando metadatos y campos desconocidos de raíz o `metadata`, pero ningún campo de sesiones eliminadas.
- El backup y las claves históricas permanecen sin cambios byte a byte.
- Concurrencia, idempotencia, validación, errores, escritura segura y contadores respetan las reglas existentes.
- Un fallo o timeout nunca se presenta como éxito ni reintenta automáticamente una operación destructiva.
- Durante la espera se bloquean el botón y los controles, se muestra «Borrado en curso…» y no se permite una segunda confirmación; el éxito recarga y comunica las sesiones eliminadas, y timeout/desconexión muestra el mensaje exacto de incertidumbre.
- Si el principal está ausente, no se crea ni sustituye ningún archivo y el backup permanece intacto; la regla de creación inicial de la spec 003 no se aplica al borrado.
- Tras el éxito, lista, estadísticas y mapa muestran el estado vacío, y el objetivo conservado muestra progreso cero, tanto inmediatamente como después de recargar.
- La operación no modifica el estado de migración ni usa el backup como fuente.
- Existe un `README.md` mínimo que documenta el propósito y la advertencia, el botón y la confirmación, las sesiones borradas, el objetivo conservado, el backup intacto, el resultado irreversible, los mensajes generales y la comprobación manual. Incluye como máximo una nota breve de que no hay reintento automático; no exige documentar contratos HTTP internos ni la idempotencia. Su contenido se revisa para mantener coherencia con `AGENTS.md` y `docs/constitution.md`, antes de implementar.
- La lógica relevante tiene cobertura con `node --test`; la interfaz se verifica con teclado, lector de pantalla conceptual, consola limpia y viewport móvil de 375 px.

La primera tarea será documental: completar o corregir `README.md` y revisar su coherencia con `AGENTS.md` y `docs/constitution.md`, antes de implementar la funcionalidad.
