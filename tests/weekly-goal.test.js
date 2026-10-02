const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateWeeklyGoal,
  isValidLocalDateText,
  isValidSessionMinutes
  , getWeekStart
  , calculateWeeklyProgress
  , getGoalStatus
  , buildWeeklyGoalViewModel
  , loadWeeklyGoal
  , saveWeeklyGoal
  , resetWeeklyGoal
} = require("../app.js");

function storage(initial = {}) {
  const data = { ...initial };
  return { data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; }
  };
}

test("calcula estados del objetivo sin progreso huérfano", () => {
  assert.deepEqual(getGoalStatus(0, null), { status: "none", remaining: 0, excess: 0 });
  assert.deepEqual(getGoalStatus(30, 100), { status: "pending", remaining: 70, excess: 0 });
  assert.deepEqual(getGoalStatus(100, 100), { status: "completed", remaining: 0, excess: 0 });
  assert.deepEqual(getGoalStatus(125, 100), { status: "exceeded", remaining: 0, excess: 25 });
});

test("el modelo deriva el reinicio al cambiar de semana", () => {
  const sessions = [{ fecha: "2026-10-05", minutos: 40 }];
  assert.deepEqual(buildWeeklyGoalViewModel(100, sessions, new Date(2026, 9, 5)), {
    status: "pending", goal: 100, progress: 40, remaining: 60, excess: 0
  });
  assert.deepEqual(buildWeeklyGoalViewModel(100, sessions, new Date(2026, 9, 12)), {
    status: "pending", goal: 100, progress: 0, remaining: 100, excess: 0
  });
});

test("valida objetivos enteros entre 1 y 5.040 sin coerción", () => {
  for (const value of [1, 5040]) assert.equal(validateWeeklyGoal(value), true);
  for (const value of [0, -1, 5041, 1.5, "30", "", NaN, Infinity, null]) {
    assert.equal(validateWeeklyGoal(value), false);
  }
});

test("valida fechas locales con formato y calendario reales", () => {
  for (const value of ["2026-01-01", "2024-02-29", "2026-12-31"]) {
    assert.equal(isValidLocalDateText(value), true);
  }
  for (const value of ["", "2026-1-01", "2026-01-1", "2026-02-29", "2025-02-29", "2026-04-31", "no-es-fecha", null]) {
    assert.equal(isValidLocalDateText(value), false);
  }
});

test("acepta solo minutos positivos, enteros y seguros", () => {
  for (const value of [1, Number.MAX_SAFE_INTEGER]) assert.equal(isValidSessionMinutes(value), true);
  for (const value of [0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, "30", null]) {
    assert.equal(isValidSessionMinutes(value), false);
  }
});

test("calcula el lunes local, incluso al cruzar mes y año", () => {
  assert.equal(getWeekStart(new Date(2026, 0, 1)), "2025-12-29"); // jueves
  assert.equal(getWeekStart(new Date(2026, 1, 1)), "2026-01-26"); // domingo
  assert.equal(getWeekStart(new Date(2026, 9, 2)), "2026-09-28");
});

test("suma solo sesiones válidas de lunes hasta today, sin mutar", () => {
  const sessions = [
    { fecha: "2026-09-28", minutos: 10 },
    { date: "2026-10-02", minutes: 20 },
    { fecha: "2026-10-02", minutos: 5 },
    { fecha: "2026-10-03", minutos: 100 },
    { fecha: "2026-09-27", minutos: 50 },
    { fecha: "2026-10-02", minutos: 0 },
    { fecha: "2026-10-02", minutos: 1.5 },
    { fecha: "2026-10-02", minutos: 10, extra: "keep" }
  ];
  const before = JSON.stringify(sessions);
  assert.equal(calculateWeeklyProgress(sessions, new Date(2026, 9, 2)), 45);
  assert.equal(JSON.stringify(sessions), before);
});

test("reinicia al cambiar de semana y excluye futuras con volumen seguro", () => {
  const sessions = Array.from({ length: 1000 }, (_, i) => ({
    fecha: "2026-10-05", minutos: 5
  }));
  sessions.push({ fecha: "2026-10-12", minutos: 999 });
  assert.equal(calculateWeeklyProgress(sessions, new Date(2026, 9, 11)), 5000);
  assert.equal(calculateWeeklyProgress(sessions, new Date(2026, 9, 12)), 999);
});

test("usa el día local explícito en medianoche y cambio de hora", () => {
  const sessions = [
    { fecha: "2026-03-29", minutos: 7 },
    { fecha: "2026-03-30", minutos: 8 }
  ];
  assert.equal(calculateWeeklyProgress(sessions, new Date(2026, 2, 29, 0, 30)), 7);
  assert.equal(calculateWeeklyProgress(sessions, new Date(2026, 2, 30, 0, 30)), 8);
});

test("persiste el objetivo en una clave aislada y reaparece al recargar", () => {
  const sessions = JSON.stringify([{ fecha: "2026-10-02", tema: "x", minutos: 10 }]);
  const store = storage({ "diario-estudio-sesiones": sessions });
  assert.deepEqual(loadWeeklyGoal(store), { goal: null, status: "none" });
  assert.deepEqual(saveWeeklyGoal(store, 120), { ok: true, goal: 120 });
  assert.equal(store.data["diario-estudio-sesiones"], sessions);
  assert.equal(store.data["diario-de-estudio-objetivo-semanal"], "120");
  assert.deepEqual(loadWeeklyGoal(store), { goal: 120, status: "ok" });
});

test("ignora JSON corrupto y tipos o rangos inválidos sin tocar sesiones", () => {
  const sessions = "[{\"date\":\"2026-10-02\",\"minutes\":10}]";
  for (const value of ["roto", '"120"', "0", "5041", "1.5", "null", "{}", "[]"]) {
  const store = storage({ "diario-estudio-sesiones": sessions, "diario-de-estudio-objetivo-semanal": value });
    assert.deepEqual(loadWeeklyGoal(store), { goal: null, status: "none" });
    assert.equal(store.data["diario-estudio-sesiones"], sessions);
  }
});

test("conserva el objetivo anterior ante fallos y permite reintentar", () => {
  const store = storage({ "diario-de-estudio-objetivo-semanal": "90" });
  let fail = true;
  store.setItem = (key, value) => { if (fail) throw new Error("quota"); store.data[key] = value; };
  assert.deepEqual(saveWeeklyGoal(store, 120), { ok: false, message: "No se ha podido guardar el objetivo" });
  assert.deepEqual(loadWeeklyGoal(store), { goal: 90, status: "ok" });
  fail = false;
  assert.deepEqual(saveWeeklyGoal(store, 120), { ok: true, goal: 120 });
  assert.deepEqual(loadWeeklyGoal(store), { goal: 120, status: "ok" });
});

test("distingue excepción de lectura y restablece solo tras éxito", () => {
  const store = storage({ "diario-de-estudio-objetivo-semanal": "90", "diario-estudio-sesiones": "sesiones" });
  store.getItem = () => { throw new Error("read"); };
  assert.deepEqual(loadWeeklyGoal(store), { goal: null, status: "error", message: "No se ha podido cargar el objetivo" });
  const normal = storage({ "diario-de-estudio-objetivo-semanal": "90", "diario-estudio-sesiones": "sesiones" });
  assert.deepEqual(resetWeeklyGoal(normal), { ok: true, goal: null });
  assert.equal(normal.data["diario-estudio-sesiones"], "sesiones");
  const broken = storage({ "diario-de-estudio-objetivo-semanal": "90" });
  broken.removeItem = () => { throw new Error("denied"); };
  assert.deepEqual(resetWeeklyGoal(broken), { ok: false, message: "No se ha podido guardar el objetivo" });
  assert.deepEqual(loadWeeklyGoal(broken), { goal: 90, status: "ok" });
});

test("el modelo se actualiza inmediatamente al añadir una sesión válida", () => {
  const today = new Date(2026, 9, 2);
  const sessions = [];
  assert.deepEqual(buildWeeklyGoalViewModel(60, sessions, today), {
    status: "pending", goal: 60, progress: 0, remaining: 60, excess: 0
  });
  sessions.push({ fecha: "2026-10-02", minutos: 60 });
  assert.deepEqual(buildWeeklyGoalViewModel(60, sessions, today), {
    status: "completed", goal: 60, progress: 60, remaining: 0, excess: 0
  });
});
