# Objetivo semanal de estudio

**Estado: borrador**

## Contexto y objetivo

El Diario de Estudio ya muestra los minutos estudiados durante la semana actual, pero no permite compararlos con una meta personal. Esta funcionalidad debe permitir que cada usuario establezca cuántos minutos quiere estudiar por semana y vea su progreso frente a esa meta, para hacer visible el avance y motivar el cumplimiento sin alterar sus sesiones.

## Usuarios

Personas que registran sesiones de estudio y quieren fijar una meta semanal personal, consultar cuánto han avanzado y saber si ya la han alcanzado.

## Historias de usuario

- Como estudiante, quiero fijar una cantidad de minutos semanales para tener un objetivo concreto.
- Como estudiante, quiero ver los minutos que llevo esta semana junto a mi objetivo para conocer mi progreso.
- Como estudiante, quiero saber cuándo he alcanzado o superado el objetivo para reconocer mi logro.
- Como estudiante, quiero modificar mi objetivo cuando cambien mis circunstancias.

## Requisitos funcionales

### RF-1. Configuración del objetivo global

El usuario debe poder establecer un único objetivo semanal global para el dispositivo, expresado en minutos, porque el proyecto no tiene cuentas ni perfiles.

- **Criterio EARS:** Cuando el usuario introduzca y confirme un número entero de entre 1 y 5.040 minutos inclusive, el sistema debe guardar ese objetivo y mostrarlo como objetivo semanal activo.
- **Criterio EARS:** Cuando el usuario introduzca un valor vacío, texto, decimal, cero, negativo o superior a 5.040, el sistema no debe aceptarlo como objetivo y debe comunicar que necesita un número entero entre 1 y 5.040.
- **Criterio EARS:** Cuando no exista un objetivo configurado, el sistema debe informar de que todavía no hay una meta semanal y ofrecer la posibilidad de establecerla.
- **Criterio EARS:** Cuando cualquier persona use la aplicación en el mismo dispositivo, el sistema debe mostrar el mismo objetivo semanal global configurado, sin distinguir perfiles.
- **Criterio EARS:** Cuando el usuario confirme explícitamente la acción de restablecer o eliminar el objetivo, el sistema debe dejarlo sin configurar sin borrar ni modificar ninguna sesión.

### RF-2. Persistencia separada y protección de sesiones

El objetivo semanal global debe conservarse en una persistencia separada de la información de sesiones. El objetivo no debe mezclarse con el array de sesiones ni alterar su estructura.

- **Criterio EARS:** Cuando el usuario recargue o vuelva a abrir la aplicación después de guardar un objetivo válido, el sistema debe mostrar el mismo objetivo.
- **Criterio EARS:** Cuando la información guardada de sesiones tenga el formato actual o un formato histórico compatible, el sistema debe conservar y seguir usando todas las sesiones válidas al mostrar el progreso.
- **Criterio EARS:** Cuando la información guardada del objetivo esté ausente, dañada o tenga un formato o tipo no válido, el sistema debe tratar el objetivo como no configurado, mostrar «No hay un objetivo semanal configurado» y no debe borrar, reiniciar ni sobrescribir las sesiones.
- **Criterio EARS:** Cuando no se pueda leer la información guardada del objetivo, el sistema debe mostrar «No se ha podido cargar el objetivo», tratarlo como no configurado y conservar intactas las sesiones.
- **Criterio EARS:** Cuando el navegador no permita guardar, modificar, restablecer o eliminar el objetivo, el sistema debe mostrar exactamente «No se ha podido guardar el objetivo», no debe presentar el cambio como persistente, debe conservar intactas las sesiones y debe permitir reintentarlo.

### RF-3. Cálculo del progreso semanal

El progreso debe comparar el objetivo con los minutos estudiados en la semana local actual.

- **Criterio EARS:** Cuando el usuario consulte el objetivo, el sistema debe sumar los minutos de todas las sesiones cuya fecha pertenezca a la semana actual de lunes a domingo y que no sea posterior a la fecha local actual.
- **Criterio EARS:** Cuando existan varias sesiones en el mismo día, el sistema debe sumar los minutos de todas ellas una sola vez cada una.
- **Criterio EARS:** Cuando cambie la semana local, el sistema debe iniciar el progreso de la nueva semana en cero, sin eliminar ni modificar sesiones históricas.
- **Criterio EARS:** Cuando una sesión tenga una fecha futura respecto a hoy, sus minutos no deben aumentar el progreso de la semana.
- **Criterio EARS:** Cuando el usuario guarde una sesión válida, el sistema debe actualizar el bloque del objetivo y las estadísticas derivadas visibles que dependan de las sesiones, sin persistir el progreso semanal como un dato independiente.

### RF-4. Presentación del avance

La interfaz debe mostrar el objetivo, los minutos acumulados y la relación entre ambos de manera entendible.

- **Criterio EARS:** Cuando exista un objetivo válido, el sistema debe mostrar los minutos acumulados de la semana y los minutos objetivo en español.
- **Criterio EARS:** Cuando el progreso sea inferior al objetivo, el sistema debe comunicar cuánto falta para alcanzarlo.
- **Criterio EARS:** Cuando el progreso sea igual al objetivo, el sistema debe mostrar el estado «Objetivo cumplido» y no debe mostrar minutos pendientes.
- **Criterio EARS:** Cuando el progreso supere el objetivo, el sistema debe mostrar el estado «Objetivo superado» y los minutos de exceso, sin mostrar una cantidad negativa pendiente.
- **Criterio EARS:** Cuando el usuario registre una sesión válida, el sistema debe actualizar el progreso mostrado sin requerir que se borren o vuelvan a introducir sesiones.

### RF-5. Modificación del objetivo

El usuario debe poder reemplazar un objetivo existente por otro objetivo válido o restablecerlo mediante una acción explícita.

- **Criterio EARS:** Cuando el usuario confirme un nuevo número entero entre 1 y 5.040 inclusive, el sistema debe sustituir el objetivo anterior por el nuevo y recalcular inmediatamente el avance mostrado.
- **Criterio EARS:** Cuando el usuario cancele o introduzca un valor inválido al modificar el objetivo, el sistema debe conservar el objetivo válido anterior.
- **Criterio EARS:** Cuando el usuario confirme explícitamente el restablecimiento o eliminación del objetivo, el sistema debe mostrar el estado sin objetivo configurado y dejar de mostrar un progreso asociado, conservando intactas todas las sesiones.
- **Criterio EARS:** Cuando falle la modificación o el restablecimiento de un objetivo válido, el sistema debe conservar ese objetivo anterior y sus datos mostrados; las sesiones deben permanecer intactas.

## Requisitos no funcionales

- La funcionalidad debe usar siempre la fecha local del usuario; no debe desplazar semanas por diferencias horarias.
- La semana debe entenderse siempre de lunes a domingo, incluido el día local actual y excluidas las fechas futuras.
- Los textos visibles y los mensajes de validación deben estar en español.
- La interfaz debe seguir siendo comprensible y utilizable en pantallas móviles y no depender únicamente del color para indicar cumplimiento.
- Los cálculos deben poder verificarse como lógica determinista proporcionando la fecha de hoy, sin depender de la hora real durante las pruebas.
- La lógica de cálculo debe recibir la fecha local actual como parámetro explícito; la persistencia, la lógica de cálculo y la interfaz deben mantener responsabilidades separadas.
- La funcionalidad no debe añadir dependencias ni requerir un servidor para abrir la aplicación.
- La configuración debe ser compatible con las sesiones ya guardadas y nunca debe eliminar ni modificar sesiones por cambiar el objetivo.
- Los datos derivados del progreso semanal no deben convertirse en una fuente independiente que pueda quedar desactualizada frente a las sesiones.
- Las sesiones inválidas deben ignorarse al calcular el progreso y conservarse sin modificar.

## Casos límite

- No hay objetivo configurado, pero sí existen sesiones.
- Hay objetivo configurado, pero no hay sesiones en la semana actual: el progreso es cero.
- El objetivo es exactamente igual a los minutos acumulados: se considera cumplido.
- Los minutos acumulados superan el objetivo: se muestra el exceso como una cantidad positiva, sin minutos pendientes negativos.
- Cuando los minutos acumulados superan el objetivo, se muestra el estado «Objetivo superado» y la cantidad positiva de minutos de exceso; nunca se muestra una cantidad pendiente negativa.
- El objetivo mínimo válido es un minuto y el máximo válido es 5.040 minutos.
- Se intenta guardar cero, un número negativo, un decimal, texto, un valor vacío o un valor superior a 5.040: se rechaza sin sustituir un objetivo válido previo.
- Los valores exactamente 1 y 5.040 se aceptan como límites del intervalo válido.
- Existen sesiones en domingo y el día local actual es domingo: se incluyen; las sesiones del lunes siguiente no se incluyen.
- El día local actual es lunes: solo se incluyen sesiones desde ese lunes; las de la semana anterior no se incluyen.
- Hay sesiones futuras dentro de la semana: se excluyen del progreso.
- Hay varias sesiones el mismo día: se suman todas sus duraciones.
- El objetivo guardado está corrupto o tiene un tipo/formato inesperado: no debe provocar pérdida de sesiones ni un progreso engañoso.
- El objetivo guardado es un tipo inválido (por ejemplo, texto, decimal, cero, negativo o superior a 5.040): se trata como no configurado y se muestra «No hay un objetivo semanal configurado».
- La lectura del objetivo falla: se muestra «No se ha podido cargar el objetivo», se trata como no configurado y las sesiones se conservan.
- La escritura, modificación o eliminación del objetivo falla: se muestra «No se ha podido guardar el objetivo»; si existía un objetivo válido, se conserva, y las sesiones no se tocan.
- El usuario restablece o elimina el objetivo y confirma la acción: el objetivo queda sin configurar, el progreso deja de estar activo y las sesiones permanecen sin cambios.
- El usuario cancela el restablecimiento o eliminación: el objetivo y su progreso permanecen sin cambios.
- Se cambia de mes o de año dentro de una semana: la semana sigue siendo la misma secuencia local de lunes a domingo.
- Se cambia de año o comienza una semana distinta: el objetivo global permanece y el progreso se calcula únicamente con la nueva semana local.
- Al cambiar de semana, el objetivo permanece y solo se reinicia el progreso calculado.
- El objetivo configurado se comparte entre todas las personas que utilicen la aplicación en el mismo dispositivo, al no existir cuentas ni perfiles.
- La aplicación se abre sin almacenamiento disponible o con un error de lectura/escritura: no debe borrar sesiones existentes y debe comunicar, cuando sea posible, que el objetivo no pudo conservarse.
- El navegador rechaza la escritura del objetivo: se muestra «No se ha podido guardar el objetivo», el objetivo no se presenta como persistente, las sesiones quedan intactas y el usuario puede reintentar.
- Hay muchas sesiones válidas acumuladas, dentro de límites seguros: el progreso se calcula sin pérdida de precisión ni desbordamiento y sin modificar los registros.

## Fuera de alcance

- Objetivos diarios, mensuales, anuales o múltiples objetivos simultáneos.
- Objetivos distintos para semanas históricas o futuras.
- Recordatorios, notificaciones, cuentas, sincronización o almacenamiento remoto.
- Editar o borrar sesiones desde esta funcionalidad.
- Restablecer o eliminar el objetivo sin una confirmación explícita.
- Cambiar la definición de semana, excluir manualmente días o incluir sesiones futuras.
- Guardar estadísticas históricas de cumplimiento como datos independientes.
- Añadir recompensas, niveles, rachas nuevas o comparaciones con otras personas.

## Criterios de finalización

- El usuario puede establecer y modificar un objetivo semanal entero entre 1 y 5.040 minutos inclusive.
- El objetivo persiste entre cargas sin perder ni alterar sesiones existentes.
- El progreso suma correctamente las sesiones de la semana local de lunes a domingo y excluye fechas futuras.
- La pantalla distingue claramente entre objetivo no configurado, progreso pendiente y objetivo cumplido o superado.
- La interfaz distingue los estados «sin objetivo», «progreso pendiente», «objetivo cumplido» y «objetivo superado»; al restablecer, vuelve a «sin objetivo».
- El progreso se actualiza tras registrar una sesión y cambia correctamente al pasar a otra semana.
- Las entradas inválidas —cero, negativas, decimales, texto, vacías o superiores a 5.040— no sobrescriben un objetivo válido ni provocan datos negativos o engañosos.
- El usuario puede restablecer o eliminar explícitamente el objetivo, quedando sin configurar sin perder ni modificar sesiones.
- Si el navegador no permite guardar el objetivo, se muestra el mensaje definido, no se presenta como persistente, las sesiones permanecen intactas y es posible reintentar.
- Las sesiones inválidas se ignoran para el progreso y se conservan sin modificaciones.
- Los casos de fechas locales, límites de semana, sesiones múltiples y datos guardados incompatibles están cubiertos por pruebas ejecutables con `node --test`.
- La experiencia funciona en móvil, mantiene los textos en español, no añade dependencias y conserva los datos del usuario.
