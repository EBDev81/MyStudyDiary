# Tareas: Objetivo semanal de estudio

- [x] **T1 (20–30 min): fijar contratos de datos, fechas y persistencia**
  - Documentar `diario-estudio-objetivo-semanal`, JSON entero 1–5040, ausencia como sin objetivo y cualquier otro JSON/tipo/rango como inválido, además de formatos históricos y almacenamiento simulado.
  - RF cubiertos: RF-2, RF-3.
  - **Hecho cuando:** queda claro qué se acepta, qué se ignora y que ningún registro de sesiones se modifica.

- [x] **T2 (20–30 min): validar objetivo y sesiones**
  - Definir pruebas y funciones puras para objetivo 1–5.040 y para fechas/minutos inválidos, incluidos cero, negativos, decimales, `NaN`, infinitos y límites seguros.
  - RF cubiertos: RF-1, RF-2, RF-3, RF-5.
   - **Hecho cuando:** `node --test` cubre todos esos rechazos sin coerción y conserva los registros inválidos.

- [x] **T3 (20–30 min): calcular la semana local**
  - Cubrir lunes-domingo, medianoche, cambio de hora, mes/año, cambio de semana, fechas futuras, sesiones múltiples y volumen seguro con `today` determinista.
  - RF cubiertos: RF-3.
  - **Hecho cuando:** los tests prueban el cálculo local sin `toISOString()`, `new Date('AAAA-MM-DD')` ni UTC y sin mutación.

- [x] **T4 (20–30 min): implementar estados y modelo**
  - Probar ausencia, pendiente, cumplido y superado, incluyendo restantes no negativos, exceso positivo y reinicio derivado al cambiar de semana.
  - RF cubiertos: RF-1, RF-4.
  - **Hecho cuando:** `node --test` demuestra los cuatro estados y el modelo no presenta progreso sin objetivo.

- [x] **T5 (20–30 min): probar persistencia aislada y fallos**
  - Usar almacenamiento simulado para lectura, escritura, modificación, reset, JSON corrupto, tipo inválido, excepciones, recarga/reapertura, objetivo global y reintento fallido seguido de exitoso; verificar sesiones byte por byte intactas.
  - RF cubiertos: RF-1, RF-2, RF-5.
  - **Hecho cuando:** todo fallo conserva exactamente el objetivo anterior, permite reintentar, o deja ausencia solo tras reset confirmado exitoso, y nunca toca sesiones.

- [x] **T6 (20–30 min): preparar estructura y flujo accesible**
  - Añadir controles visibles de alta/modificación y reset con `window.confirm` y texto exacto «¿Quieres restablecer el objetivo semanal?», regiones ARIA y foco/teclado verificables; usar validación exacta «Introduce un número entero entre 1 y 5.040 minutos».
  - RF cubiertos: RF-1, RF-4, RF-5.
  - **Hecho cuando:** distingue estados por texto; validación/errores tienen `role=alert`, éxito/progreso `role=status` y `aria-live=polite`, un anuncio por cambio y cada foco requerido es verificable.

- [x] **T7 (20–30 min): conectar actualización de la interfaz**
  - Integrar carga, alta, modificación, sesión nueva, cambio de semana, recarga/reapertura, objetivo compartido y errores; demostrar reintento exitoso y actualización tras guardar sesión.
  - RF cubiertos: RF-2, RF-3, RF-4, RF-5.
  - **Hecho cuando:** `node --test` cubre modelo/persistencia y Chrome DevTools confirma textos, ARIA, cancelación, éxito, error, reintento y focos.

- [x] **T8 (20–30 min): ajustar responsive y accesibilidad visual**
  - Verificar WCAG AA (4.5:1 texto normal; 3:1 controles/gráficos, incluidos estados y errores), foco, reflujo y mensajes a 375 px.
  - RF cubiertos: RF-4, RF-5.
  - **Hecho cuando:** Chrome DevTools confirma contrastes mínimos, cero desbordamiento, controles visibles y teclado usable en 375 px.

- [x] **T9 (20–30 min): ejecutar puertas y revisión final**
  - Ejecutar `node --test` con almacenamiento simulado y verificar byte a byte que el array de sesiones se conserva idéntico durante lectura, escritura, modificación, restablecimiento y cualquier error; después abrir `index.html` con `file://`, revisar consola, recarga/reapertura, persistencia separada, objetivo global, actualización tras sesión, sesiones intactas, entradas inválidas sin sobrescribir un objetivo válido y todos los flujos sin borrar almacenamiento.
  - RF cubiertos: RF-1, RF-2, RF-3, RF-4, RF-5.
  - **Hecho cuando:** `node --test` está verde como puerta lógica separada, con la conservación byte a byte del array de sesiones en todas las operaciones y errores indicados, y Chrome DevTools cubre interfaz, accesibilidad, foco, entradas inválidas sin sobrescribir un objetivo válido, fallos/reintentos, contraste y móvil.
