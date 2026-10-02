# Diario de Estudio

## Qué es

Diario de Estudio es una aplicación educativa para registrar sesiones de estudio y convertir el esfuerzo diario en señales visuales de progreso. Su objetivo es que una persona pueda apuntar qué ha estudiado, cuánto tiempo ha dedicado y comprobar si mantiene la constancia.

Repositorio: [github.com/EBDev81/MyStudyDiary](https://github.com/EBDev81/MyStudyDiary)

<img width="962" height="348" alt="image" src="https://github.com/user-attachments/assets/7879c53b-0c46-4dff-a846-002b4b1c6f0a" />
<img width="916" height="432" alt="image" src="https://github.com/user-attachments/assets/dd43d6c6-58e3-486f-aa1c-ad9b0a3c1dbd" />
<img width="914" height="290" alt="image" src="https://github.com/user-attachments/assets/18e26823-2b0c-4e21-8686-e5aba5498c03" />
<img width="918" height="413" alt="image" src="https://github.com/user-attachments/assets/74fe0abe-2a36-4df0-a8ee-f85fb8115053" />

El proyecto está creado y mantenido con **OpenCode** siguiendo un flujo de trabajo **Specification-Driven Development (SDD)**.

La aplicación está pensada para alguien que empieza a programar: no depende de herramientas complejas y se puede leer directamente. El modo oficial se ejecuta con Node.js 18 o posterior.

## Funcionalidades actuales

- Registrar una sesión con fecha, tema y minutos.
- Editar la fecha para registrar sesiones anteriores.
- Mostrar las sesiones ordenadas de la más reciente a la más antigua.
- Mostrar como máximo diez sesiones por página, con controles `<< < > >>`.
- Navegar mediante una ventana consecutiva de hasta cinco números de página, que siempre incluye la página actual.
  Ejemplos literales de ventanas: `1 2 3 4 5`, `4 5 6 7 8` y `6 7 8 9 10`.
- Calcular la racha actual de días consecutivos.
- Calcular la mejor racha histórica.
- Mostrar los minutos estudiados de la semana actual.
- Mostrar los días únicos estudiados del mes actual.
- Mostrar un mapa de calor de las últimas doce semanas.
- Fijar un objetivo semanal de entre 1 y 5.040 minutos.
- Mostrar el progreso del objetivo como pendiente, cumplido o superado.
- Modificar o restablecer el objetivo con confirmación explícita.
- Borrar todas las sesiones desde un botón visible, con confirmación irreversible.
- Conservar los datos entre recargas en el JSON del proyecto.

## Tecnologías

- HTML5 semántico.
- CSS3, Grid, Flexbox, media queries y variables visuales.
- JavaScript moderno sin frameworks.
- Node.js 18+ nativo para el servidor y `node --test`.
- Chrome DevTools para comprobar consola, accesibilidad y responsive.

No se utilizan:

- Frameworks.
- Librerías externas.
- npm ni paquetes instalados.
- TypeScript.
- Bundler o proceso de compilación.
- Base de datos, paquetes externos o build.

## Estructura del proyecto

### Archivos principales

- `index.html`: estructura de la página, formularios, estadísticas, objetivo semanal, mapa de calor y lista de sesiones.
- `styles.css`: identidad visual, layout de escritorio y móvil, botones, tarjetas, estados, foco y accesibilidad visual.
- `app.js`: carga y guardado de datos, lógica de fechas, rachas, estadísticas, objetivo semanal y actualización de la interfaz.
- `server.js`: servidor local, API de persistencia y validación del documento JSON.
- `repository.js`: acceso y operaciones sobre los datos persistidos en JSON.
- `migration.html`: puente temporal para migrar los datos históricos de `localStorage`.
- `data/data.json`: fuente de verdad JSON del proyecto.
- `data/data.backup.json`: copia de seguridad periódica, nunca fuente alternativa ni restauración automática.

### Documentación y reglas

- `README.md`: este resumen general del proyecto.
- `AGENTS.md`: reglas que deben seguir futuras sesiones de OpenCode.
- `MEMORY.md`: memoria breve de decisiones, estado y errores que conviene evitar.
- `docs/constitution.md`: constitución con los principios innegociables del proyecto.

### Especificaciones SDD

El proyecto utiliza Specification-Driven Development (SDD): primero se define qué debe hacer una funcionalidad, después se prepara el plan, luego se divide en tareas y finalmente se implementa.

- `specs/001-heat-map/spec.md`: especificación del mapa de calor.
- `specs/001-heat-map/plan.md`: plan técnico del mapa de calor.
- `specs/001-heat-map/tasks.md`: tareas del mapa de calor.
- `specs/002-weekly-goal/spec.md`: especificación del objetivo semanal.
- `specs/002-weekly-goal/plan.md`: plan técnico del objetivo semanal.
- `specs/002-weekly-goal/tasks.md`: tareas del objetivo semanal.
- `specs/003-file-persistence/spec.md`: especificación de la persistencia local mediante archivo JSON.
- `specs/003-file-persistence/plan.md`: plan técnico de la persistencia local.
- `specs/003-file-persistence/tasks.md`: tareas de la persistencia local.
- `specs/004-clear-main-data/spec.md`: especificación del borrado seguro del estado principal.
- `specs/004-clear-main-data/plan.md`: plan técnico del borrado seguro.
- `specs/004-clear-main-data/tasks.md`: tareas del borrado seguro.

## Agentes utilizados en OpenCode

- `@explore`: localizar y explicar partes del proyecto sin modificar archivos. Se utilizó para encontrar el cálculo de las rachas.
- `@planner`: redactar specs, planes y tareas, y resolver decisiones de especificación.
- `@reviewer`: revisar specs, planes, tareas e implementación como QA, sin modificar código.
- `@implementer`: implementar una tarea concreta, escribir tests primero y detenerse al terminar esa tarea.

El trabajo se coordinó en fases para evitar empezar a programar antes de tener una especificación aprobada:

1. Spec y preguntas de aclaración.
2. Revisión QA de la spec.
3. Plan técnico y tareas.
4. Implementación tarea a tarea.
5. Validación requisito por requisito.

## Skills utilizadas

### `local-dates`

Se utiliza siempre que se trabaja con días, semanas, meses o rachas.

- Las fechas se construyen con `getFullYear()`, `getMonth()` y `getDate()`.
- Las fechas se guardan como `AAAA-MM-DD`.
- No se usa `toISOString()`.
- No se usa `new Date("AAAA-MM-DD")`.
- Para avanzar o retroceder días se usa `setDate()`.
- Se excluyen las fechas futuras cuando corresponde.

### `frontend-design`

Se utilizó para definir una identidad visual específica de cuaderno de progreso:

- Azul tinta para estructura y textos principales.
- Fondo azul niebla para la superficie general.
- Coral para la energía de la racha.
- Verde lima para acciones y progreso.
- Jerarquía visual clara entre objetivo principal y acciones secundarias.
- Diseño responsive para escritorio y móvil.

### `web-design-guidelines`

Se utilizó para revisar y mejorar:

- Labels y asociaciones de formularios.
- Foco visible con `:focus-visible`.
- Skip link para navegación por teclado.
- Mensajes con `role="alert"` y `role="status"`.
- Contraste de textos y controles.
- Estados que no dependen únicamente del color.
- Responsive a 375 píxeles.
- `autocomplete`, placeholders, botones y estados hover.

## Datos y persistencia

### Documento JSON

Las sesiones y el objetivo semanal se guardan en `data/data.json`, un documento validado cuya raíz contiene `version`, `sesiones`, `objetivoSemanal` y `metadata`.

Las estadísticas, rachas, mapa de calor y progreso semanal se calculan al cargar y no se persisten.

Los campos desconocidos del documento se conservan para evitar pérdidas de información.

La copia `data/data.backup.json` representa el último backup válido. No se usa para reparar ni sobrescribir automáticamente el documento principal.

### Migración desde localStorage

La aplicación normal ya no usa `localStorage` como sistema de persistencia.

Para datos procedentes de versiones anteriores se dispone del puente temporal `migration.html`, que debe abrirse desde el contexto del navegador que conserva las claves históricas.

El proceso funciona de la siguiente manera:

1. El puente muestra las fuentes encontradas y pide confirmación explícita.
2. El servidor normaliza y desduplica las sesiones, conservando las claves originales.
3. Solo una migración exitosa marca `metadata.migration.status` como `completed`.

Si la migración se cancela o falla, el estado queda pendiente o fallido y puede reintentarse sin duplicar datos.

Tras quedar marcada como `completed`, la aplicación normal no vuelve a leer ni escribir `localStorage`.

Las claves históricas son:

`diario-de-estudio-sesiones`

El formato actual normalizado de una sesión es:

```js
{
  fecha: "AAAA-MM-DD",
  tema: "Tema estudiado",
  minutos: 45,
  creado: 1234567890
}
```

La migración también puede reconocer el formato histórico:

```js
{
  date: "AAAA-MM-DD",
  topic: "Tema estudiado",
  minutes: 45
}
```

### Objetivo semanal

El objetivo semanal se guarda en `data/data.json` junto con las sesiones, dentro del campo `objetivoSemanal`.

Su valor es un entero entre `1` y `5.040`.

El progreso semanal no se guarda: se calcula dinámicamente a partir de las sesiones existentes.

Reglas importantes:

- Una semana va de lunes a domingo.
- Las sesiones futuras no aumentan el progreso.
- Varias sesiones del mismo día suman todos sus minutos.
- Restablecer el objetivo nunca elimina sesiones.
- Los datos corruptos del objetivo no deben afectar a las sesiones.

### Borrado de sesiones

La aplicación incluye un botón para borrar todas las sesiones de estudio.

Antes de ejecutarlo se muestra una confirmación explícita e irreversible con esta advertencia:

> Vas a borrar todas las sesiones de estudio. Esta acción no se puede deshacer y la copia de seguridad no se borrará. El objetivo semanal se conservará.

La confirmación elimina únicamente las sesiones del documento principal y conserva el objetivo semanal.

`data/data.backup.json` permanece intacto y nunca se utiliza para restaurar automáticamente los datos.

La acción no tiene deshacer.

Si el borrado no puede completarse, la aplicación muestra un error general claro y no presenta la operación como realizada.

Ante una respuesta incierta por desconexión o tiempo de espera, no se reintenta automáticamente: hay que recargar la página y decidir manualmente si se vuelve a intentar.

## Lógica de fechas y estadísticas

La lógica se mantiene separada de la interfaz siempre que es posible.

Las funciones puras reciben `today` para que sus resultados sean deterministas en los tests.

Se calculan dinámicamente:

- Racha actual: días consecutivos que terminan hoy; si hoy no hay sesión pero ayer sí, la racha sigue viva.
- Mejor racha: secuencia histórica más larga de fechas consecutivas.
- Minutos semanales: suma de la semana local actual hasta hoy.
- Días del mes: fechas únicas del mes local actual hasta hoy.
- Mapa de calor: últimos 12 periodos semanales completos, con intensidad por tramos de minutos.
- Objetivo semanal: progreso, minutos restantes o exceso positivo.

## Cómo abrir la aplicación

### Requisitos

- Node.js 18 o posterior.

### Ejecución

1. Clona el repositorio.
2. Abre una terminal en la carpeta `MyStudyDiary`.
3. Ejecuta:

```bash
node server.js
```

4. Abre en el navegador:

```text
http://localhost:3000
```

No se debe usar `file://` como modo oficial, ya que no proporciona la persistencia JSON del proyecto.

## Historial de cambios

### Persistencia local mediante Node.js — spec 003

Se sustituyó `localStorage` como fuente oficial de persistencia por `data/data.json`.

La nueva arquitectura utiliza:

```text
Frontend
   ↓
HTTP / fetch
   ↓
server.js
   ↓
repository.js
   ↓
data/data.json
```

También se incorporó:

- Backup mediante `data/data.backup.json`.
- Validación del documento JSON.
- Migración única desde el antiguo `localStorage`.
- Persistencia independiente del navegador.
- Conservación de los datos entre ejecuciones del servidor.

### Borrado seguro de sesiones — spec 004

Se añadió la posibilidad de borrar todas las sesiones desde la interfaz mediante una acción explícita y confirmada.

El borrado:

- Vacía únicamente las sesiones.
- Conserva el objetivo semanal.
- No elimina el backup.
- No realiza restauraciones automáticas.
- No se reintenta automáticamente en caso de respuesta incierta.

## Comandos y workflow SDD

Los comandos del proyecto están en `.opencode/commands/`:

- `/sdd-constitution`: propone la constitución del proyecto.
- `/sdd-spec`: entrevista y genera una spec.
- `/sdd-clarify`: revisa una spec como QA sin resolver problemas.
- `/sdd-plan`: genera el plan técnico de una spec aprobada.
- `/sdd-tasks`: divide el plan en tareas pequeñas.
- `/sdd-implement`: implementa una sola tarea con tests primero.
- `/sdd-validate`: valida los RF con tests y Chrome DevTools.
- `/sdd-change`: registra cambios sobre una spec existente.
- `/sdd-status`: muestra la fase y el estado de una spec.

Ejemplo de implementación de una tarea:

```text
/sdd-implement 002-weekly-goal T2
```

La regla del proyecto es no avanzar con tests fallidos y no comenzar una tarea posterior antes de cerrar la anterior.

## Verificación

### Tests automáticos

Ejecutar desde la carpeta del proyecto:

```bash
node --test
```

La suite cubre lógica de fechas, rachas, estadísticas, mapa de calor, objetivo semanal, persistencia JSON y borrado de sesiones.

También se puede comprobar la sintaxis de la aplicación con:

```bash
node --check app.js
```

### Chrome DevTools

Después de cambios visuales o funcionales:

1. Ejecutar `node server.js` y abrir `http://localhost:3000` en Chrome.
2. Revisar la consola.
3. Probar formularios y estados de la interfaz.
4. Revisar foco y teclado.
5. Emular `375 × 812` para móvil.
6. Confirmar que no existe overflow horizontal.
7. Comprobar que los datos guardados no se han borrado ni alterado.

Para comprobar manualmente el borrado:

1. Verificar que el botón sea localizable y accesible.
2. Confirmar que la advertencia aparezca antes de ejecutar el borrado.
3. Comprobar que cancelar no modifica ningún dato.
4. Confirmar que ejecutar el borrado deja vacías la lista y las estadísticas de sesiones.
5. Comprobar que el objetivo semanal continúa visible y conserva su valor.
6. Confirmar que la copia de seguridad permanece intacta.
7. Verificar que los errores no anuncien un éxito incorrectamente.
8. Confirmar que no existe reintento automático tras una desconexión o tiempo de espera.
9. Repetir las comprobaciones en escritorio y en una vista móvil de `375 × 812`.
10. Confirmar que la consola permanece limpia y que no existe overflow horizontal.

Para la lista paginada, comprobar además con teclado que el foco sigue el botón de la página activa,
que los límites están desactivados y que se anuncia «Página X de Y». En escritorio y en móvil de
`375 × 812`, verificar que el desplazamiento ocurre solo dentro de los controles de paginación y que
los botones mantienen un objetivo táctil mínimo de 44 × 44 CSS px.

## Protección de datos

Nunca se deben borrar, reiniciar ni sobrescribir datos guardados sin consentimiento explícito del usuario.

No se eliminan sesiones, claves históricas ni archivos JSON para realizar pruebas.

El backup no se restaura automáticamente y un fallo de backup nunca deshace un documento principal válido.
