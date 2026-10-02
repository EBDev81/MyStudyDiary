# Mapa de calor de estudio

## Contexto y objetivo

Diario de Estudio necesita una representación visual que permita reconocer rápidamente qué días se ha estudiado y con qué intensidad. El objetivo es mostrar un mapa de calor inspirado en GitHub para motivar la constancia y detectar patrones de estudio.

## Usuarios

Personas que registran sus sesiones de estudio y quieren revisar visualmente su actividad reciente sin interpretar tablas ni cálculos complejos.

## Historias de usuario

- Como estudiante, quiero ver mis días estudiados en un calendario visual para reconocer mi constancia.
- Como estudiante, quiero distinguir los días con más minutos para identificar mis jornadas de mayor esfuerzo.
- Como estudiante, quiero consultar las últimas doce semanas para revisar mi actividad reciente.

## Requisitos funcionales

### RF-1. Periodo visible

El mapa debe mostrar las últimas doce semanas naturales completas, de lunes a domingo, incluida la semana actual.

- **Criterio EARS:** Cuando el usuario consulte el mapa, el sistema debe mostrar 84 celdas, desde el lunes de hace once semanas hasta el domingo de la semana actual.
- **Criterio EARS:** Cuando una celda corresponda a una fecha futura respecto al día local actual, el sistema debe mostrarla sin actividad.
- Las celdas se organizan en columnas semanales y filas de lunes a domingo; las celdas fuera del periodo visible quedan vacías.

### RF-2. Actividad diaria

El mapa debe representar los minutos totales estudiados en cada fecha del periodo.

- **Criterio EARS:** Cuando existan una o más sesiones en una fecha, el sistema debe sumar los minutos de todas esas sesiones para determinar la actividad diaria.
- **Criterio EARS:** Cuando no existan sesiones en una fecha, el sistema debe representarla como un día sin actividad.

### RF-3. Intensidad visual

La intensidad debe utilizar cinco estados visuales, incluido el estado sin actividad:

- 0 minutos: sin actividad, gris claro.
- 1–30 minutos: intensidad baja.
- 31–60 minutos: intensidad media-baja.
- 61–120 minutos: intensidad media-alta.
- Más de 120 minutos: intensidad alta.

- **Criterio EARS:** Cuando el total diario esté dentro de un tramo, el sistema debe aplicar únicamente el nivel visual correspondiente a ese tramo.
- **Criterio EARS:** Cuando el total diario sea cero o la fecha sea futura, el sistema debe mostrar el estado gris claro sin actividad.

### RF-4. Comprensión del mapa

El mapa debe permitir relacionar cada celda con su fecha y sus minutos estudiados.

- **Criterio EARS:** Cuando el usuario consulte una celda, el sistema debe poder comunicar su fecha y el total de minutos asociado mediante una etiqueta o información equivalente.
- **Criterio EARS:** Cuando el mapa se muestre en una pantalla estrecha, el sistema debe conservar la asociación visual entre cada celda y su periodo.
- Cada celda debe tener una etiqueta accesible y un texto emergente con la fecha en formato `DD/MM/AAAA` y los minutos totales; en fechas futuras debe indicar `Sin actividad`.

### RF-5. Actualización

El mapa debe reflejar las sesiones guardadas sin almacenar estadísticas derivadas por separado.

- **Criterio EARS:** Cuando el usuario cargue la aplicación o registre una sesión, el sistema debe recalcular el mapa usando las sesiones disponibles.

## Requisitos no funcionales

- La visualización debe ser comprensible sin depender únicamente del color; debe incluir fechas, etiquetas o información equivalente.
- El mapa debe funcionar con fechas locales y no desplazar sesiones por diferencias horarias.
- La interfaz y la documentación deben estar en español.
- El mapa debe seguir siendo usable en móvil y con teclado.
- La funcionalidad no debe modificar ni eliminar sesiones existentes.
- Los registros inválidos o incompletos no deben romper el mapa ni transformarse en actividad; deben ignorarse para este cálculo y conservarse sin modificaciones.
- La leyenda debe explicar los cinco estados de intensidad y el mapa no debe depender solo del color para comunicar actividad.

## Casos límite

- Varias sesiones en una fecha se suman antes de elegir la intensidad.
- Una fecha con exactamente 30 minutos pertenece al tramo bajo; con 31, al tramo medio-bajo.
- Una fecha con exactamente 60 minutos pertenece al tramo medio-bajo; con 61, al tramo medio-alto.
- Una fecha con exactamente 120 minutos pertenece al tramo medio-alto; con 121, al tramo alto.
- Si no hay sesiones, todo el mapa aparece sin actividad.
- La semana actual puede contener fechas futuras, que permanecen visibles pero sin actividad.
- Las sesiones anteriores a las últimas doce semanas no aparecen en el mapa, aunque siguen conservadas.
- Las sesiones con fecha válida pero datos de minutos no numéricos, cero o negativos no generan actividad en el mapa.
- El cambio de hora local no altera la fecha asignada a una sesión.
- El cambio de semana, mes o año se refleja al volver a cargar la aplicación.
- Las celdas futuras y las celdas pasadas sin sesiones usan el mismo gris de ausencia de actividad, pero sus etiquetas indican la fecha correspondiente.

## Fuera de alcance

- Cambiar, borrar o editar sesiones desde el mapa.
- Mostrar meses históricos o permitir navegar entre meses.
- Comparar la actividad con otros usuarios.
- Crear objetivos, notificaciones, rachas nuevas o estadísticas adicionales.
- Cambiar los tramos de intensidad desde la interfaz.

## Criterios de finalización

- El mapa muestra correctamente las últimas doce semanas completas.
- Las sesiones del mismo día se suman correctamente.
- Los cinco estados visuales corresponden a los tramos definidos.
- Las fechas futuras no muestran actividad.
- La información de fecha y minutos se puede consultar por cada celda.
- Se conserva toda la información existente y no se añaden dependencias.
- La lógica de fechas y agregación tiene pruebas con `node --test`; no se puede dar por terminada la funcionalidad si esas pruebas fallan.

## Dudas abiertas

- Ninguna. Las decisiones necesarias han quedado definidas en esta especificación.
