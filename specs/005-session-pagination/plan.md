# Plan: Paginación de la lista de sesiones

## Alcance y archivos

| Archivo | Responsabilidad | RF |
|---|---|---|
| `README.md` | Documentar el máximo de diez sesiones por página, controles `<< < > >>`, ventana de hasta cinco números, ejemplos de ventanas, y verificaciones de teclado y 375 px. | Criterio documental independiente |
| `app.js` | Exponer `buildSessionPaginationView`, conservar el estado de página solo en memoria, ordenar y paginar referencias normalizadas, y coordinar el renderizado y la navegación sin mezclar cálculo con DOM. | RF-1–RF-4 |
| `index.html` | Proporcionar el punto de inserción de la lista, la navegación identificable y `#paginacion-anuncio` con su contrato accesible, sin duplicar regiones de anuncio. | RF-3–RF-5 |
| `styles.css` | Presentar controles legibles y desplazables en móvil, mantener botones de al menos 44×44 CSS px, foco visible y ausencia de overflow en móvil y escritorio. | RF-5 |
| `tests/file-persistence.test.js` o un test dedicado de paginación | Cubrir primero la función pura, orden estable, normalización de página, tamaño de página, ventana numérica, referencias originales y entradas inválidas. | RF-1–RF-2, RF-4 |

No se modifica el formato persistido, el servidor, el backup ni las reglas de fechas, rachas, estadísticas, objetivo o mapa. La página seleccionada vive únicamente en la interfaz y nunca se guarda en el documento.

En este plan, una sesión **normalizada** es un objeto aceptado por la validación v1 que contiene una fecha local válida en formato `AAAA-MM-DD`, un tema de tipo `string`, minutos que son un entero positivo seguro (`Number.isSafeInteger(minutos)` y `minutos > 0`) y, opcionalmente, `creado` cuando es un entero positivo seguro (`Number.isSafeInteger(creado)` y `creado > 0`). Puede conservar campos desconocidos del documento.

## Responsabilidades y flujo

1. `buildSessionPaginationView(sesiones, paginaSolicitada)` validará la forma mínima de entrada, sin mutarla, y devolverá exactamente `{pageItems, currentPage, totalPages, visiblePages, hasPrevious, hasNext}`. Ordenará copias del array por fecha descendente, `creado` válido antes que ausente/ inválido, `creado` válido descendente y finalmente índice de llegada estable; `pageItems` conservará referencias a los registros originales.
2. La función calculará páginas de diez registros y normalizará la página solicitada al rango permitido, con la vista vacía segura para lista o entrada inválida. La ventana será consecutiva, de como máximo cinco números, usando la fórmula definida en la spec e incluyendo siempre la página actual.
3. El renderizado DOM se mantendrá separado de la función pura: leerá la vista, reemplazará solo los elementos de la lista y controles, y no hará que la función de cálculo consulte DOM, red, almacenamiento ni reloj.
4. El estado de UI iniciará en página 1 al cargar; una alta confirmada lo reiniciará a 1; una recarga confirmada conservará la página si sigue siendo válida y la ajustará a la última, o a 0 si queda vacía. Una escritura/recarga fallida conservará lista y página visibles.
5. Los controles de primera, anterior, números, siguiente y última usarán el mismo handler de cambio para teclado, tacto y navegación programática. Los límites serán `disabled`, la página actual será botón enfocable con `aria-current="page"` y no se ejecutará navegación redundante al activarla.
6. El anuncio dedicado será únicamente `#paginacion-anuncio`, con `aria-live`, `aria-label="Paginación de sesiones"` y `Página X de Y`; no se reutilizarán regiones live existentes. La lista vacía ocultará o dejará inerte el anuncio y no renderizará controles.
7. Después de regenerar controles, el foco quedará en el botón de la página activa. Solo se medirá `.paginacion-controles` y su rectángulo interior ajustado por bordes; si el botón activo no es visible, se modificará lo mínimo `scrollLeft`. Nunca se desplazará `window` ni otro contenedor, y si ya es visible no habrá scroll.

## Decisiones y alternativas descartadas

- **Ordenar una copia y devolver referencias originales:** se descarta ordenar `sesiones` directamente, porque mutaría el estado recibido; se descarta clonar cada sesión, porque rompería la conservación de campos y referencias exigida.
- **Una función pura para toda la vista lógica:** se descarta calcular páginas dentro del render DOM, porque impediría tests deterministas y mezclaría lógica con interfaz.
- **Estado de página en memoria:** se descarta persistirlo en JSON, URL o `localStorage`, porque la spec exige empezar en 1 tras recargar y no cambiar el formato de datos.
- **Ventana fija centrada siempre:** se descarta, porque en los extremos debe comenzar en 1 o terminar en `totalPages`; se usará la fórmula determinista aprobada.
- **`scrollIntoView` o scroll de la ventana:** se descarta, porque puede desplazar el documento y ocultar el encabezado; se ajustará solo el `scrollLeft` interno mínimo tras medir.
- **Desactivar la página actual:** se descarta, porque debe seguir siendo enfoc able, tener `aria-current="page"` y no ser redundante al activarse; solo se desactivan controles fuera de rango.
- **Añadir el anuncio a una región live existente:** se descarta, porque `#paginacion-anuncio` debe ser el único propósito de anunciar paginación y las regiones existentes deben conservar sus responsabilidades.

## Funciones puras y contratos

- `buildSessionPaginationView(sesiones, paginaSolicitada)`: recibe solo datos y devuelve exactamente el objeto contratado; no lee la fecha actual, no usa DOM, red ni almacenamiento, no muta entradas y usa el índice de llegada como desempate final.
- Las funciones de fecha y estadísticas existentes siguen recibiendo `hoy` explícito; la paginación no introduce una dependencia del reloj.
- El handler de cambio de página recibirá la página destino y reutilizará el mismo camino para botones, teclado y activaciones programáticas; el cálculo de visibilidad y scroll será una responsabilidad de presentación posterior al render.

## Estrategia de tests (`node --test`)

Los tests se escribirán antes de la implementación y usarán datos en memoria. Cubrirán: cero, uno, nueve, diez y once sesiones; páginas posteriores; orden por fecha; `creado` válido/ inválido/ausente, empates estables, duplicados y campos desconocidos; referencias originales y ausencia de mutación; entradas no array o no normalizadas; páginas no enteras, strings, `NaN`, infinitos y fuera de rango; ventanas de hasta cinco páginas, extremos, página 6 y página 8; flags de navegación y tamaños de página. También habrá pruebas DOM/JS automatizadas donde sea viable para la estructura, los diez elementos, `totalPages`, ventana máxima de cinco, `aria-current`, estados `disabled`, no-op de página actual, lista vacía y foco tras cambiar página. Chrome DevTools aportará evidencia manual de los flujos que dependan del navegador y del layout.

Se conservarán todas las regresiones de `node --test`. Las interacciones DOM se comprobarán manualmente con Chrome DevTools: alta y recarga ajustan la página correctamente, fallos conservan el estado, foco y `aria-current` son correctos, el anuncio no contamina otras regiones live, los límites no se activan, el scroll interno solo se mueve cuando es necesario, la consola queda limpia, y no hay overflow a 1440×900 ni a 375×812 con botones de al menos 44×44.

## Trazabilidad

| RF | Evidencia principal |
|---|---|
| RF-1 | `buildSessionPaginationView`, tests de orden/tamaño/referencias y render exclusivo del tramo seleccionado. |
| RF-2 | Tests de ventana determinista para extremos, intermedios y página 8. |
| RF-3 | Tests e inspección de controles, límites, `aria-current` y handler común. |
| RF-4 | Flujo de alta, recarga, lista vacía, errores y conservación de página; sin persistencia de selección. |
| RF-5 | HTML/estilos, foco, anuncio live, medición de scroll interno y verificación Chrome desktop/móvil. |
| Documentación | README actualizado y revisado, con evidencia de su diff y de la verificación final; este criterio es independiente de RF-1–RF-5. |
