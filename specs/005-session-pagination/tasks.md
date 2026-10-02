# Tareas: Paginación de la lista de sesiones

- [x] **T1 (15–25 min): actualizar README antes de tests y código**
  - Documentar máximo de diez sesiones por página, controles `<< < > >>`, ventana máxima de cinco números con ejemplos, verificación responsive a 375 px y verificación con teclado. Revisar coherencia con la spec, `AGENTS.md` y la constitución; conservar la evidencia del diff.
  - RF cubiertos: ninguno; criterio documental independiente.
  - **Hecho cuando:** `README.md` describe el comportamiento público y sus verificaciones, el diff queda revisado y esta tarea está marcada antes de comenzar cualquier test o código.
   - Actualizar `MEMORY.md` al terminar. Evidencia Chrome DevTools: emulación explícita `1440x900x1` y `375x812x1,mobile,touch`; fixtures 0/1/11+, botones 44×44, foco visible, región `#paginacion-anuncio` única, rectángulo interior y scroll mínimo; sin scroll de ventana, overflow ni errores de consola. JSON real intacto.

- [x] **T2 (25–40 min): escribir tests de la vista pura**
  - Añadir cobertura para contrato exacto, vista vacía segura, normalización de `paginaSolicitada`, páginas de diez, flags y referencias originales sin mutación.
  - RF cubiertos: RF-1, RF-4.
  - **Hecho cuando:** los tests expresan los casos límite de tamaño, entrada inválida y conservación de referencias, y fallan únicamente por faltar la implementación esperada.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T3 (30–45 min): escribir tests de orden estable y ventana**
  - Cubrir fechas descendentes, `creado` válido frente a inválido/ausente, empates estables, duplicados, campos desconocidos y ventanas de hasta cinco números en extremos, página 6 y página 8.
  - RF cubiertos: RF-1, RF-2.
  - **Hecho cuando:** `node --test` contiene casos deterministas para toda la fórmula de ventana y el desempate contratado.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T4 (30–45 min): implementar `buildSessionPaginationView`**
  - Implementar la función pura con `pageItems`, `currentPage`, `totalPages`, `visiblePages`, `hasPrevious` y `hasNext`, sin DOM, reloj, red, almacenamiento ni mutación.
  - RF cubiertos: RF-1, RF-2, RF-4.
  - **Hecho cuando:** todos los tests puros pasan con `node --test` y la función devuelve exactamente el contrato para entradas válidas e inválidas.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T5 (25–40 min): añadir estructura de navegación accesible**
  - Incorporar navegación identificable y `#paginacion-anuncio` con su nombre, live region y texto contratado, dejando la lista vacía sin controles visibles ni anuncio activo. Añadir tests automatizados de estructura DOM, lista de diez elementos, `totalPages`, ventana de como máximo cinco números, `aria-current`, estados `disabled` de primera/anterior/siguiente/última, lista vacía y foco tras cambiar de página.
  - RF cubiertos: RF-3, RF-4, RF-5.
  - **Hecho cuando:** el DOM ofrece destinos únicos para lista, controles y anuncio sin reutilizar regiones live existentes; los tests automatizados verifican estructura, diez elementos, `totalPages`, ventana máxima, `aria-current`, los cuatro estados de límite, lista vacía y foco en el botón activo tras cambiar de página; y `node --test` sigue verde.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T6 (35–50 min): separar render y navegación DOM**
  - Renderizar sesiones y controles desde la vista pura; conectar primera, anterior, números, siguiente y última con un handler común, límites semánticos, `aria-current` y no-op de la página actual. Completar tests automatizados de los diez items, `totalPages`, ventana máxima de cinco, `aria-current`, `disabled` en primera/anterior/siguiente/última, activación no-op de la página actual, lista vacía y foco después de cada cambio de página.
  - RF cubiertos: RF-1–RF-4.
  - **Hecho cuando:** cada control navega al destino correcto, no activa destinos inválidos, la página actual no-op no cambia el estado, la lista solo muestra el tramo seleccionado, el foco queda en el botón activo, todos los casos DOM/JS automatizables pasan y la suite permanece verde.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T7 (30–45 min): integrar cambios de datos y estados de error**
  - Reiniciar a página 1 tras alta confirmada; conservar o ajustar la página tras recarga confirmada; volver a vacío cuando corresponda; preservar lista y página ante fallos de escritura o recarga.
  - RF cubiertos: RF-4.
  - **Hecho cuando:** los flujos existentes de carga, alta, objetivo y errores no muestran datos no confirmados ni pierden la página visible indebidamente.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T8 (30–45 min): completar foco, anuncio y scroll interno**
  - Mantener foco en el botón activo, anunciar `Página X de Y`, medir solo el rectángulo interior de `.paginacion-controles` y ajustar `scrollLeft` lo mínimo únicamente si el botón queda fuera de vista.
  - RF cubiertos: RF-3, RF-5.
  - **Hecho cuando:** teclado y activación programática comparten handler, el foco es visible y correcto, no hay scroll de ventana y no hay movimiento si el botón ya está visible.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T9 (25–40 min): ajustar responsive y controles táctiles**
  - Estilizar la navegación para móvil y escritorio, garantizando botones renderizados de al menos 44×44 CSS px, legibilidad, foco visible y ausencia de overflow a 375×812 y 1440×900.
  - RF cubiertos: RF-5.
  - **Hecho cuando:** en Chrome DevTools, explícitamente a 1440×900 y 375×812, cada botón mide al menos 44×44 mediante `getBoundingClientRect`, se inspecciona el rectángulo interior de `.paginacion-controles`, se comprueba si el botón activo está dentro o fuera, `scrollLeft` solo cambia lo mínimo cuando está fuera, no hay scroll de `window` ni overflow y los controles conservan foco visible.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T10 (30–45 min): verificación final RF**
  - Ejecutar `node --test`, revisar sintaxis y verificar con Chrome DevTools servidor, consola, carga, alta, recarga, teclado, foco, anuncios, límites, scroll, escritorio y móvil sin alterar datos persistidos; actualizar `README.md` según T1.
  - RF cubiertos: RF-1–RF-5.
  - **Hecho cuando:** a 1440×900 y 375×812 la evidencia confirma botones de al menos 44×44 por `getBoundingClientRect`, rectángulo interior de `.paginacion-controles`, botón activo dentro/fuera, `scrollLeft` mínimo solo si está fuera, cero scroll de `window`, cero overflow y consola limpia; la matriz RF-1–RF-5 tiene evidencia automática o manual, `node --test` está verde, el README está actualizado y el JSON real permanece intacto. La actualización y revisión del README se conserva como criterio documental independiente.
   - Actualizar `MEMORY.md` al terminar. Evidencia documental: README incluye literalmente `1 2 3 4 5`, `4 5 6 7 8` y `6 7 8 9 10`.
