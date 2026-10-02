const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateCurrentStreak,
  calculateBestStreak,
  calculateWeeklyMinutes,
  calculateMonthlyStudyDays,
  getHeatMapPeriod,
  buildCalendarCells,
  sumMinutesByDate,
  getIntensity,
  buildHeatMapData,
  getCellLabel
} = require("../app.js");

const today = new Date(2026, 9, 1);

test("calcula la racha actual usando la fecha recibida", () => {
  const sesiones = [
    { fecha: "2026-10-01", minutos: 30 },
    { fecha: "2026-09-30", minutos: 20 },
    { fecha: "2026-09-29", minutos: 15 }
  ];

  assert.equal(calculateCurrentStreak(sesiones, today), 3);
});

test("calcula la mejor racha sin depender del día real del sistema", () => {
  const sesiones = [
    { fecha: "2026-08-10", minutos: 20 },
    { fecha: "2026-08-11", minutos: 20 },
    { fecha: "2026-08-12", minutos: 20 },
    { fecha: "2026-10-01", minutos: 20 }
  ];

  assert.equal(calculateBestStreak(sesiones, today), 3);
});

test("calcula los minutos de la semana local y excluye fechas futuras", () => {
  const sesiones = [
    { fecha: "2026-09-28", minutos: 30 },
    { fecha: "2026-09-30", minutos: 45 },
    { fecha: "2026-10-01", minutos: 20 },
    { fecha: "2026-10-02", minutos: 100 }
  ];

  assert.equal(calculateWeeklyMinutes(sesiones, today), 95);
});

test("cuenta días únicos del mes local y excluye fechas futuras", () => {
  const sesiones = [
    { fecha: "2026-10-01", minutos: 20 },
    { fecha: "2026-10-01", minutos: 30 },
    { fecha: "2026-09-30", minutos: 40 },
    { fecha: "2026-10-02", minutos: 50 }
  ];

  assert.equal(calculateMonthlyStudyDays(sesiones, today), 1);
});

test("crea el periodo del mes y los catorce días anteriores", () => {
  const period = getHeatMapPeriod(today);
  assert.equal(period.start, "2026-07-13");
  assert.equal(period.end, "2026-10-04");
});

test("organiza las celdas en semanas de lunes a domingo", () => {
  const cells = buildCalendarCells(getHeatMapPeriod(today));
  assert.ok(cells.some((cell) => cell.date === "2026-07-13"));
  assert.equal(cells.filter((cell) => cell.date).length, 84);
});

test("suma minutos por fecha sin modificar las sesiones", () => {
  const sesiones = [
    { fecha: "2026-10-01", minutos: 20 },
    { fecha: "2026-10-01", minutos: 30 },
    { fecha: "2026-10-02", minutos: 15 },
    { fecha: "2026-10-03", minutos: -5 }
  ];
  assert.deepEqual(sumMinutesByDate(sesiones), { "2026-10-01": 50, "2026-10-02": 15 });
  assert.equal(sesiones[0].minutos, 20);
});

test("aplica los cinco niveles de intensidad", () => {
  assert.equal(getIntensity(0, false), "none");
  assert.equal(getIntensity(30, false), "low");
  assert.equal(getIntensity(31, false), "medium-low");
  assert.equal(getIntensity(60, false), "medium-low");
  assert.equal(getIntensity(61, false), "medium-high");
  assert.equal(getIntensity(120, false), "medium-high");
  assert.equal(getIntensity(121, false), "high");
  assert.equal(getIntensity(100, true), "none");
});

test("construye datos y etiquetas del mapa", () => {
  const data = buildHeatMapData([{ fecha: "2026-10-01", minutos: 75 }], today);
  const cell = data.find((item) => item.date === "2026-10-01");
  assert.equal(cell.intensity, "medium-high");
  assert.equal(getCellLabel(cell), "01/10/2026: 75 minutos");
});
