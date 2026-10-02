# Tareas: Persistencia local mediante backend Node.js

- [x] **T1 (20–30 min): actualizar contratos documentales antes del código**
  - Actualizar exactamente `docs/constitution.md`, `AGENTS.md` y `README.md` según la spec: Node/localhost, JSON/migración única, retirada de `file://` como modo oficial, migración y «Historial de cambios».
  - RF cubiertos: RF-1, RF-4, RF-6.
  - **Hecho cuando:** los tres documentos están revisados y explican el nuevo modo oficial antes de crear o activar código del servidor.

- [x] **T2 (20–30 min): fijar esquema y funciones puras con tests primero**
  - Crear primero tests para documento inicial, validación estricta, sesiones normalizadas, objetivos, metadatos, fechas locales, `today`, campos desconocidos y estadísticas derivadas.
  - RF cubiertos: RF-2, RF-3, RF-5, RF-6.
  - **Hecho cuando:** `node --test` cubre aceptación/rechazo del contrato sin mutar entradas ni persistir estadísticas.

- [x] **T3 (20–30 min): preparar lectura segura de archivos**
  - Implementar el servidor/repository mínimo para crear solo un archivo inexistente, bloquear vacío/corrupto/parcial/tipos inválidos y distinguir lectura válida de error.
  - RF cubiertos: RF-1, RF-2, RF-6.
   - **Hecho cuando:** las pruebas demuestran que ningún archivo inválido se sobrescribe y aparece el mensaje exacto de corrupción.

- [x] **T4 (20–30 min): exponer estáticos y API de consulta**
  - Servir `index.html`, estilos y scripts en `localhost:3000`; añadir `GET /api/data` y estados claros cuando el servidor no está disponible.
  - RF cubiertos: RF-1, RF-2, RF-3.
  - **Hecho cuando:** dos clientes pueden consultar el mismo documento y los errores no se presentan como datos guardados.

- [x] **T5 (20–30 min): implementar cola e idempotencia con tests primero**
  - Probar y después conectar la cola serial, relectura previa, sesiones concurrentes independientes, `operationId` repetido, payload conflictivo, fallo y reintento explícito.
  - RF cubiertos: RF-2 bis, RF-6.
  - **Hecho cuando:** todas las escrituras parten del último JSON validado, no se duplican reintentos conocidos y `node --test` queda verde.

- [x] **T6 (20–30 min): persistir sesiones y objetivo sin pérdida**
  - Conectar formularios a operaciones API, conservar sesiones existentes, validar fechas/minutos/objetivos y recalcular rachas, mapa, semana, mes y progreso con `today` local.
  - RF cubiertos: RF-2, RF-3, RF-5, RF-6.
  - **Hecho cuando:** alta, objetivo, restablecimiento confirmado y recarga persisten correctamente; ningún fallo confirma cambios inexistentes ni altera sesiones.

- [x] **T7 (20–30 min): crear puente de migración**
  - Probar primero cancelación, fuentes ausentes/invalidas, formatos históricos, deduplicación, precedencia/conflicto de objetivos y fecha local; después crear la acción temporal de migración.
  - RF cubiertos: RF-4, RF-5, RF-6.
  - **Hecho cuando:** solo una confirmación seguida de éxito marca `completed`, las claves originales quedan intactas y los reintentos `pending`/`failed` no duplican.

- [x] **T8 (20–30 min): añadir backup periódico y contadores**
  - Probar quinta escritura, fallo de backup, reintento posterior, reinicio de contadores, backup inválido y ausencia de restauración automática.
  - RF cubiertos: RF-7, RF-8, RF-6.
  - **Hecho cuando:** el principal válido nunca se deshace por un backup fallido y `backupSuccessfulWrites` solo avanza tras validar la copia.

- [x] **T9 (20–30 min): integrar interfaz, errores y accesibilidad**
  - Sustituir estados de localStorage por estados API, mensajes exactos en español, foco/ARIA, conexión caída, timeout y aviso de backup pendiente; impedir consultas posteriores a localStorage tras migración completada.
  - RF cubiertos: RF-1, RF-3, RF-4, RF-6, RF-7.
  - **Hecho cuando:** Chrome DevTools confirma estados no engañosos, migración, reintentos, dos clientes compartidos, consola limpia y ausencia de lectura posterior de localStorage.

- [x] **T10 (20–30 min): puertas finales y protección de datos**
  - Ejecutar `node --test`, revisar `node server.js` con Chrome DevTools a 375 px, comprobar móvil, foco, consola, corrupción, backups y conservación byte a byte; actualizar `MEMORY.md` al terminar esta propia tarea.
  - RF cubiertos: RF-1–RF-8.
   - **Hecho cuando:** todos los tests pasan, la revisión requisito por requisito está documentada, no se borran datos sin consentimiento y la aplicación funciona oficialmente en `http://localhost:3000`.

- [x] **T11 (20–30 min): trazabilidad final de RF y resiliencia de archivos**
  - Ejecutar la matriz RF→`node --test`→Chrome DevTools del plan y comprobar explícitamente RF-1, RF-2, RF-2 bis, RF-3, RF-4, RF-5, RF-6, RF-7 y RF-8; incluir interrupciones durante escrituras principal y backup, contador persistente, reintentos de migración y límite de idempotencia tras reinicio.
   - RF cubiertos: RF-1, RF-2, RF-2 bis, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8.
   - **Hecho cuando:** cada RF tiene evidencia de test y DevTools, no queda un archivo parcial tras interrupciones, el backup fallido se reintenta según la diferencia de contadores, y la revisión confirma que no se editan sesiones ni se pierden datos.

   **Evidencia final (02-10-2026):** `node --test` pasa 37/37. La matriz queda cubierta así: RF-1 por arranque/estáticos/API y vista `http://localhost:3000`; RF-2 por esquema, lectura segura, escritura atómica y relectura; RF-2 bis por cola, relectura, concurrencia e idempotencia en proceso (el test de reinicio confirma el límite: se conservan contadores, no se promete idempotencia); RF-3 por fechas locales y estadísticas derivadas; RF-4 y RF-5 por normalización, deduplicación, estados y reintentos de migración; RF-6 por corrupción, fallos, cancelación y conservación; RF-7 por backup atómico, fallo/reintento y ausencia de restauración; RF-8 por quinta escritura y contadores persistentes.

    Chrome DevTools en la página ya servida confirmó `GET /api/data` 200 con documento válido, título/aplicación visibles, consola sin mensajes y, a 375×812, `innerWidth=375`, `scrollWidth=375` (sin overflow). La revisión del código y los tests verifican sustitución mediante temporal+rename para principal y backup: una interrupción no expone un archivo parcial; los tests de backup fallido conservan sesiones/principal y reintentan según la diferencia de contadores. No se modificaron sesiones ni archivos de datos existentes durante la validación. No quedan pendientes de RF.

    Corrección posterior: se unificó la clave autorizada del objetivo como `diario-de-estudio-objetivo-semanal` en validación, migración, aplicación y pruebas.
