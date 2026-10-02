# AGENTS.md — Diario de Estudio

Web estática para registrar sesiones de estudio y motivarse viendo la racha de días seguidos. Proyecto didáctico: el código debe poder entenderlo alguien que empieza a programar.

## Stack y estructura

- HTML, CSS y JavaScript puros: sin frameworks, librerías, npm, bundler ni build.
- `index.html` (estructura), `styles.css` (estilos), `app.js` (lógica y datos).
- El modo oficial es ejecutar `node server.js` y abrir `http://localhost:3000`. `file://` ya no ofrece persistencia oficial.
- No usar módulos ES (`type="module"`) ni dependencias externas; el servidor debe usar las APIs nativas de Node.js 18+.

## Convenciones

- Textos de la interfaz en español.
- Código simple, nombres descriptivos y comentarios solo donde aporten.
- Diseño limpio y responsive; cualquier pantalla nueva debe verse bien en el móvil.

## Datos

- `data/data.json` es la fuente de verdad del proyecto y contiene el documento JSON validado de sesiones, objetivo y metadatos.
- `data/data.backup.json` es la copia de seguridad periódica; nunca se restaura automáticamente ni sustituye al principal.
- La migración única lee las claves históricas de `localStorage` únicamente desde el puente temporal, conserva esas claves y solo tras el estado `completed` la aplicación deja de leerlas o escribirlas.
- Nunca cambies ni descartes datos históricos: normaliza formatos compatibles y conserva los campos desconocidos.

## Comandos
- Tests: `node --test`

## Reglas
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código.

## Límites
- ✅ Siempre: respetar las reglas de fechas y racha, mantener los textos en español.
- ✅ Siempre: actualizar `MEMORY.md` al terminar cada tarea.
- ⚠ Pregunta antes: crear archivos nuevos, cambiar el formato de los datos guardados o borrar datos.
- 🚫 Nunca: añadir dependencias, frameworks o un paso de build.

## Fechas y racha (fácil equivocarse)

- Trabaja siempre con la fecha local del usuario. Nunca uses `toISOString()` ni `new Date("AAAA-MM-DD")`: se interpretan en UTC y desplazan el día.
- Racha = días consecutivos con al menos 1 sesión que terminan hoy. Si hoy no hay sesión pero ayer sí, la racha sigue viva y se cuenta desde ayer.
- La mejor racha es la secuencia histórica más larga de fechas consecutivas con al menos una sesión; se calcula al cargar y no se guarda como dato separado.
- Varias sesiones el mismo día cuentan como un solo día. Las fechas futuras no suman.
- El total semanal usa semanas de lunes a domingo, suma los minutos de todas las sesiones de la semana actual, excluye fechas futuras y se calcula al cargar sin guardarse aparte.
- Los días estudiados del mes usan la fecha local actual, cuentan fechas únicas del mes actual, excluyen fechas futuras y se calculan al cargar sin guardarse aparte.

## Forma de trabajar

- Haz solo lo que se pide: no añadas funcionalidades por tu cuenta.
- Cambios pequeños y enfocados; no reescribas lo que ya funciona.
- Nunca borres, reinicies ni sobrescribas datos guardados sin consentimiento explícito del usuario.
- Al terminar, resume qué has cambiado y cualquier decisión que deba revisar.


## Verificación

- Después de cada cambio, ejecuta `node --test` y verifica con el MCP de Chrome DevTools: ejecuta `node server.js`, abre `http://localhost:3000`,
  prueba la funcionalidad, revisa la consola y comprueba la vista móvil.
- Para empezar de cero o eliminar datos guardados hay que pedir confirmación explícita. Nunca borres `data/data.json`, `data/data.backup.json` ni las claves históricas de `localStorage` para probar.

## Memoria

- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualiza `MEMORY.md` con el estado actual, las decisiones importantes y los errores a evitar.
- Mantén `MEMORY.md` breve, con un máximo aproximado de 50 líneas; resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles, como claves, tokens o datos personales.
