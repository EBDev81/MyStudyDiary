# Paginación de la lista de sesiones

**Estado: aprobada**

## Contexto y objetivo

La lista de sesiones puede crecer hasta resultar larga y difícil de recorrer. La aplicación ya muestra las sesiones ordenadas de la más reciente a la más antigua, pero necesita limitar la cantidad visible y ofrecer una navegación predecible. Esta especificación define una paginación de diez sesiones por página, con controles accesibles y una ventana compacta de números de página.

La funcionalidad no cambia los datos guardados ni las reglas de fechas, rachas o estadísticas; solo determina qué sesiones se muestran en cada momento. La aprobación de esta spec y del plan es independiente del criterio final del README. Después de aprobar ambos, actualizar o revisar el README será T1 de implementación y deberá marcarse `[x]` en `specs/005-session-pagination/tasks.md`, aportando como evidencia el diff del README con sus secciones actualizadas, antes de comenzar T2 o cualquier test o código.

## Usuarios e historias

- Como estudiante, quiero ver como máximo diez sesiones por página para encontrar información sin recorrer una lista excesivamente larga.
- Como estudiante, quiero que las sesiones más recientes aparezcan primero para consultar rápidamente mi actividad reciente.
- Como estudiante, quiero cambiar de página con controles de primera, anterior, siguiente y última página.
- Como estudiante, quiero ver una ventana de como máximo cinco números que siempre incluya la página actual.
- Como estudiante, quiero navegar por teclado y lector de pantalla sin perder mi posición ni activar controles inválidos.
- Como estudiante, quiero que la paginación siga siendo usable en pantallas pequeñas.

## Alcance

La lista de sesiones se presenta en páginas de 1 a 10 registros: todas las páginas salvo la última tienen diez y la última contiene las sesiones restantes. Debajo de la lista se muestran controles equivalentes a `<< < 1 2 3 4 > >>`, adaptados al número real de páginas. `<<` representa primera página, `<` anterior, `>` siguiente y `>>` última página. Los controles se muestran en español mediante nombres accesibles, aunque sus símbolos puedan conservarse visualmente. Una lista vacía no muestra páginas ni controles.

El orden de los registros es descendente por fecha local (`AAAA-MM-DD`). Para registros con la misma fecha, los que tengan un campo `creado` válido (entero positivo) se ordenan antes que los que no lo tengan; entre los válidos, `creado` se ordena de forma descendente. En todos los empates se conserva el orden estable usando el índice de llegada como último desempate. Nunca se usa la hora actual ni se inventa un valor de `creado`. “Sesiones aceptadas” significa `documento.sesiones` después de la validación v1 y la normalización existente. Esa capa conserva el documento completo y los campos desconocidos; el paginador solo lee `fecha` y `creado` para ordenar y devuelve referencias a los registros normalizados completos, sin clonar, eliminar campos ni alterar el almacenamiento. La paginación no modifica el documento persistido.

La lógica se expone mediante la función pura `buildSessionPaginationView(sesiones, paginaSolicitada)`. No usa DOM, red ni almacenamiento y devuelve exactamente `{pageItems, currentPage, totalPages, visiblePages, hasPrevious, hasNext}`. `pageItems` contiene como máximo diez referencias a las sesiones normalizadas originales; `visiblePages` es un array de enteros de como máximo cinco elementos. Para una lista vacía devuelve `pageItems: []`, `visiblePages: []`, `totalPages: 0`, `currentPage: 0`, `hasPrevious: false` y `hasNext: false`. El renderizado y la interacción permanecen separados de esta función.

`paginaSolicitada` se normaliza así: si no es un `Number.isSafeInteger` o es menor que 1, se usa 1; si supera `totalPages`, se usa `totalPages`; para una lista vacía se usa 0. Strings, `NaN`, `Infinity`, números no enteros y números fuera del rango seguro no son páginas válidas.

Si `buildSessionPaginationView` recibe algo distinto de un array, o alguna entrada que no sea un objeto o no esté normalizada, debe devolver una vista vacía segura (`pageItems: []`, `visiblePages: []`, `totalPages: 0`, `currentPage: 0`, `hasPrevious: false`, `hasNext: false`) sin mutar la entrada. El contrato normal de la aplicación le pasa sesiones v1 ya normalizadas.

## Requisitos funcionales

### RF-1. Tamaño y orden de la página

- **Criterio EARS:** Cuando existan sesiones, la aplicación debe ordenar la lista de la más reciente a la más antigua antes de paginarla.
- **Criterio EARS:** Cuando dos sesiones tengan la misma fecha local y solo una tenga un `creado` válido, la aplicación debe ordenar primero la sesión con `creado` válido.
- **Criterio EARS:** Cuando dos sesiones tengan la misma fecha local y ambas tengan un `creado` válido, la aplicación debe ordenarlas por `creado` entero positivo descendente.
- **Criterio EARS:** Cuando dos sesiones tengan la misma fecha local y ambas carezcan de un `creado` válido, la aplicación debe conservar su orden estable de llegada.
- **Criterio EARS:** Cuando dos sesiones tengan la misma fecha local y el mismo `creado` válido, la aplicación debe conservar su orden estable de llegada, sin usar la hora actual ni inventar valores.
- **Criterio EARS:** Cuando el documento o la API haya aceptado sesiones, el paginador debe recibir y paginar todas esas sesiones, incluidos duplicados, usando las referencias de `documento.sesiones` normalizadas actuales; los campos desconocidos deben conservarse en el documento y no deben descartarse del almacenamiento.
- **Criterio EARS:** Cuando existan más de diez sesiones, la aplicación debe mostrar exactamente como máximo diez sesiones en la página seleccionada y no debe mostrar registros de otra página.
- **Criterio EARS:** Cuando existan entre una y diez sesiones, la aplicación debe mostrar todas en una única página y no debe crear páginas innecesarias.
- **Criterio EARS:** Cuando una página no sea la última, debe contener diez sesiones; la última debe contener las sesiones restantes, entre una y diez.
- **Criterio EARS:** Cuando se cambie de página, las sesiones mostradas deben corresponder exclusivamente al tramo de diez registros de la colección ordenada.
- **Criterio EARS:** Cuando haya entre una y diez sesiones, la aplicación debe mostrar una sola página con todas ellas; cuando haya once sesiones, debe mostrar dos páginas, con diez en la primera y una en la segunda.

### RF-2. Ventana determinista de números

- **Criterio EARS:** Cuando existan páginas, la aplicación debe mostrar como máximo cinco números de página.
- **Criterio EARS:** Cuando el total de páginas sea cinco o menor, la ventana debe mostrar todos los números desde `1` hasta el total.
- **Criterio EARS:** Cuando el total de páginas sea mayor que cinco, la ventana debe tener cinco números consecutivos y debe incluir siempre la página actual.
- **Criterio EARS:** Cuando el total de páginas sea mayor que cinco, la ventana debe calcularse con una regla determinista: el límite inferior será `min(max(1, página actual - 2), total de páginas - 4)` y el límite superior será el límite inferior más cuatro.
- **Criterio EARS:** Cuando se muestre la página 8 con al menos diez páginas, la ventana debe mostrar exactamente `6 7 8 9 10`.
- **Criterio EARS:** Cuando se muestre la página 1, la ventana debe mostrar `1 2 3 4 5` si hay al menos cinco páginas, y solo las páginas existentes si hay menos.
- **Criterio EARS:** Cuando se muestre la página 6, la ventana debe mostrar `4 5 6 7 8` si hay al menos ocho páginas, y solo las páginas existentes si hay menos.
- **Criterio EARS:** Cuando se muestre la página 8, la ventana debe mostrar `6 7 8 9 10` si hay al menos diez páginas, y solo las páginas existentes si hay menos.
- **Criterio EARS:** Cuando la página actual cambie, la ventana debe recalcularse y no debe ocultar nunca esa página.

### RF-3. Navegación y límites

- **Criterio EARS:** Cuando la persona active primera página, la aplicación debe mostrar la página 1.
- **Criterio EARS:** Cuando la persona active anterior, la aplicación debe mostrar la página inmediatamente anterior, salvo que ya esté en la página 1.
- **Criterio EARS:** Cuando la persona active un número, la aplicación debe mostrar exactamente esa página.
- **Criterio EARS:** Cuando la persona active siguiente, la aplicación debe mostrar la página inmediatamente posterior, salvo que ya esté en la última página.
- **Criterio EARS:** Cuando la persona active última página, la aplicación debe mostrar la última página disponible.
- **Criterio EARS:** Cuando la persona esté en la primera página, primera y anterior deben estar desactivados y no deben cambiar el estado.
- **Criterio EARS:** Cuando la persona esté en la última página, siguiente y última deben estar desactivados y no deben cambiar el estado.
- **Criterio EARS:** Cuando la página actual esté activa, su control debe identificarse semánticamente como página actual y no debe iniciar una navegación redundante.
- **Criterio EARS:** Cuando exista una página actual, su número debe ser un botón con `aria-current="page"`; no debe estar desactivado, pero su activación no debe ejecutar navegación redundante.
- **Criterio EARS:** Cuando un control no esté desactivado, debe poder recibir el foco; primera y anterior deben estar desactivados en la primera página, y siguiente y última en la última.

### RF-4. Lista vacía y cambios de datos

- **Criterio EARS:** Cuando no existan sesiones, la aplicación debe mostrar el estado vacío actual, no debe mostrar controles de paginación y la vista debe devolver `currentPage: 0` y `totalPages: 0`.
- **Criterio EARS:** Cuando se confirme una alta, la aplicación debe recalcular la lista desde el documento confirmado y volver a la página 1.
- **Criterio EARS:** Cuando se produzca una recarga externa confirmada, la aplicación debe conservar la página actual si sigue dentro del nuevo total y ajustarla a la última página si deja de ser válida; si no quedan sesiones, debe volver al estado vacío sin controles y con `currentPage: 0`.
- **Criterio EARS:** Cuando se recargue la aplicación, la paginación debe comenzar en la página 1 y calcularse de nuevo a partir de las sesiones cargadas, sin persistir la página en el documento.
- **Criterio EARS:** Cuando una alta se confirme correctamente, la aplicación debe volver siempre a la página 1 y recalcular la lista desde el documento confirmado.
- **Criterio EARS:** Cuando se actualice o restablezca correctamente el objetivo, la aplicación debe conservar la página seleccionada y no debe alterar las sesiones ni la paginación.
- **Criterio EARS:** Cuando falle una escritura o una recarga de datos, la aplicación no debe presentar una página calculada con datos no confirmados ni descartar el estado conocido por causa de la paginación.
- **Criterio EARS:** Cuando una recarga falle o su respuesta sea incierta, la aplicación debe conservar el último estado visible, incluida su página, y mostrar el error existente.

### RF-5. Accesibilidad, teclado y responsive

- **Criterio EARS:** Cuando existan controles de paginación, deben agruparse en una navegación identificable y tener un nombre accesible en español que indique que permite cambiar de página.
- **Criterio EARS:** Cuando existan controles de paginación, `#paginacion-anuncio` debe ser el único elemento de la página cuyo propósito sea anunciar la paginación, tener `aria-live`, `aria-label="Paginación de sesiones"` y texto `Página X de Y`; las regiones `aria-live` existentes deben seguir anunciando exclusivamente sus propios estados y nunca recibir el texto `Página X de Y`.
- **Criterio EARS:** Cuando no existan sesiones, `#paginacion-anuncio` puede existir oculto o inerte con texto vacío, pero no deben mostrarse controles ni un bloque o anuncio de paginación.
- **Criterio EARS:** Cuando un control tenga solo un símbolo visual, debe proporcionar un nombre accesible explícito: primera página, página anterior, página N, página siguiente o última página.
- **Criterio EARS:** Cuando una página esté seleccionada, su control debe exponer la página actual mediante el estado semántico apropiado y debe comunicar el total de páginas de forma comprensible.
- **Criterio EARS:** Cuando una persona use teclado, todos los controles deben poder enfocarse y activarse con el teclado, en un orden lógico, con foco visible y sin depender del puntero.
- **Criterio EARS:** Cuando se active un control de paginación con teclado o tacto, la lista actualizada debe conservar un foco comprensible y no debe provocar un desplazamiento inesperado que oculte la navegación o el encabezado de la lista.
- **Criterio EARS:** Cuando cambie la página, el foco debe permanecer en el botón de la página activada y el único elemento `aria-live` dedicado a paginación, `#paginacion-anuncio`, debe anunciar `Página X de Y`, sin desplazamiento inesperado.
- **Criterio EARS:** Cuando cambie la página, el contenedor desplazable será exclusivamente `.paginacion-controles`; su rectángulo interior será su `getBoundingClientRect()` ajustado por sus bordes, y un botón será visible si su rectángulo está dentro de ese rectángulo interior. La navegación por teclado y programática debe usar el mismo handler de cambio y la misma regla. Solo si no lo está, la aplicación debe ajustar `scrollLeft` lo mínimo necesario para mostrarlo; no debe desplazar `window` ni ningún otro elemento.
- **Criterio EARS:** Cuando se regeneren los botones, la aplicación debe medirlos después del render y ajustar `scrollLeft` al mínimo únicamente si el botón activo queda fuera del rectángulo interior.
- **Criterio EARS:** Cuando cambie la página y el botón activo ya sea visible dentro del contenedor de paginación, la aplicación no debe realizar ningún desplazamiento.
- **Criterio EARS:** Cuando un control esté en un límite, debe estar desactivado semánticamente y no debe poder activarse por teclado ni tacto.
- **Criterio EARS:** Cuando la interfaz se muestre en una pantalla móvil, los controles deben permanecer legibles, alcanzar su objetivo táctil y no producir desbordamiento horizontal.
- **Criterio EARS:** Cuando la interfaz se muestre a 375×812 px, cada botón renderizado, incluidos los desactivados, debe medir al menos 44×44 CSS px según `getBoundingClientRect().width` y `.height`, incluyendo padding y borde; las transformaciones no pueden reducir esa medida y el contenedor desplazable no afecta al tamaño del botón. Los números fuera de la ventana no se renderizan y no requieren área táctil. Los controles deben permanecer dentro del área visible sin ocultar navegación; en escritorio también deben conservar el foco visible y no producir overflow.

## Casos límite y errores

- Cero sesiones: estado vacío, ningún control, `currentPage: 0` y `totalPages: 0`.
- Una sesión o exactamente diez sesiones: una sola página, sin navegación habilitada.
- Nueve sesiones: una página con nueve; diez sesiones: una página con diez; once sesiones: dos páginas, con diez y una.
- Total de páginas exactamente cinco: se muestran los cinco números.
- Más de cinco páginas en la primera: la ventana comienza en 1.
- Más de cinco páginas en la última: la ventana termina en la última página.
- Página intermedia con al menos diez páginas: la ventana se centra según la fórmula definida; para la página 8 es `6 7 8 9 10`.
- Recarga externa que reduzca el total de páginas: se conserva la página si sigue siendo válida y, si no, se ajusta a la última válida; una alta confirmada vuelve a la página 1.
- Añadido que aumente el total de páginas: se conserva la página actual si sigue siendo válida.
- Fechas iguales: los registros con `creado` entero positivo válido preceden a los que no lo tienen; entre válidos se ordena de mayor a menor; entre inválidos y ante valores válidos iguales se conserva el orden estable de llegada.
- Fechas futuras, sesiones duplicadas o campos desconocidos: las sesiones aceptadas son exactamente `documento.sesiones` tras validación v1 y normalización existente. La capa de datos conserva el documento completo y todos sus campos; el paginador solo lee `fecha` y `creado` para ordenar, y `pageItems` devuelve las referencias completas originales sin clonar ni eliminar campos. Las sesiones inválidas no llegan al paginador.
- Cambio de página con botón activo fuera de vista: solo se ajusta el scroll interno mínimo del contenedor de paginación; no se desplaza la página completa ni se enfoca fuera del bloque. Si el botón ya es visible, no hay scroll.
- Activación repetida de la página actual o de un control desactivado: no cambia la lista ni genera un error visible.
- Fallo o incertidumbre de escritura: se conserva la lista y página anteriores. Fallo de recarga: se conserva el último estado visible y se muestra el error existente.

## Fuera de alcance

- Cambiar el formato o el contenido del documento JSON o añadir selección masiva.
- Cambiar las reglas de ordenación, fechas locales, rachas, estadísticas, mapa de calor u objetivo semanal.
- Persistir la página actual, compartirla entre recargas o sincronizarla entre ventanas/dispositivos.
- Añadir búsqueda, filtros, ordenación elegible, carga infinita o navegación por URL.
- Mostrar más de cinco números de página o una ventana distinta de la regla definida.

## Requisitos de documentación

 - **Criterio EARS:** Como entregable obligatorio de la primera tarea de implementación, `README.md` debe describir que la lista usa como máximo diez sesiones por página, los controles `<< < > >>`, la ventana máxima de cinco números y ejemplos de sus ventanas, además de incluir la verificación responsive a 375 px y la verificación con teclado; la documentación debe describir la funcionalidad, no necesita listar la spec 005.

## Criterios de finalización

### Contratos obligatorios de revisión

- `creado` solo es válido cuando `typeof creado === "number"`, `Number.isSafeInteger(creado)` es verdadero y `creado > 0`. `0`, negativos, decimales, `Infinity`, `NaN`, números fuera del rango seguro, strings, `null` y el campo ausente son inválidos.
  - `buildSessionPaginationView(sesiones, paginaSolicitada)` recibe normalmente `documento.sesiones` después de validación v1 y normalización existente. Si recibe algo distinto de un array o entradas no objeto/no normalizadas, devuelve la vista vacía segura sin mutar la entrada. Es pura y no usa DOM, red ni almacenamiento; devuelve exactamente `{pageItems, currentPage, totalPages, visiblePages, hasPrevious, hasNext}`. `pageItems` contiene como máximo diez referencias originales, sin clonar ni eliminar campos; los campos desconocidos se conservan en el documento y el paginador solo lee `fecha` y `creado` para ordenar.
- Los controles desactivados son la única excepción a la regla de foco: primera/anterior solo son enfocables cuando no están desactivados, y siguiente/última solo son enfocables cuando no están desactivados. La página actual es siempre un botón enfocable, con `aria-current="page"` y no desactivado.
  - Una alta de sesión confirmada fija siempre la página 1. Una recarga externa confirmada conserva la página solo si sigue dentro del total; en caso contrario la ajusta a la última válida. Una lista vacía fija `currentPage: 0`; una recarga inicial comienza en la página 1.
  - `#paginacion-anuncio` es el único elemento cuyo propósito es anunciar paginación; las regiones existentes anuncian sus propios estados y nunca «Página X de Y». En vacío puede estar oculto o inerte con texto vacío y no se muestran controles ni anuncio.
  - A 375×812 px cada botón renderizado mide al menos 44×44 CSS px según `getBoundingClientRect()`, incluyendo padding y borde; a 1440×900 tampoco hay overflow. Tras cambiar página, `document.activeElement` es el botón de página activa; solo se permite el scroll interno mínimo del contenedor, calculado con su rectángulo interior ajustado por bordes, si el botón no era visible.
  - Después de aprobar la spec y el plan, T1 consiste en actualizar o revisar `README.md`; se marca `[x]` en `specs/005-session-pagination/tasks.md` solo después de aprobar ambos y antes de T2. La evidencia del diff del README enumera sus secciones actualizadas; no se exige un test concreto. La aprobación de esta spec y del plan es independiente del criterio final del README.

- La lista ordenada muestra como máximo diez sesiones por página y el último tramo muestra solo las restantes.
- La ventana numérica nunca supera cinco elementos, es consecutiva, determinista e incluye la página actual.
- Primera, anterior, números, siguiente y última funcionan y respetan sus límites.
- La página vacía no muestra paginación; los cambios de datos recalculan y ajustan la página sin mostrar datos no confirmados.
- La selección no se persiste y la recarga comienza en la página 1.
- Los controles tienen nombres accesibles, estado de página actual, foco visible, soporte de teclado, límites semánticos y diseño móvil sin overflow.
- `README.md` está actualizado con el comportamiento público de esta funcionalidad.
- La lógica relevante queda cubierta por tests ejecutables con `node --test`; la interfaz se verifica en escritorio y a 375 px, con consola limpia y sin desbordamiento horizontal.
