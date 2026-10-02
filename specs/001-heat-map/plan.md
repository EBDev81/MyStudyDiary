# Plan de implementación — Mapa de calor

## Archivos y responsabilidades

- `index.html` — añadir la sección del mapa, la leyenda, el contenedor accesible y la etiqueta `Últimas doce semanas`. Cubre RF-1, RF-3 y RF-4.
- `styles.css` — representar semanas en columnas, días de lunes a domingo en filas, cinco intensidades y adaptación móvil. Cubre RF-1, RF-3 y RF-4.
- `app.js` — cargar sesiones, invocar la lógica pura y pintar el resultado después de cargar o guardar. Cubre RF-2 y RF-5.
- `tests/heat-map.test.js` — probar la lógica del periodo, agregación, intensidad y fechas futuras con `node --test`. Cubre RF-1, RF-2, RF-3 y RF-5.
- No se modificará ni eliminará ninguna entrada de `localStorage`; las sesiones inválidas se conservarán y solo se ignorarán en el cálculo. Cubre RF-5.

## Funciones puras necesarias

Todas recibirán `today` explícitamente y no accederán al DOM ni a `localStorage`. Sus nombres estarán en inglés; la interfaz y la documentación seguirán en español.

- `formatLocalDate(date)`: produce `AAAA-MM-DD` usando la fecha local.
- `parseLocalDate(dateText)`: convierte `AAAA-MM-DD` con `new Date(año, mes - 1, día)`.
- `getHeatMapPeriod(today)`: devuelve el lunes de hace once semanas y el domingo de la semana actual. Cubre RF-1.
- `buildCalendarCells(period)`: crea las celdas en columnas semanales y filas de lunes a domingo, dejando vacíos los huecos fuera del periodo. Cubre RF-1 y RF-4.
- `sumMinutesByDate(sessions)`: agrupa sesiones válidas por fecha y suma sus minutos; descarta solo registros inválidos para el cálculo. Cubre RF-2.
- `getIntensity(totalMinutes, isFuture)`: devuelve uno de los cinco estados definidos. Cubre RF-3.
- `buildHeatMapData(sessions, today)`: combina periodo, días agregados, fechas futuras e intensidad. Cubre RF-1, RF-2 y RF-3.
- `getCellLabel(cell)`: genera fecha y minutos en español para la etiqueta accesible y el texto emergente. Cubre RF-4.

## Algoritmo del mapa en pseudocódigo

```text
buildHeatMapData(sessions, today):
    period = getHeatMapPeriod(today)
    minutesByDate = sumMinutesByDate(sessions)
    cells = buildCalendarCells(period)

    para cada cell en cells:
        si cell está fuera del periodo:
            cell.state = "empty"
            continuar

        future = cell.date > formatLocalDate(today)
        total = minutesByDate[cell.date] o 0
        cell.totalMinutes = total
        cell.intensity = getIntensity(total, future)
        cell.label = getCellLabel(cell)

    devolver cells
```

La agregación debe sumar todas las sesiones válidas de una misma fecha. Las fechas se comparan como textos `AAAA-MM-DD` solo después de validarlas y siempre se construyen con componentes locales. No se usarán UTC, `toISOString()` ni milisegundos.

## Pintado de la interfaz

- El mapa se renderiza como una cuadrícula: cada columna representa una semana y cada fila representa lunes, martes, miércoles, jueves, viernes, sábado o domingo. Cubre RF-1.
- Cada día válido se pinta con una clase específica para `sin actividad`, `bajo`, `medio-bajo`, `medio-alto` o `alto`. Cubre RF-3.
- Las celdas futuras y las pasadas sin sesiones comparten el gris de ausencia de actividad; su etiqueta indica la fecha. Cubre RF-3 y RF-4.
- Cada celda tendrá nombre accesible, texto emergente con `DD/MM/AAAA` y minutos, y una presentación que no dependa solo del color. Cubre RF-4.
- La leyenda mostrará los cinco estados y sus tramos de minutos. Cubre RF-3 y RF-4.
- Después de cargar sesiones y después de guardar una sesión, se vuelve a generar el mapa desde los datos actuales. Cubre RF-5.
- En móvil la cuadrícula conservará el orden de semanas y días; podrá desplazarse horizontalmente sin perder etiquetas ni relación entre celdas. Cubre RF-4.

## Decisiones técnicas

- **Lógica pura en el mismo `app.js`:** respeta la estructura actual y permite que la parte de interfaz solo coordine datos y DOM. Alternativa descartada: crear un framework o una capa de estado, porque contradice la simplicidad del proyecto.
- **Pruebas CommonJS con `node --test`:** las funciones puras se expondrán de forma compatible con Node sin impedir la apertura directa en el navegador. Alternativa descartada: módulos ES, porque `file://` debe funcionar sin `type="module"`.
- **Columnas de semanas y filas de lunes a domingo:** ofrece una lectura tipo GitHub y respeta el calendario local en español. Alternativa descartada: lista continua de días, porque pierde el patrón semanal.
- **Tramos fijos de intensidad:** 0, 1–30, 31–60, 61–120 y más de 120 minutos. Alternativa descartada: escala relativa al máximo visible, porque cambia el significado del color entre periodos.
- **Cálculo dinámico:** no se guarda ninguna estadística derivada. Alternativa descartada: persistir el mapa o sus totales, porque podría quedar desactualizado y arriesgar la integridad de los datos.
- **Compatibilidad de datos:** reutilizar la normalización existente para `fecha`/`date`, `tema`/`topic` y `minutos`/`minutes`. Alternativa descartada: migración destructiva o cambio obligatorio del formato guardado.

## Estrategia de tests con `node --test`

- Probar `getHeatMapPeriod` el primer día del mes, en domingo, en enero y en diciembre. Cubre RF-1.
- Probar que el periodo contiene el mes completo más exactamente los 14 días anteriores al día 1. Cubre RF-1.
- Probar una, varias y ninguna sesión por fecha; confirmar que varias se suman. Cubre RF-2.
- Probar los límites 0, 1, 30, 31, 60, 61, 120 y 121 minutos. Cubre RF-3.
- Probar que hoy, ayer y fechas futuras se clasifican correctamente y que las futuras no generan actividad. Cubre RF-3.
- Probar sesiones fuera del periodo, formatos antiguos compatibles y registros inválidos sin modificar los datos originales. Cubre RF-2 y RF-5.
- Probar etiquetas con `DD/MM/AAAA` y minutos totales. Cubre RF-4.
- Ejecutar `node --test`; si alguna prueba falla, la funcionalidad no se considera terminada. Cubre RF-5.
