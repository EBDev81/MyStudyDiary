# Tareas — Mapa de calor

Tareas ordenadas por dependencia. Cada tarea debe ser pequeña y durar aproximadamente 20–30 minutos.

- [x] **T1. Preparar la separación de la lógica pura** — RF-1, RF-2, RF-3, RF-5
  - Extraer en `app.js` la zona de funciones que no depende del DOM ni de `localStorage`, preparada para recibir `today`.
  - **Hecho cuando:** las funciones de fechas y estadísticas pueden invocarse con una fecha explícita sin leer el navegador.

- [x] **T2. Implementar las utilidades de fecha local** — RF-1
  - Crear `formatLocalDate`, `parseLocalDate` y las operaciones locales necesarias para sumar o restar días.
  - **Hecho cuando:** no se usa UTC, `toISOString()` ni milisegundos, y las fechas de prueba conservan su día local.

- [x] **T3. Implementar el cálculo del periodo visible** — RF-1
  - Calcular las últimas doce semanas completas, de lunes a domingo, incluida la semana actual.
  - Preparar las semanas en columnas y los días de lunes a domingo en filas.
  - **Hecho cuando:** el periodo siempre contiene exactamente 12 semanas y 84 días, incluso al cambiar de mes o año.

- [x] **T4. Implementar la agregación diaria** — RF-2, RF-5
  - Sumar los minutos de varias sesiones de la misma fecha y conservar fuera del cálculo los datos inválidos.
  - Mantener la compatibilidad con `fecha`/`date` y `minutos`/`minutes`.
  - **Hecho cuando:** cada fecha válida tiene un único total y ninguna sesión guardada se modifica o elimina.

- [x] **T5. Implementar los niveles de intensidad** — RF-3
  - Aplicar los tramos 0, 1–30, 31–60, 61–120 y más de 120 minutos.
  - Clasificar fechas futuras como sin actividad.
  - **Hecho cuando:** los límites 0, 1, 30, 31, 60, 61, 120 y 121 producen exactamente el nivel esperado.

- [x] **T6. Construir los datos completos del mapa** — RF-1, RF-2, RF-3, RF-4
  - Combinar periodo, totales diarios, fechas futuras, intensidad y etiquetas de cada celda.
  - **Hecho cuando:** cada celda del periodo tiene fecha, total, estado visual y etiqueta; los huecos fuera del periodo se distinguen como vacíos.

- [x] **T7. Crear las pruebas de lógica con `node --test`** — RF-1, RF-2, RF-3, RF-5
  - Cubrir límites del periodo, cambios de año, meses con distinto número de días, sesiones duplicadas por fecha, datos inválidos y fechas futuras.
  - **Hecho cuando:** `node --test` ejecuta todas las pruebas sin dependencias y no hay pruebas fallidas.

- [x] **T8. Añadir la estructura accesible del mapa** — RF-1, RF-4
  - Añadir el contenedor, la leyenda y la estructura de columnas semanales con filas de lunes a domingo.
  - **Hecho cuando:** la interfaz contiene un lugar identificable para el mapa y la leyenda explica los cinco estados en español.

- [x] **T9. Pintar las celdas y sus etiquetas** — RF-3, RF-4
  - Renderizar cada celda con su estado, fecha en `DD/MM/AAAA`, minutos y texto emergente accesible.
  - **Hecho cuando:** una persona puede identificar una fecha y sus minutos sin depender únicamente del color.

- [x] **T10. Adaptar el mapa a móvil y teclado** — RF-4
  - Mantener el orden semanal, permitir desplazamiento horizontal controlado y conservar foco y etiquetas accesibles.
  - **Hecho cuando:** el mapa sigue siendo comprensible a 375 px, con zoom aumentado y navegación por teclado.

- [x] **T11. Integrar la actualización con la aplicación** — RF-5
  - Generar el mapa al cargar y después de registrar una sesión, sin guardar estadísticas derivadas.
  - **Hecho cuando:** una sesión nueva actualiza el mapa inmediatamente y el recargado lo reconstruye desde las sesiones guardadas.

- [x] **T12. Verificación final en Chrome DevTools** — RF-1, RF-2, RF-3, RF-4, RF-5
  - Comprobar consola, datos existentes, fechas futuras, límites visuales y vista móvil sin borrar `localStorage`.
  - **Hecho cuando:** `node --test` está en verde, la consola no tiene errores y todos los criterios de finalización de `spec.md` están comprobados.
