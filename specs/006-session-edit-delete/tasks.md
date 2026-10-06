# Tareas: editar y borrar una sesión individual

Regla de dependencia: cada tarea empieza solo si la anterior terminó verde. Al terminar cada tarea se ejecuta `node --test`; si falla, se detiene el flujo y no empieza la siguiente. Tests-first puede dejar tests rojos temporalmente dentro de una tarea, pero no se cierra ni se avanza hasta volver a verde. Toda tarea de integración funcional incluye Chrome DevTools cuando sea aplicable. `README.md` y documentación pública solo se modifican en T10; `MEMORY.md` se actualiza tras cada tarea como excepción de documentación operativa.

- [x] **T1: lectura y comprensión inicial**
  - Leer AGENTS.md, docs/constitution.md, MEMORY.md, README.md, specs 003/005/006, código afectado y tests; registrar esa comprensión únicamente en el resultado de T1 y en MEMORY.md, sin tocar README ni otros documentos públicos.
  - RF cubiertos: RF-10.
  - **Hecho cuando:** la lectura y comprensión quedan registradas únicamente en el resultado de T1 y MEMORY.md, no se modifican README ni otros documentos públicos, y `node --test` está verde.

- [x] **T2: escribir tests puros de normalización e identificadores**
  - Cubrir clasificación, IDs, `nextSessionId`, `creado`, desconocidos, migración y backup intactos.
  - RF cubiertos: RF-1.
  - **Hecho cuando:** tests primero quedan implementados y `node --test` vuelve verde; Chrome si aplica; actualizar MEMORY.

- [x] **T3: tests de operaciones, cola e idempotencia**
  - Fijar contratos, edición/borrado por ID, errores, concurrencia y respuestas repetidas/conflictivas.
  - RF cubiertos: RF-2–RF-5.
  - **Hecho cuando:** tests y regresiones están verdes; actualizar MEMORY.

- [x] **T4: implementar normalización y repositorio/API**
  - Implementar autoridad del servidor, cola, operaciones, persistencia atómica y opción A de backup.
  - RF cubiertos: RF-1–RF-6.
  - **Hecho cuando:** `node --test` y sintaxis aplicable están verdes, y Chrome DevTools verifica la integración básica; actualizar MEMORY.

- [x] **T5: implementar UI de edición**
  - Añadir modal, validación, foco, bloqueo, integridad y recarga contratada.
  - RF cubiertos: RF-2, RF-3, RF-7, RF-9.
  - **Hecho cuando:** tests verdes y Chrome DevTools verifica el flujo básico; actualizar MEMORY.

- [x] **T6: implementar UI de borrado individual**
  - Reutilizar el diálogo, confirmar, cancelar, gestionar Escape y eliminar solo el ID.
  - RF cubiertos: RF-2, RF-4, RF-9.
  - **Hecho cuando:** tests verdes y Chrome DevTools verifica confirmación/cancelación/error; actualizar MEMORY.

- [x] **T7: integrar paginación, orden y derivados**
  - Aplicar desempate por ID, ajuste de página e integridad de sesión; mantener los cálculos derivados en funciones puras con `hoy`.
  - RF cubiertos: RF-7, RF-8.
  - **Hecho cuando:** tests verdes y Chrome DevTools verifica la integración visual aplicable; actualizar MEMORY.

- [x] **T8: accesibilidad y responsive**
  - Verificar foco, ARIA, teclado, tacto, meses locales, 44×44, 1440×900 y 375×812.
  - RF cubiertos: RF-4, RF-9.
  - **Hecho cuando:** evidencia Chrome confirma consola limpia y sin overflow; `node --test` verde; actualizar MEMORY.

- [x] **T9: validación técnica previa a documentación**
  - Revisar matriz funcional y contratos sin modificar README ni documentación.
  - RF cubiertos: RF-1–RF-9.
  - **Hecho cuando:** tests, sintaxis y verificaciones aplicables están verdes; actualizar MEMORY.

- [x] **T10: documentación y revisión final**
  - Solo ahora actualizar/revisar README y documentación; ejecutar tests, sintaxis y revisión Chrome completa en escritorio y móvil, sin alterar datos.
  - RF cubiertos: RF-1–RF-10.
   - **Hecho cuando:** README/documentación coherentes, matriz completa trazable, `node --test` y sintaxis verdes, Chrome DevTools completo y MEMORY verificado.
   - Evidencia: regresión GET normaliza documentos legados antes de exponerlos (`70/70` tests); `node --check app.js server.js repository.js` verde. DevTools comprobó carga, IDs no indefinidos tras normalización, lista, consola limpia y sin overflow en 1440×900×1 y móvil táctil (la herramienta reportó 414×897 pese a solicitar 375×812). Los JSON reales se restauraron byte a byte tras la revisión.
