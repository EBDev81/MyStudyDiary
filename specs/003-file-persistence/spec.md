# Persistencia local mediante backend Node.js

**Estado: borrador**

## Contexto y objetivo

Diario de Estudio guarda actualmente las sesiones y el objetivo semanal en el almacenamiento del navegador. Esto limita los datos al navegador concreto, dificulta compartirlos entre navegadores y no ofrece un archivo de datos visible y respaldable dentro del proyecto.

La funcionalidad debe sustituir esa persistencia por un backend local ejecutado con Node.js nativo, sin frameworks ni dependencias externas. El objetivo es que la aplicación se use oficialmente mediante `node server.js` y `http://localhost:3000`, que los datos queden en un JSON del proyecto y que las estadísticas sigan siendo cálculos derivados de las sesiones, no datos duplicados que puedan quedar obsoletos.

La migración inicial debe proteger los datos existentes: requerirá confirmación explícita, conservará las claves originales de `localStorage` como copia manual y, una vez completada correctamente, la aplicación dejará de leer o escribir `localStorage`.

Antes de activar este modo deben modificarse exactamente estos documentos: el principio 1 de `docs/constitution.md` debe sustituir el doble clic/`file://` por `node server.js` y localhost; el principio 5 debe sustituir `localStorage` por JSON con migración única; `AGENTS.md` debe actualizar sus apartados Stack/estructura, Datos, Verificación y reglas de `file://`/`localStorage`; y `README.md` debe actualizar la ejecución con Node, la migración y añadir «Historial de cambios». Esta entrega es obligatoria, no opcional, y se verifica como criterio de finalización.

## Usuarios

Una persona que ejecuta Diario de Estudio en su propio ordenador y registra sesiones de estudio desde uno o varios navegadores conectados a `localhost:3000`. No existen cuentas ni perfiles: todos los navegadores conectados comparten los mismos datos del usuario local.

## Historias de usuario

- Como estudiante, quiero iniciar la aplicación con Node.js y acceder desde el navegador para conservar mis datos fuera del almacenamiento particular de un navegador.
- Como estudiante, quiero que mis sesiones y mi objetivo semanal se guarden en un archivo del proyecto para poder mantener una única fuente de datos local.
- Como estudiante, quiero migrar mis datos existentes con confirmación y conservar la copia original para no perder información.
- Como estudiante, quiero abrir la aplicación desde distintos navegadores conectados al mismo localhost y ver los mismos datos.
- Como estudiante, quiero que rachas, mapa de calor, minutos semanales, días del mes y progreso semanal se calculen a partir de las sesiones actuales.
- Como estudiante, quiero recibir un mensaje claro si el servidor no puede leer o guardar mis datos, sin que se borre información existente.

## Requisitos funcionales

### RF-1. Ejecución oficial mediante servidor local

La aplicación debe requerir un servidor Node.js nativo y una dirección local HTTP única para acceder a la funcionalidad persistente, porque ya no habrá dos modelos de almacenamiento que puedan divergir.

- **Criterio EARS:** Cuando el usuario ejecute `node server.js` y acceda a `http://localhost:3000`, el sistema debe mostrar la aplicación y permitir consultar y gestionar sus datos.
- **Criterio EARS:** Cuando el usuario abra `index.html` directamente mediante `file://`, el sistema no debe considerarlo un modo oficial de uso ni debe intentar ofrecer persistencia mediante `localStorage`.
- **Criterio EARS:** Cuando el usuario acceda desde cualquier navegador conectado a `localhost:3000`, el sistema debe mostrar el mismo conjunto de datos local compartido.
- **Criterio EARS:** Antes de activar el nuevo modo oficial, el proyecto debe haber actualizado la constitución, `AGENTS.md` y `README.md`; el README debe explicar brevemente el cambio a backend y su motivo.
- **Criterio EARS:** Cuando el servidor esté apagado o la API no esté disponible, la interfaz debe comunicar en español que no puede conectarse y no debe presentar ninguna operación como guardada.

### RF-2. Persistencia de sesiones y objetivo semanal

Las sesiones y el objetivo semanal deben conservarse en JSON dentro del proyecto, manteniendo separados los datos de sesiones y objetivo para no confundirlos con estadísticas derivadas.

El esquema conceptual del archivo principal exige una raíz objeto con campos obligatorios exactos: `version:1`, `sesiones` como array, `objetivoSemanal` como `null` o entero entre 1 y 5.040, y `metadata` como objeto. `metadata` exige `migration` con `status` `pending`, `failed` o `completed`, `sources` como array de strings del inventario permitido, `ignoredSources` como array de objetos `{source:string, reason:string, count:entero}`, y `completedAt: null | 'AAAA-MM-DD'`; en estados `pending` o `failed`, `completedAt` permanece `null`, y solo `completed` puede tener una fecha. También exige `successfulWrites` y `backupSuccessfulWrites` como enteros no negativos; `backupSuccessfulWrites` comienza en 0. Una sesión normalizada es `{fecha:'AAAA-MM-DD', tema:string, minutos:entero positivo seguro, creado:entero positivo opcional}`. `creado` ausente o inválido se conserva ausente y no invalida la sesión. Los campos desconocidos de la raíz y de los objetos se conservan literalmente, pero se ignoran y no se interpretan.

- **Criterio EARS:** Cuando el usuario registre una sesión válida, el sistema debe persistirla en el JSON y mostrarla tras recargar o volver a consultar la aplicación.
- **Criterio EARS:** Cuando el usuario configure, modifique o restablezca un objetivo semanal válido mediante la acción correspondiente, el sistema debe persistir el nuevo estado en el JSON sin eliminar ni modificar sesiones.
- **Criterio EARS:** Cuando la aplicación se cargue, el sistema debe leer los datos persistidos del JSON y mostrarlos de forma consistente en todos los navegadores conectados al servidor.
- **Criterio EARS:** Cuando una lectura o escritura no pueda completarse, el sistema debe comunicar el fallo, no presentar el cambio como guardado y conservar los datos válidos existentes.
- **Criterio EARS:** Cuando el JSON esté ausente, vacío o corrupto, el sistema no debe borrar ni sobrescribir automáticamente el archivo ni inventar estadísticas persistidas; debe bloquear las operaciones de datos y mostrar exactamente «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.».
- **Criterio EARS:** Cuando dos navegadores soliciten escrituras concurrentes, el servidor debe procesarlas una por una y conservar cada sesión válida como una entrada independiente, incluso si tienen la misma fecha y hora.
- **Criterio EARS:** Cuando falle la escritura real de los datos, el sistema debe mostrar exactamente «No se han podido guardar los datos. Inténtalo de nuevo.» y no debe presentar la operación como guardada.
- **Criterio EARS:** Cuando no exista el archivo al iniciar el servidor, el sistema debe poder crear un JSON inicial válido; cuando exista pero esté vacío, tenga raíz, versión o tipos inválidos, o esté parcialmente escrito, debe bloquear operaciones y no sobrescribirlo automáticamente.
- **Criterio EARS:** Cuando el principal o el backup no cumplan exactamente el esquema versionado definido, el sistema debe tratarlos como inválidos, no restaurar uno sobre otro automáticamente y comunicar el bloqueo.

El archivo principal debe tener la raíz versionada exacta definida arriba: `version`, `sesiones`, `objetivoSemanal` y `metadata`. Las estadísticas derivadas quedan fuera del archivo.

 - **Criterio EARS:** Cuando el sistema valide el archivo principal, debe exigir una raíz objeto y los campos obligatorios con esos tipos, conservando los campos desconocidos sin interpretarlos.
- **Criterio EARS:** Cuando el sistema valide el backup, debe exigir el mismo esquema conceptual completo y tratarlo como una copia del último JSON principal válido, no como una fuente alternativa de datos.
 - **Criterio EARS:** Cuando la raíz no sea un objeto, falte un campo obligatorio, un campo obligatorio tenga tipo inválido, una sesión normalizada no tenga sus datos válidos o los metadatos sean incoherentes, el sistema debe tratar el JSON como inválido y bloquear operaciones de datos sin mutarlo; los campos desconocidos no invalidan el JSON y se conservan sin interpretación.
- **Criterio EARS:** Cuando el archivo principal sea válido, el sistema debe conservar las sesiones normalizadas, el objetivo semanal y los metadatos, sin almacenar rachas, mapa de calor, progreso, totales semanales ni días del mes.
- **Criterio EARS:** Cuando la raíz o cualquier objeto válido contenga campos desconocidos, el sistema debe conservarlos sin alterar ni descartar datos, aunque no los use para cálculos.

### RF-2 bis. Cola y consistencia de operaciones

Las escrituras deben serializarse para que varios navegadores compartan una única secuencia consistente, sin perder sesiones ni aceptar decisiones basadas en una versión antigua del archivo.

- **Criterio EARS:** Cuando una operación entre en la cola de escrituras, el servidor debe releer y validar el último JSON disponible justo antes de aplicarla.
- **Criterio EARS:** Cuando una operación termine correctamente, la siguiente operación de la cola debe partir del JSON recién persistido y validado.
- **Criterio EARS:** Cuando falle una escritura, el sistema debe dejar la interfaz en el estado anterior conocido, detener las operaciones dependientes de esa versión y permitir reintentar sin duplicar la operación mediante una respuesta idempotente o una confirmación clara de su resultado.
- **Criterio EARS:** Cuando dos operaciones añadan sesiones con la misma fecha y hora, el sistema debe conservar ambas como entradas independientes; solo los duplicados exactos tras normalización se consideran duplicados durante la migración.
- **Criterio EARS:** Cuando una operación de sesión u objetivo se solicite, debe llevar un `operationId` generado por el cliente.
- **Criterio EARS:** Cuando se reintente un `operationId` mientras el servidor aún conserva su resultado en memoria durante la cola, debe responder con el mismo resultado sin volver a aplicar la operación.
 - **Criterio EARS:** Cuando el resultado de una operación sea desconocido por un timeout, la interfaz no debe duplicarla automáticamente y debe ofrecer reintentar o recargar con una indicación clara.
 - **Criterio EARS:** Cuando el servidor se reinicie, la garantía de duplicación cero mediante `operationId` no debe extenderse a resultados desconocidos anteriores; la interfaz debe recargar el JSON y pedir al usuario repetir la operación si lo necesita.
 - **Criterio EARS:** Cuando se reutilice un `operationId` durante la vida del proceso con un payload distinto, el servidor debe rechazarlo; el identificador debe ser un string único por operación.
 - **Criterio EARS:** Cuando el servidor se reinicie, no debe reintentar automáticamente operaciones con resultado desconocido; la interfaz debe avisar y pedir recargar y confirmar antes de repetir.

### RF-3. Fuente de verdad y estadísticas derivadas

Las sesiones deben ser la fuente de verdad de las estadísticas; el progreso semanal, las rachas, los minutos semanales, los días estudiados del mes y el mapa de calor no deben guardarse como datos independientes.

- **Criterio EARS:** Cuando la aplicación cargue o cambie una sesión, el sistema debe calcular las estadísticas a partir de las sesiones disponibles y reflejar el resultado actual.
- **Criterio EARS:** Cuando cambie la fecha local actual, el sistema debe recalcular las estadísticas que dependan del día, la semana o el mes sin requerir datos derivados previamente guardados.
- **Criterio EARS:** Cuando existan sesiones futuras, el sistema debe excluirlas de rachas y estadísticas que las excluyen según las reglas vigentes.
- **Criterio EARS:** Cuando haya varias sesiones en una fecha, el sistema debe sumarlas donde corresponda y contar la fecha una sola vez donde la estadística mida días.

### RF-4. Migración inicial de localStorage

La aplicación debe permitir una única migración inicial de los datos históricos del navegador al JSON, con consentimiento explícito y sin eliminar las copias originales.

 - **Criterio EARS:** Cuando existan datos migrables en `localStorage`, una utilidad temporal abierta desde el contexto original debe leerlos y enviarlos explícitamente al servidor local; el servidor no debe leer directamente el `localStorage` de otro origen y debe solicitar confirmación antes de copiarlos al JSON.
 - **Criterio EARS:** Cuando se ejecute la migración, el usuario debe abrir una página o acción de migración del proyecto desde el contexto que contiene `localStorage`, confirmar, enviar el paquete al servidor local y recibir el resultado; solo un resultado exitoso puede marcar `completed`.
- **Criterio EARS:** Cuando el usuario rechace o cancele la migración, el sistema no debe copiar, borrar ni modificar las claves originales y debe informar de que la migración no se ha realizado.
- **Criterio EARS:** Cuando el usuario confirme y la migración termine correctamente, el sistema debe conservar intactas las claves originales como copia manual y usar exclusivamente el JSON en las operaciones posteriores.
 - **Criterio EARS:** Cuando existan las claves `diario-de-estudio-sesiones` y `diario-estudio-sesiones`, el sistema debe considerar las sesiones válidas de ambas y evitar duplicados exactos.
 - **Criterio EARS:** `metadata.migration.sources` solo puede contener `diario-de-estudio-sesiones`, `diario-estudio-sesiones` y `diario-de-estudio-objetivo-semanal`; las fuentes ausentes se omiten y las inválidas se registran como ignoradas.
 - **Criterio EARS:** El inventario debe tratar `diario-de-estudio-sesiones` como sesiones actuales, `diario-estudio-sesiones` como sesiones históricas y `diario-estudio-objetivo-semanal` como objetivo actual; si falta este último, la fuente del objetivo solo se considerará histórica cuando esa condición quede documentada durante la migración.
- **Criterio EARS:** Cuando se normalice una sesión histórica, el sistema debe considerar duplicado otro registro cuyos campos normalizados `fecha`, `tema` y `minutos` sean iguales, sin depender del orden de propiedades ni exigir `creado`.
- **Criterio EARS:** Cuando exista un objetivo válido en la clave principal actual, el sistema debe preferirlo frente a otro objetivo histórico válido.
- **Criterio EARS:** Cuando solo una de las fuentes históricas contenga un objetivo válido, el sistema debe migrar ese objetivo.
- **Criterio EARS:** Cuando las dos fuentes contengan objetivos válidos distintos, el sistema debe solicitar una decisión explícita al usuario y no sobrescribir ninguno ni completar la migración hasta resolver el conflicto.
- **Criterio EARS:** Cuando exista un objetivo semanal histórico válido, el sistema debe migrarlo junto con las sesiones sin convertir el progreso calculado en un dato persistente independiente.
 - **Criterio EARS:** Cuando la migración falle parcial o totalmente, el sistema debe registrar `failed`, no borrar las claves originales ni declarar la migración completa, y debe permitir reintentarla.
 - **Criterio EARS:** Cuando el usuario confirme una migración y esta termine correctamente, el sistema debe registrar en `metadata.migration` que el estado es `completed`, las fuentes migradas y `completedAt` como la fecha local `AAAA-MM-DD` del cliente que confirmó, sin usarla para cálculos ni convertirla a UTC.
 - **Criterio EARS:** Cuando la migración falle, el sistema debe registrar `metadata.migration.status` como `failed`; cuando esté pendiente o fallida, debe permitir reintentarlo.
 - **Criterio EARS:** Cuando `metadata.migration.status` sea `pending` o `failed`, el usuario puede reintentar legítimamente; el reintento debe normalizar y deduplicar contra las sesiones ya existentes en el JSON sin añadir duplicados.
 - **Criterio EARS:** Cuando `metadata.migration.status` sea `completed`, el sistema no debe permitir otra migración ni volver a consultar `localStorage`.
- **Criterio EARS:** Cuando no haya datos migrables, tras la confirmación el sistema debe registrar la migración como `completed` sin datos.
- **Criterio EARS:** Cuando `metadata.migration` indique `completed`, el sistema no debe volver a leer ni escribir `localStorage` durante el uso normal de la aplicación; esa marca debe ser suficiente para reconocer la migración sin consultar el navegador.

### RF-7. Copia de seguridad del archivo de datos

El sistema debe ofrecer una copia de seguridad local periódica sin sustituir el archivo principal ni deshacer escrituras válidas, para facilitar la recuperación manual ante problemas posteriores.

- **Criterio EARS:** Cuando el sistema realice una escritura exitosa en el archivo principal `data/data.json`, debe contarla como una escritura persistida.
- **Criterio EARS:** Cuando se complete la quinta escritura exitosa de datos desde el último backup exitoso, el sistema debe intentar actualizar `data/data.backup.json` con el JSON principal completo y válido, incluido el mismo `successfulWrites` después de incrementarlo.
- **Criterio EARS:** Cuando falle la actualización de la copia de seguridad, el sistema debe conservar intacto el archivo principal, no deshacer la escritura principal y mostrar un aviso de copia pendiente.
- **Criterio EARS:** Cuando una escritura principal falle, el sistema no debe actualizar la copia de seguridad ni presentar la escritura como guardada.
- **Criterio EARS:** Cuando el archivo principal o la copia de seguridad requieran recuperación, el sistema no debe restaurar automáticamente ningún archivo; la recuperación debe ser manual.
- **Criterio EARS:** Cuando se valide `data/data.backup.json`, el sistema debe exigir la misma raíz y tipos conceptuales válidos que al principal y debe tratarlo como el último JSON válido de respaldo, sin convertirlo en fuente activa.
- **Criterio EARS:** Cuando el principal o el backup tengan una estructura inválida, el sistema no debe mutar automáticamente ninguno de los dos archivos para corregirlo.

### RF-8. Contador de escrituras y estado de backup

El contador de backup debe medir escrituras efectivamente confirmadas en el principal, incluyendo sesiones y objetivo semanal, para que una copia periódica represente un estado real y conocido.

- **Criterio EARS:** Cuando una escritura exitosa de sesiones o de objetivo modifique y valide `data/data.json`, el sistema debe incrementar de forma persistente el contador de escrituras en los metadatos.
- **Criterio EARS:** Cuando una escritura falle antes de validarse en el principal, el sistema no debe incrementar el contador ni actualizar el backup.
 - **Criterio EARS:** Cuando `successfulWrites - backupSuccessfulWrites >= 5`, el sistema debe intentar actualizar `data/data.backup.json`; no se deben usar múltiplos ambiguos independientes del último backup.
- **Criterio EARS:** Cuando falle la actualización del backup, el principal debe conservarse como último estado válido, el contador debe conservar la escritura exitosa y el sistema debe mostrar un aviso de copia pendiente.
- **Criterio EARS:** Cuando falle el backup, el contador debe conservarse y cada escritura exitosa posterior debe volver a intentar la copia hasta lograrla; al lograrla, el contador queda asociado a ese backup y una escritura de backup no incrementa el contador.
 - **Criterio EARS:** Cuando se complete la migración inicial, esa operación no debe incrementar `successfulWrites`; un backup tampoco debe contar como escritura.
 - **Criterio EARS:** Cuando el backup tenga éxito, `backupSuccessfulWrites` debe igualar `successfulWrites`; si falla, solo avanza `successfulWrites` y el siguiente éxito vuelve a intentarlo. Ambos contadores deben persistir tras reinicios.

### RF-5. Compatibilidad de datos históricos

La migración y la lectura de datos deben reconocer los formatos de sesiones ya utilizados para evitar pérdida de sesiones durante el cambio de persistencia.

- **Criterio EARS:** Cuando una sesión histórica use `fecha`, `tema`, `minutos` y opcionalmente `creado`, el sistema debe conservarla como sesión válida si cumple las reglas existentes.
- **Criterio EARS:** Cuando una sesión histórica use `date`, `topic` y `minutes`, el sistema debe reconocerla y conservarla si cumple las reglas existentes.
- **Criterio EARS:** Cuando dos registros procedentes de las claves históricas tengan iguales sus campos normalizados, sin depender del orden de sus propiedades ni exigir `creado`, el sistema debe migrar una sola copia.
- **Criterio EARS:** Cuando un registro sea inválido o incompleto, el sistema no debe convertirlo en una sesión válida ni usarlo para estadísticas engañosas; tampoco debe borrar automáticamente el origen histórico.

### RF-6. Protección de datos y acciones destructivas

La sustitución de persistencia no debe causar pérdida silenciosa de sesiones ni eliminar datos históricos sin consentimiento.

- **Criterio EARS:** Cuando el usuario guarde o modifique datos, el sistema debe conservar las sesiones existentes y añadir o reemplazar únicamente la información solicitada.
 - **Criterio EARS:** Cuando una operación de persistencia falle, el sistema debe conservar el último estado válido conocido y permitir reintentarla.
 - **Criterio EARS:** Cuando la escritura principal responda, solo debe considerarse válida después de escribir, releer y validar el JSON completo; el backup posterior es independiente y un fallo suyo no invalida la escritura principal ni su contador.
 - **Criterio EARS:** Cuando se escriban datos, el sistema debe construir el nuevo documento desde el último válido, incrementar `successfulWrites`, realizar una sustitución atómica, releer y validar; solo después debe intentar el backup.
 - **Criterio EARS:** Cuando no pueda completarse la escritura atómica del principal o del backup, el sistema debe conservar el archivo anterior completo y mostrar el error de persistencia, sin dejar un archivo parcialmente visible.
- **Criterio EARS:** Cuando el usuario vaya a iniciar la migración, aunque sea no destructiva, el sistema debe solicitar confirmación explícita antes de copiar datos al JSON.
- **Criterio EARS:** Cuando el usuario vaya a restablecer el objetivo semanal, el sistema debe solicitar confirmación explícita antes de eliminarlo del estado activo.
- **Criterio EARS:** Cuando el usuario active el restablecimiento del objetivo semanal, el sistema debe solicitar exactamente «¿Quieres restablecer el objetivo semanal?»; si confirma, debe conservar todas las sesiones.
- **Criterio EARS:** Cuando una futura función de limpieza pueda eliminar datos del JSON, debe solicitar confirmación explícita antes de ejecutarse.
 - **Criterio EARS:** Cuando el usuario registre una sesión nueva, el sistema no debe tratar la acción como destructiva ni exigir confirmación adicional.
- **Criterio EARS:** Cuando el usuario cancele una acción destructiva, el sistema debe dejar intactos el JSON y las copias históricas.

## Requisitos no funcionales

- Debe utilizar Node.js nativo, sin frameworks, Express, npm, librerías ni dependencias externas.
- Debe ejecutarse mediante `node server.js` y servir la aplicación en `http://localhost:3000`.
- Debe requerir Node.js 18 o una versión posterior razonablemente compatible.
- `server.js` debe servir los recursos estáticos y exponer únicamente la API necesaria para consultar y persistir los datos.
- `file://` deja de estar soportado y no debe documentarse como alternativa funcional.
- Debe mantener la interfaz y la documentación en español; el código puede seguir las convenciones de idioma de la constitución.
- Debe respetar fechas locales, guardar fechas en formato `AAAA-MM-DD` y no desplazar días por conversiones UTC.
 - La fecha local usada para cálculos pertenece al navegador cliente: el navegador debe enviar o utilizar su fecha local, y el servidor solo debe persistir fechas ya formadas.
 - Cada sesión nueva debe recibir del cliente una fecha local ya formada `AAAA-MM-DD`; el servidor debe validar formato y calendario, persistirla sin convertir zona horaria, y permitir persistir fechas futuras aunque las estadísticas las excluyan.
 - El texto de fecha debe ser exactamente `AAAA-MM-DD` y representar un calendario real comprobado con componentes locales; el servidor no lo sustituye ni acepta fechas malformadas. Cambiar la zona del cliente afecta a próximas operaciones, no a sesiones guardadas.
- La lógica de fechas, rachas y estadísticas debe permanecer separable y verificable con una fecha `hoy` explícita.
- La suite de lógica debe poder ejecutarse con `node --test`, sin instalar paquetes.
- El servidor debe tratar los datos como pertenecientes a un único usuario local y no debe introducir cuentas ni autenticación.
- El JSON debe ser legible y mantenerse en el proyecto, sin convertir las estadísticas derivadas en una segunda fuente de verdad.
- Los fallos de lectura, escritura, formato o disponibilidad deben comunicarse sin borrar silenciosamente datos.
- Si la corrupción se detecta antes de iniciar una escritura, debe tener prioridad el bloqueo con «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.»; si se detecta durante la escritura, no debe mutarse el archivo inválido y debe mantenerse el estado anterior, sin presentar el cambio como guardado.
- Las escrituras concurrentes deben serializarse para evitar pérdidas; la serialización no debe deduplicar sesiones válidas que compartan fecha y hora.
- El archivo principal debe ser `data/data.json` y la copia periódica debe ser `data/data.backup.json`.
- La copia debe actualizarse después de cada quinta escritura principal exitosa, solo después de validar el principal; un fallo de copia no invalida la escritura principal.
- La aplicación debe seguir siendo comprensible, accesible y usable en móvil.
- No se deben almacenar datos personales adicionales ni enviar datos fuera del ordenador local.
- Los errores observables deben estar en español: servidor no disponible, datos inválidos, permisos o escritura fallida, conflicto de objetivos y migración fallida deben indicar la acción posible sin confirmar cambios no guardados. Para corrupción se usará el mensaje exacto definido; para escritura fallida, «No se han podido guardar los datos. Inténtalo de nuevo.».

## Casos límite

- Se ejecuta la aplicación sin haber iniciado `node server.js`.
- Se intenta usar `file://` después de la migración.
- Dos navegadores consultan el mismo servidor local y deben ver el mismo estado.
- No existe todavía el JSON de datos.
- El JSON está vacío, corrupto, parcialmente escrito o contiene tipos inesperados.
- La raíz JSON es un array, un valor nulo, un escalar o un objeto sin `sesiones`, `objetivoSemanal` o `metadata` compatibles.
- Una sesión carece de fecha `AAAA-MM-DD`, tema, minutos positivos o identificador temporal normalizado válido.
- El objetivo histórico de la clave principal actual es válido y el de la otra clave también: prevalece el de la clave principal actual.
- Solo una fuente histórica tiene objetivo válido: se usa ese objetivo.
- Ambas fuentes tienen objetivos válidos distintos: se solicita decisión explícita y no se sobrescribe ningún objetivo.
- El servidor no tiene permisos para leer o escribir el JSON.
- Dos navegadores escriben a la vez: las operaciones se procesan en cola, una por una.
- Dos sesiones tienen la misma fecha y hora: ambas se conservan como entradas independientes y no se consideran duplicados por coincidir temporalmente.
- Se registra una sesión y la escritura falla: no debe mostrarse como persistida.
- La escritura falla: se muestra exactamente «No se han podido guardar los datos. Inténtalo de nuevo.» y se puede reintentar.
- El JSON se corrompe: se bloquean las operaciones de datos, no se sobrescribe ni se borra el archivo y se muestra exactamente «No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.».
- La quinta escritura principal se valida correctamente y la actualización del backup falla: se conserva el principal y se muestra aviso de copia pendiente.
- La escritura principal falla antes de la quinta escritura: no aumenta el contador ni actualiza el backup.
- Se alcanza la quinta escritura: el backup se actualiza solo después de validar el principal.
- El backup existe pero es antiguo o está corrupto: no se restaura automáticamente ni se usa para sobrescribir el principal.
- Se intenta guardar un objetivo inválido o restablecerlo y la escritura falla.
- Existen sesiones únicamente en `diario-de-estudio-sesiones`.
- Existen sesiones únicamente en `diario-estudio-sesiones`.
- Existen ambas claves y contienen sesiones válidas, inválidas y duplicados exactos.
- El objetivo histórico existe en una forma válida, corrupta o incompatible.
- El usuario cancela la confirmación de migración.
- La migración falla después de haber preparado parte de los datos: las claves originales deben seguir intactas y no debe declararse éxito.
- La migración ya se completó y una copia antigua de `localStorage` sigue presente: el uso normal no debe leerla ni modificarla.
- La migración se confirma, falla o queda pendiente; solo `completed` permite ignorar `localStorage` definitivamente.
- El JSON registra `metadata.migration.status` como `completed`: la aplicación reconoce la migración por esa marca y no consulta `localStorage`.
- Hay sesiones con formato actual y sesiones con formato histórico en el mismo conjunto.
- Hay fechas inválidas, fechas futuras, minutos inválidos o sesiones duplicadas; se conservan los originales, pero no se cuentan como válidos donde corresponda.
- Cambian el día, la semana, el mes o el año local mientras el servidor continúa ejecutándose.
- Hay varias sesiones en el mismo día y deben respetarse tanto la suma de minutos como el recuento de días únicos.
- Se intenta eliminar o restablecer información sin confirmación o se cancela la confirmación.
- Al restablecer el objetivo se solicita exactamente «¿Quieres restablecer el objetivo semanal?» y se conservan todas las sesiones.
- Se solicita una futura limpieza de datos: requiere confirmación, mientras que registrar o editar una sesión no la requiere por no ser destructivo.

## Fuera de alcance

- Mantener un modo oficial o alternativo persistente mediante `file://` y `localStorage`.
- Cuentas, autenticación, perfiles, permisos multiusuario o sincronización remota.
- Acceso desde Internet, despliegue en un servidor externo o base de datos.
- Frameworks, Express, npm, dependencias externas o procesos de compilación.
- Editar o borrar sesiones, salvo las acciones que la aplicación ya defina y que estén explícitamente confirmadas.
- Esta spec solo cubre registrar nuevas sesiones y gestionar el objetivo semanal; no incluye editar ni borrar sesiones.
- Importar formatos distintos de los formatos históricos de sesiones y objetivo ya identificados.
- Resolver automáticamente conflictos semánticos entre registros que no sean duplicados exactos.
- Guardar rachas, progreso, mapa de calor u otras estadísticas derivadas como datos independientes.
- Exportación avanzada, cifrado o recuperación automática de archivos dañados.
- Restauración automática desde `data/data.backup.json` o deshacer una escritura válida por un fallo de backup.
- Resolver automáticamente la corrupción del JSON; la recuperación del archivo queda a cargo del usuario.
- Migraciones repetidas o sincronización bidireccional entre el JSON y `localStorage`.
- Ejecutar la aplicación abriendo `index.html` directamente mediante `file://`.

## Criterios de finalización

- La aplicación funciona oficialmente al ejecutar `node server.js` y visitar `http://localhost:3000`.
- La constitución, `AGENTS.md` y `README.md` se actualizan antes de activar el modo oficial; el README contiene un historial breve del cambio y su motivo.
- Sesiones y objetivo semanal persisten en el JSON del proyecto y sobreviven a recargas.
- Dos navegadores conectados al mismo localhost observan el mismo estado.
- Las estadísticas se recalculan desde las sesiones y no se persisten como fuente independiente.
- `data/data.json` tiene una raíz objeto válida con sesiones normalizadas, objetivo semanal y metadatos de migración/contador; las estadísticas derivadas están fuera del archivo.
- La migración solicita confirmación, combina ambas claves históricas, evita duplicados exactos, conserva las claves originales y migra el objetivo válido cuando existe.
- Tras una migración correcta, el uso normal no lee ni escribe `localStorage`.
- La finalización de migración queda registrada en `metadata.migration.status` como `completed`, con `completedAt` igual a la fecha local `AAAA-MM-DD` del cliente y las fuentes migradas.
- Una migración cancelada o fallida no borra ni altera las claves originales y puede comunicarse claramente al usuario.
- Los formatos `fecha`/`tema`/`minutos` y `date`/`topic`/`minutes` compatibles se conservan sin pérdida.
- Los errores de lectura y escritura no provocan pérdida silenciosa ni presentan cambios no persistidos como exitosos.
- Las escrituras concurrentes se procesan en cola; las sesiones con la misma fecha y hora permanecen como entradas independientes.
- Los fallos de escritura muestran exactamente el mensaje definido y no confirman persistencia inexistente.
- El JSON corrupto bloquea las operaciones, conserva el archivo sin sobrescribirlo y muestra exactamente el mensaje definido.
- La ausencia inicial permite crear un JSON válido al iniciar el servidor, pero un archivo existente vacío, parcial o inválido no se sobrescribe.
 - El esquema versionado exacto se valida tanto en principal como en backup, incluyendo `successfulWrites` y los estados de migración.
 - Los campos obligatorios tienen exactamente los nombres y tipos definidos; los campos desconocidos se conservan literalmente y se ignoran.
- La ausencia inicial crea un estado válido, mientras que vacío, corrupción o estructura inválida bloquean sin sobrescribir.
- El archivo principal es `data/data.json`; después de cada quinta escritura exitosa se actualiza `data/data.backup.json` tras validar el principal.
- Un fallo de backup conserva el principal, no deshace la escritura y muestra un aviso de copia pendiente; no hay restauración automática.
- El contador persistente cuenta conjuntamente las escrituras exitosas de sesiones y objetivo; los fallos y la migración no cuentan, y cada quinta escritura desde el último backup exitoso intenta actualizar el backup validado; si falla, se reintenta en la siguiente escritura.
- La cola relee el último JSON antes de cada operación, serializa escrituras y permite reintentos sin duplicación ni confirmaciones ambiguas.
 - Cada escritura de sesión u objetivo lleva `operationId`; un reintento conocido devuelve el mismo resultado y un resultado desconocido por timeout no se reintenta automáticamente.
 - `operationId` es un string único, rechaza payload distinto durante la vida del proceso y no ofrece garantía automática tras reinicio.
- La duplicación cero mediante `operationId` se garantiza solo durante la vida del proceso; después de reinicio se recarga el JSON y se solicita repetición explícita.
- El puente temporal desde el contexto original puede enviar datos al servidor para confirmación, conserva las claves originales, permite reintentar y deja de leer `localStorage` tras `completed`.
 - La fecha para los cálculos procede del navegador cliente y el servidor solo persiste fechas ya formadas.
 - El servidor acepta solo fechas cliente exactas `AAAA-MM-DD` de calendario real, sin sustituirlas ni convertir zona horaria.
- La corrupción detectada antes o durante una escritura bloquea o conserva el estado anterior con la prioridad y el mensaje definidos.
- La migración, el restablecimiento del objetivo y cualquier limpieza futura requieren confirmación; registrar y editar no son acciones destructivas.
- El restablecimiento usa exactamente «¿Quieres restablecer el objetivo semanal?» y conserva sesiones; esta spec no añade editar ni borrar sesiones.
 - La ejecución requiere Node.js 18 o posterior; `server.js` sirve estáticos y la API necesaria.
 - Antes de activar el modo se verifican los cambios exactos en el principio 1 y 5 de la constitución, Stack/estructura, Datos, Verificación y reglas de AGENTS, y ejecución, migración e Historial de cambios del README.
 - Se verifica el flujo puente de migración, el reintento solo en estados no completados, el contador persistente y el backup fallido con reintento posterior.
- La entrega documental de `docs/constitution.md`, `AGENTS.md` y `README.md`, incluido el historial de migración del README, está completada antes de activar el modo oficial.
- Se respetan las reglas de fechas locales, rachas, semanas, estadísticas, textos en español y protección de datos.
- La lógica relevante tiene pruebas ejecutables con `node --test` y todas pasan.
- La experiencia se mantiene usable en móvil y no se añaden dependencias externas.

## Dudas abiertas

Ninguna. Las decisiones necesarias han quedado definidas en esta especificación.
