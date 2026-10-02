const mapaCalor = typeof document !== "undefined" ? document.querySelector("#mapa-calor") : null;
if (typeof document !== "undefined") {
const formulario = document.querySelector("#formulario");
const fecha = document.querySelector("#fecha");
const lista = document.querySelector("#lista-sesiones");
const sinSesiones = document.querySelector("#sin-sesiones");
const racha = document.querySelector("#racha");
const textoRacha = document.querySelector("#texto-racha");
const mejorRacha = document.querySelector("#mejor-racha");
const minutosSemana = document.querySelector("#minutos-semana");
const diasMes = document.querySelector("#dias-mes");
const goalForm = document.querySelector("#formulario-objetivo");
const goalInput = document.querySelector("#objetivo-semanal");
const goalView = document.querySelector("#objetivo-vista");
const goalError = document.querySelector("#objetivo-error");
const goalMessage = document.querySelector("#objetivo-mensaje");
const resetGoalButton = document.querySelector("#restablecer-objetivo");
const API_TIMEOUT = 8000;
const CONNECTION_MESSAGE = "No se puede conectar con el servidor.";
const TIMEOUT_MESSAGE = "La conexión ha tardado demasiado. Recarga la página o inténtalo de nuevo.";
const WRITE_MESSAGE = "No se han podido guardar los datos. Inténtalo de nuevo.";
const CORRUPTION_MESSAGE = "No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.";

let sesiones = [];
let documento = null;

async function cargarDatos() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const response = await fetch("/api/data", { signal: controller.signal });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || CONNECTION_MESSAGE);
    documento = result.data;
    sesiones = documento.sesiones.slice();
    fecha.value = fechaLocal(new Date());
    mostrar();
    renderWeeklyGoal();
  } catch (error) {
    mostrarError(error.name === "AbortError" ? TIMEOUT_MESSAGE : (error.message || CONNECTION_MESSAGE));
  } finally {
    clearTimeout(timeout);
  }
}

function mostrarError(message) {
  const aviso = document.getElementById("objetivo-mensaje");
  aviso.textContent = message;
  aviso.focus();
}

cargarDatos();

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const datos = new FormData(formulario);
  const session = {
    fecha: datos.get("fecha"),
    tema: datos.get("tema").trim(),
    minutos: Number(datos.get("minutos")),
    creado: Date.now()
  };
  if (!isValidLocalDateText(session.fecha) || !isValidSessionMinutes(session.minutos) || !session.tema) {
    mostrarError("Introduce una fecha válida, un tema y minutos enteros positivos.");
    return;
  }
  enviarOperacion("session", session).then((result) => {
    if (!result) return;
    documento = result.document;
    mostrarAvisoBackup(result);
    sesiones = documento.sesiones.slice();
    formulario.reset();
    fecha.value = fechaLocal(new Date());
    mostrar();
    renderWeeklyGoal();
  });
});

goalForm.addEventListener("submit", (evento) => {
  evento.preventDefault();
  clearGoalMessages();
  const value = Number(goalInput.value);
  if (!validateWeeklyGoal(value)) {
    goalError.textContent = "Introduce un número entero entre 1 y 5.040 minutos";
    goalError.hidden = false;
    goalInput.focus();
    return;
  }
  enviarOperacion("goal", { objetivoSemanal: value }).then((result) => {
    if (!result) return;
    documento = result.document; renderWeeklyGoal(); mostrarAvisoBackup(result);
    goalMessage.textContent = "Objetivo semanal guardado"; goalMessage.focus();
  });
});

resetGoalButton.addEventListener("click", () => {
  clearGoalMessages();
  if (!window.confirm("¿Quieres restablecer el objetivo semanal?")) {
    resetGoalButton.focus();
    return;
  }
  enviarOperacion("resetGoal", { confirmation: "¿Quieres restablecer el objetivo semanal?" }).then((result) => {
    if (!result) return;
    documento = result.document; renderWeeklyGoal(); mostrarAvisoBackup(result);
    goalMessage.textContent = "Objetivo semanal restablecido"; goalInput.value = ""; goalInput.focus();
  });
});

function clearGoalMessages() {
  goalError.textContent = "";
  goalError.hidden = true;
  goalMessage.textContent = "";
}

function renderWeeklyGoal() {
  const loaded = { status: documento && documento.objetivoSemanal !== null ? "ok" : "none", goal: documento && documento.objetivoSemanal };
  if (!documento) {
    goalError.textContent = "No se puede conectar con el servidor.";
    goalError.hidden = false;
    goalView.textContent = "No hay un objetivo semanal configurado";
    return;
  }
  const model = buildWeeklyGoalViewModel(loaded.goal, sesiones, new Date());
  if (model.status === "none") {
    goalView.textContent = "No hay un objetivo semanal configurado";
    goalView.dataset.goalStatus = "none";
    goalInput.value = "";
    return;
  }
  goalView.dataset.goalStatus = model.status;
  goalInput.value = model.goal;
  if (model.status === "pending") goalView.textContent = `Objetivo semanal: ${model.progress} de ${model.goal} minutos. Faltan ${model.remaining} minutos.`;
  if (model.status === "completed") goalView.textContent = `Objetivo cumplido: ${model.goal} minutos.`;
  if (model.status === "exceeded") goalView.textContent = `Objetivo superado: ${model.goal} minutos, ${model.excess} minutos de exceso.`;
}

function enviarOperacion(type, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  return fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
    body: JSON.stringify({ operationId: `${type}-${Date.now()}-${Math.random()}`, type, payload }) })
    .then(async response => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || WRITE_MESSAGE); return result; })
    .catch(error => { mostrarError(error.name === "AbortError" ? TIMEOUT_MESSAGE : (error.message || WRITE_MESSAGE)); return null; })
    .finally(() => clearTimeout(timeout));
}

function mostrarAvisoBackup(result) {
  if (result.backupPending) mostrarError("La copia de seguridad está pendiente. Los datos principales se han guardado.");
}

function mostrar() {
  sesiones.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado);
  lista.innerHTML = "";
  sinSesiones.hidden = sesiones.length > 0;
  sesiones.forEach((sesion) => {
    const elemento = document.createElement("li");
    elemento.innerHTML = `<div><div class="tema"></div><div class="detalle"></div></div><span class="minutos"></span>`;
    elemento.querySelector(".tema").textContent = sesion.tema;
    elemento.querySelector(".detalle").textContent = `${formatearFecha(sesion.fecha)} · ${sesion.minutos} min`;
    elemento.querySelector(".minutos").textContent = `${sesion.minutos} min`;
    lista.appendChild(elemento);
  });
  actualizarRacha();
}

function actualizarRacha() {
  const hoy = new Date();
  const total = calculateCurrentStreak(sesiones, hoy);
  racha.textContent = total;
  textoRacha.textContent = total === 1 ? "Día de racha" : "Días de racha";
  mejorRacha.textContent = calculateBestStreak(sesiones, hoy);
  minutosSemana.textContent = calculateWeeklyMinutes(sesiones, hoy);
  diasMes.textContent = calculateMonthlyStudyDays(sesiones, hoy);
  renderHeatMap(sesiones, hoy);
}

}

function calculateCurrentStreak(sessions, today) {
  const days = new Set(sessions.map((session) => session.fecha));
  const todayText = formatLocalDate(today);
  let day = parseLocalDate(todayText);
  if (!days.has(todayText)) day.setDate(day.getDate() - 1);

  let total = 0;
  while (days.has(formatLocalDate(day))) {
    total++;
    day.setDate(day.getDate() - 1);
  }
  return total;
}

function calculateBestStreak(sessions, today) {
  const todayText = formatLocalDate(today);
  const dates = [...new Set(sessions.map((session) => session.fecha))]
    .filter((date) => date <= todayText)
    .sort();
  let best = 0;
  let current = 0;
  let previous = null;

  dates.forEach((date) => {
    current = previous && isNextLocalDay(previous, date) ? current + 1 : 1;
    best = Math.max(best, current);
    previous = date;
  });
  return best;
}

function calculateWeeklyMinutes(sessions, today) {
  const startOfWeek = parseLocalDate(formatLocalDate(today));
  const weekday = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (weekday === 0 ? 6 : weekday - 1));
  const startText = formatLocalDate(startOfWeek);
  const todayText = formatLocalDate(today);

  return sessions.reduce((total, session) => {
    if (session.fecha >= startText && session.fecha <= todayText) return total + Number(session.minutos);
    return total;
  }, 0);
}

function calculateMonthlyStudyDays(sessions, today) {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const todayText = formatLocalDate(today);
  return new Set(sessions
    .filter((session) => session.fecha.startsWith(`${year}-${month}`) && session.fecha <= todayText)
    .map((session) => session.fecha)).size;
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isNextLocalDay(previousDateText, currentDateText) {
  const nextDate = parseLocalDate(previousDateText);
  nextDate.setDate(nextDate.getDate() + 1);
  return formatLocalDate(nextDate) === currentDateText;
}

function getHeatMapPeriod(today) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  start.setDate(start.getDate() - (11 * 7));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  end.setDate(end.getDate() + (12 * 7) - 1);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

function buildCalendarCells(period) {
  const periodStart = parseLocalDate(period.start);
  const periodEnd = parseLocalDate(period.end);
  const gridStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
  const dayOfWeek = gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const gridEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  const endDayOfWeek = gridEnd.getDay();
  gridEnd.setDate(gridEnd.getDate() + (endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek));
  const cells = [];

  for (let day = new Date(gridStart); day <= gridEnd; day.setDate(day.getDate() + 1)) {
    const date = formatLocalDate(day);
    cells.push({ date: date >= period.start && date <= period.end ? date : null });
  }
  return cells;
}

function sumMinutesByDate(sessions) {
  return sessions.reduce((totals, session) => {
    const date = session.fecha || session.date;
    const minutes = Number(session.minutos ?? session.minutes);
    if (!isValidDateText(date) || !Number.isFinite(minutes) || minutes <= 0) return totals;
    totals[date] = (totals[date] || 0) + minutes;
    return totals;
  }, {});
}

function getIntensity(totalMinutes, isFuture) {
  if (isFuture || totalMinutes <= 0) return "none";
  if (totalMinutes <= 30) return "low";
  if (totalMinutes <= 60) return "medium-low";
  if (totalMinutes <= 120) return "medium-high";
  return "high";
}

function buildHeatMapData(sessions, today) {
  const period = getHeatMapPeriod(today);
  const totals = sumMinutesByDate(sessions);
  const todayText = formatLocalDate(today);
  return buildCalendarCells(period).map((cell) => {
    if (!cell.date) return { date: null, intensity: "empty", totalMinutes: 0, label: "" };
    const totalMinutes = totals[cell.date] || 0;
    const result = { ...cell, totalMinutes, intensity: getIntensity(totalMinutes, cell.date > todayText) };
    return { ...result, label: getCellLabel(result) };
  });
}

function getCellLabel(cell) {
  if (!cell.date) return "";
  const labelDate = formatearFecha(cell.date);
  return `${labelDate}: ${cell.intensity === "none" ? "Sin actividad" : `${cell.totalMinutes} minutos`}`;
}

function isValidDateText(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = parseLocalDate(value);
  return formatLocalDate(date) === value;
}

function isValidLocalDateText(value) {
  return isValidDateText(value);
}

function getTodayLocal(date = new Date()) {
  return formatLocalDate(date);
}

function normalizeSession(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const fecha = record.fecha ?? record.date;
  const tema = record.tema ?? record.topic;
  const minutos = record.minutos ?? record.minutes;
  if (!isValidLocalDateText(fecha) || typeof tema !== "string" || !isValidSessionMinutes(minutos)) return null;
  const session = { fecha, tema, minutos };
  if (Number.isSafeInteger(record.creado) && record.creado > 0) session.creado = record.creado;
  return session;
}

function createInitialDataDocument() {
  return {
    version: 1,
    sesiones: [],
    objetivoSemanal: null,
    metadata: {
      migration: { status: "pending", sources: [], ignoredSources: [], completedAt: null },
      successfulWrites: 0,
      backupSuccessfulWrites: 0
    }
  };
}

function validateDataDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document) || document.version !== 1 ||
      !Array.isArray(document.sesiones) || !Object.prototype.hasOwnProperty.call(document, "objetivoSemanal") ||
      !document.metadata || typeof document.metadata !== "object" || Array.isArray(document.metadata)) return false;
  if (document.objetivoSemanal !== null && !validateWeeklyGoal(document.objetivoSemanal)) return false;
  if (document.sesiones.some((session) => !normalizeSession(session))) return false;
  const metadata = document.metadata;
  const migration = metadata.migration;
  const allowedMigrationSources = new Set(["diario-de-estudio-sesiones", "diario-estudio-sesiones", "diario-de-estudio-objetivo-semanal"]);
  if (!migration || typeof migration !== "object" || Array.isArray(migration) ||
      !["pending", "failed", "completed"].includes(migration.status) || !Array.isArray(migration.sources) ||
       !migration.sources.every((source) => typeof source === "string" && allowedMigrationSources.has(source)) || !Array.isArray(migration.ignoredSources) ||
      !migration.ignoredSources.every((item) => item && typeof item === "object" && typeof item.source === "string" &&
        typeof item.reason === "string" && Number.isSafeInteger(item.count) && item.count >= 0) ||
      !Object.prototype.hasOwnProperty.call(migration, "completedAt") ||
      (migration.completedAt !== null && !isValidLocalDateText(migration.completedAt)) ||
      (migration.status === "completed" ? migration.completedAt === null : migration.completedAt !== null) ||
      !Number.isSafeInteger(metadata.successfulWrites) || metadata.successfulWrites < 0 ||
      !Number.isSafeInteger(metadata.backupSuccessfulWrites) || metadata.backupSuccessfulWrites < 0 ||
      metadata.backupSuccessfulWrites > metadata.successfulWrites) return false;
  return true;
}

function isValidSessionMinutes(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validateWeeklyGoal(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 5040;
}

// Combina exclusivamente datos ya leídos por el puente temporal.
function mergeMigrationSources(sources, existingDocument = createInitialDataDocument()) {
  const input = sources || {};
  const records = [];
  const add = (value) => {
    if (Array.isArray(value)) records.push(...value);
  };
  add(input["diario-de-estudio-sesiones"]);
  add(input["diario-estudio-sesiones"]);
  const sessions = existingDocument.sesiones.slice();
  const seen = new Set(sessions.map(s => `${s.fecha}|${s.tema}|${s.minutos}`));
  for (const record of records) {
    const normalized = normalizeSession(record);
    if (!normalized) continue;
    const key = `${normalized.fecha}|${normalized.tema}|${normalized.minutos}`;
    if (!seen.has(key)) { seen.add(key); sessions.push(normalized); }
  }
  const incomingGoal = input["diario-de-estudio-objetivo-semanal"];
  const decision = input.goalDecision;
  let goal = existingDocument.objetivoSemanal;
  if (validateWeeklyGoal(incomingGoal) && validateWeeklyGoal(goal) && incomingGoal !== goal) {
    if (!validateWeeklyGoal(decision) || ![goal, incomingGoal].includes(decision)) {
      throw new Error("Hay dos objetivos distintos. Elige cuál conservar.");
    }
    goal = decision;
  } else if (goal === null && validateWeeklyGoal(incomingGoal)) goal = incomingGoal;
  return { ...structuredClone(existingDocument), sesiones: sessions, objetivoSemanal: goal };
}

function getWeekStart(today) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return formatLocalDate(start);
}

function calculateWeeklyProgress(sessions, today) {
  const startText = getWeekStart(today);
  const todayText = formatLocalDate(today);
  return sessions.reduce((total, session) => {
    const date = session.fecha ?? session.date;
    const minutes = session.minutos ?? session.minutes;
    if (!isValidLocalDateText(date) || !isValidSessionMinutes(minutes)) return total;
    if (date < startText || date > todayText) return total;
    const nextTotal = total + minutes;
    return Number.isSafeInteger(nextTotal) ? nextTotal : total;
  }, 0);
}

function getGoalStatus(progress, goal) {
  if (!validateWeeklyGoal(goal)) return { status: "none", remaining: 0, excess: 0 };
  const safeProgress = Number.isSafeInteger(progress) && progress >= 0 ? progress : 0;
  if (safeProgress < goal) {
    return { status: "pending", remaining: goal - safeProgress, excess: 0 };
  }
  if (safeProgress === goal) return { status: "completed", remaining: 0, excess: 0 };
  return { status: "exceeded", remaining: 0, excess: safeProgress - goal };
}

function buildWeeklyGoalViewModel(goal, sessions, today) {
  const state = getGoalStatus(0, goal);
  if (state.status === "none") return { status: "none", goal: null, progress: 0, remaining: 0, excess: 0 };
  const progress = calculateWeeklyProgress(sessions, today);
  return { goal, progress, ...getGoalStatus(progress, goal) };
}

const WEEKLY_GOAL_KEY = "diario-de-estudio-objetivo-semanal";

function loadWeeklyGoal(storage) {
  try {
    const raw = storage.getItem(WEEKLY_GOAL_KEY);
    if (raw === null) return { goal: null, status: "none" };
    let value;
    try { value = JSON.parse(raw); } catch { return { goal: null, status: "none" }; }
    return validateWeeklyGoal(value)
      ? { goal: value, status: "ok" }
      : { goal: null, status: "none" };
  } catch {
    return { goal: null, status: "error", message: "No se ha podido cargar el objetivo" };
  }
}

function saveWeeklyGoal(storage, goal) {
  if (!validateWeeklyGoal(goal)) {
    return { ok: false, message: "Introduce un número entero entre 1 y 5.040 minutos" };
  }
  try {
    storage.setItem(WEEKLY_GOAL_KEY, JSON.stringify(goal));
    return { ok: true, goal };
  } catch {
    return { ok: false, message: "No se ha podido guardar el objetivo" };
  }
}

function resetWeeklyGoal(storage) {
  try {
    storage.removeItem(WEEKLY_GOAL_KEY);
    return { ok: true, goal: null };
  } catch {
    return { ok: false, message: "No se ha podido guardar el objetivo" };
  }
}

function renderHeatMap(sessions, today) {
  if (!mapaCalor) return;
  mapaCalor.innerHTML = "";
  buildHeatMapData(sessions, today).forEach((cell) => {
    const elemento = document.createElement("span");
    elemento.className = `celda-calor estado-${cell.intensity}`;
    if (cell.date) {
      elemento.setAttribute("role", "img");
      elemento.tabIndex = 0;
      elemento.setAttribute("aria-label", cell.label);
      elemento.title = cell.label;
    } else {
      elemento.setAttribute("aria-hidden", "true");
    }
    mapaCalor.appendChild(elemento);
  });
}

function esDiaSiguiente(valorAnterior, valorActual) {
  const [anio, mes, dia] = valorAnterior.split("-").map(Number);
  const siguiente = new Date(anio, mes - 1, dia);
  siguiente.setDate(siguiente.getDate() + 1);
  return fechaLocal(siguiente) === valorActual;
}

function fechaLocal(dia) {
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
}

function formatearFecha(valor) {
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

if (typeof module !== "undefined") {
  module.exports = {
    calculateCurrentStreak,
    calculateBestStreak,
    calculateWeeklyMinutes,
  calculateMonthlyStudyDays
  , getHeatMapPeriod,
  buildCalendarCells,
  sumMinutesByDate,
  getIntensity,
  buildHeatMapData,
    getCellLabel
    , isValidLocalDateText
    , isValidSessionMinutes
     , validateWeeklyGoal
     , getWeekStart
      , calculateWeeklyProgress
      , getGoalStatus
       , buildWeeklyGoalViewModel
       , loadWeeklyGoal
       , saveWeeklyGoal
     , resetWeeklyGoal
     , createInitialDataDocument
     , mergeMigrationSources
     , validateDataDocument
     , normalizeSession
     , getTodayLocal
     , formatLocalDate
     , parseLocalDate
     };
}
