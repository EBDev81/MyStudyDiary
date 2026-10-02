# Tareas: Borrado seguro del estado principal

- [x] **T1 (15–25 min): actualizar documentación antes del código**
  - Actualizar `README.md` con botón, advertencia exacta, confirmación irreversible, sesiones borradas, objetivo conservado, backup intacto, errores generales, nota breve de no reintento automático y comprobación manual; revisar coherencia con `AGENTS.md` y `docs/constitution.md`.
  - RF cubiertos: RF-1–RF-6.
  - **Hecho cuando:** README es coherente, no documenta contratos HTTP internos, y el cambio queda revisado antes de tocar implementación.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T2 (25–40 min): fijar el contrato del repositorio con tests primero**
  - Probar la raíz exacta `{type, operationId, confirmation}`, orden irrelevante, rechazo de campos adicionales/valores inválidos y fingerprints/idempotencia.
  - RF cubiertos: RF-2, RF-4.
  - **Hecho cuando:** `node --test` demuestra aceptación únicamente del contrato permitido y rechaza sin mutación todo payload alternativo.
   - Actualizar `MEMORY.md` al terminar.

- [x] **T3 (30–45 min): implementar el borrado puro y el flujo de repositorio**
  - Probar y conectar construcción de `sesiones: []`, conservación del objetivo/metadatos/campos desconocidos, eliminación completa de campos de sesión y `deletedSessions`; añadir cola, relectura y escritura atómica sin contadores ni backup.
  - RF cubiertos: RF-3, RF-4, RF-6.
  - **Hecho cuando:** el resultado válido conserva el contrato raíz, el principal se valida tras escribir y `node --test` queda verde.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T4 (30–45 min): cubrir fallos, backup e idempotencia del repositorio**
  - Añadir casos de sesiones vacías, objetivo ausente, principal ausente/corrupto, backup válido/antiguo/corrupto/ausente byte a byte, contadores sin cambio, escritura fallida, relectura fallida, sustitución sin rollback, repetición y conflicto de `operationId`.
  - RF cubiertos: RF-3, RF-4, RF-6.
  - **Hecho cuando:** se devuelven las condiciones diferenciadas exactas, ningún fallo previo muta archivos y el backup permanece idéntico.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T5 (20–30 min): exponer la API con respuestas exactas**
  - Integrar `clear-main-data` en `POST /api/operations`, mapear éxito y todos los errores (`INVALID_CLEAR_REQUEST`, `IDEMPOTENCY_CONFLICT`, `MAIN_DATA_MISSING`, `DATA_CORRUPT`, `CLEAR_WRITE_FAILED`) al contrato exacto y mantener extras ignorables solo en respuestas.
  - RF cubiertos: RF-2, RF-4, RF-6.
  - **Hecho cuando:** tests de servidor verifican status, forma, códigos y mensajes, sin confundir error con éxito ni crear un principal ausente.
  - Actualizar `MEMORY.md` al terminar.

- [x] **T6 (30–45 min): añadir acción y diálogo accesible**
  - Incorporar botón, `alertdialog`, advertencia literal, títulos/nombres exactos, ARIA, foco inicial/retorno, Escape, cancelación y estilos de foco/responsive.
  - RF cubiertos: RF-1, RF-2.
  - **Hecho cuando:** teclado, lector de pantalla conceptual y móvil pueden comprender, cancelar o confirmar sin mutar accidentalmente.
   - Actualizar `MEMORY.md` al terminar.

- [x] **T7 (35–50 min): integrar ejecución, bloqueo y estados de interfaz**
  - Enviar solo el contrato permitido con `operationId` nuevo, bloquear todos los controles durante la operación, mostrar «Borrado en curso…», tratar respuestas malformadas como `UNEXPECTED_RESPONSE`, cerrar/desbloquear/focalizar y no reintentar ante timeout o desconexión.
  - RF cubiertos: RF-2, RF-4, RF-5, RF-6.
  - **Hecho cuando:** éxito, error, cancelación, timeout y respuesta desconocida tienen mensajes y focos exactos, sin afirmación engañosa.
   - Actualizar `MEMORY.md` al terminar.

- [x] **T8 (25–40 min): recarga, estadísticas y validación final**
  - Tras éxito recargar el documento, anunciar exactamente `Se han borrado {deletedSessions} sesiones. La copia de seguridad se ha conservado.`, derivar `backupPending`, mostrar lista/racha/estadísticas/mapa a cero y objetivo con progreso cero; ejecutar `node --test` y verificar Chrome DevTools desktop/móvil, consola y overflow.
  - RF cubiertos: RF-3, RF-5, RF-6.
  - **Hecho cuando:** toda la matriz RF tiene evidencia, la recarga refleja el estado persistido real, no se modifica el backup y no quedan regresiones.
  - Actualizar `MEMORY.md` al terminar.
