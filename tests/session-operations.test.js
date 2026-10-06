const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  validateSessionOperation, sessionOperationFingerprint, sessionError, SESSION_MESSAGES
} = require("../repository.js");
const { createRepository } = require("../repository.js");

test("la UI conserva el backupPending explícito aunque los contadores aún no lo reflejen", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(source, /backupPending\s*=\s*result\.backupPending\s*===\s*true\s*\|\|\s*deriveBackupPending\(result\.document\)/);
});

const edit = (overrides = {}) => ({ type: "edit-session", operationId: " op-1 ", payload: {
  id: 4, session: { fecha: "2026-10-06", tema: "  Repaso  ", minutos: 25 }
}, ...overrides });

test("valida edición y borrado, separando operación de datos", () => {
  assert.equal(validateSessionOperation(edit()), null);
  assert.equal(validateSessionOperation({ type: "delete-session", operationId: "x", payload: { id: 4 } }), null);
  assert.equal(validateSessionOperation({ ...edit(), payload: { ...edit().payload, session: { fecha: "2026-02-30", tema: "x", minutos: 1 } } }), "INVALID_SESSION_DATA");
  assert.equal(validateSessionOperation({ ...edit(), payload: { ...edit().payload, id: 1.2 } }), "INVALID_SESSION_OPERATION");
});

test("valida las operaciones de objetivo con reglas estrictas independientes", () => {
  assert.equal(validateSessionOperation({ type: "goal", operationId: "goal-1", payload: { objetivoSemanal: 120 } }), null);
  assert.equal(validateSessionOperation({ type: "resetGoal", operationId: "reset-1", payload: { confirmation: "¿Quieres restablecer el objetivo semanal?" } }), null);
  assert.equal(validateSessionOperation({ type: "goal", operationId: "goal-2", payload: { objetivoSemanal: 0 } }), "INVALID_SESSION_DATA");
  assert.equal(validateSessionOperation({ type: "resetGoal", operationId: "reset-2", payload: { confirmation: "no" } }), "INVALID_SESSION_OPERATION");
  assert.equal(validateSessionOperation({ type: "goal", operationId: "goal-3", payload: { objetivoSemanal: 120, extra: true } }), "INVALID_SESSION_OPERATION");
});

test("rechaza JSON lógico incompleto, extras y operationId vacío", () => {
  for (const operation of [null, {}, { type: "unknown", operationId: "x", payload: {} },
    { type: "delete-session", operationId: " ", payload: { id: 1 } },
    { type: "delete-session", operationId: "x", payload: { id: 1, extra: true } },
    { type: "edit-session", operationId: "x", payload: { id: 1, session: { fecha: "2026-01-01", tema: "x", minutos: 1, extra: 2 } } }]) {
    assert.equal(validateSessionOperation(operation), "INVALID_SESSION_OPERATION");
  }
});

test("huella lógica ignora orden, recorta tema y conserva operationId", () => {
  const a = edit();
  const b = { payload: { session: { minutos: 25, tema: "Repaso", fecha: "2026-10-06" }, id: 4 }, operationId: " op-1 ", type: "edit-session" };
  assert.equal(sessionOperationFingerprint(a), sessionOperationFingerprint(b));
  assert.notEqual(sessionOperationFingerprint(a), sessionOperationFingerprint({ ...a, operationId: "op-1" }));
  assert.equal(sessionError("SESSION_NOT_FOUND").message, SESSION_MESSAGES.SESSION_NOT_FOUND);
});

test("la UI conserva la vista ante errores HTTP contratados al editar", () => {
  const source = fs.readFileSync(require.resolve("../app.js"), "utf8");
  const errorBranch = source.slice(source.indexOf("async function submitEdit"), source.indexOf("editForm.addEventListener"));
  assert.match(errorBranch, /!response\.ok \|\| !result\.ok/);
  assert.match(errorBranch, /result\.message \|\| WRITE_MESSAGE/);
  assert.match(errorBranch, /if \(!validEditResponse\(result, session\.id\)\) throw new Error\("SESSION_INTEGRITY_ERROR"\)/);
});

test("la UI muestra el mensaje contratado de una operación fallida", () => {
  const source = fs.readFileSync(require.resolve("../app.js"), "utf8");
  assert.match(source, /result\.message \|\| result\.error \|\| WRITE_MESSAGE/);
  const response = { ok: false, code: "SESSION_NOT_FOUND", message: "La sesión no existe." };
  assert.equal(response.message || response.error || "No se han podido guardar los datos. Inténtalo de nuevo.", "La sesión no existe.");
});

test("edita la sesión 33 Comprobación del mapa de calor sin INVALID_SESSION_OPERATION", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "diario-edicion-"));
  const dataFile = path.join(directory, "data.json");
  const backupFile = path.join(directory, "data.backup.json");
  fs.copyFileSync(path.join(__dirname, "..", "data", "data.json"), dataFile);
  const source = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const session = source.sesiones.find(item => item.id === 33);
  assert.equal(session.tema, "Comprobación del mapa de calor");
  const result = await createRepository({ dataFile, backupFile }).enqueue({
    type: "edit-session", operationId: "regresion-edicion-33",
    payload: { id: 33, session: { fecha: session.fecha, tema: session.tema, minutos: session.minutos } }
  });
  assert.equal(result.ok, true);
  assert.equal(result.document.sesiones.find(item => item.id === 33).tema, session.tema);
});

test("la edición usa un payload de sesión exacto y conserva la página visible", () => {
  const source = fs.readFileSync(require.resolve("../app.js"), "utf8");
  const submit = source.slice(source.indexOf("async function submitEdit"), source.indexOf("editForm.addEventListener"));
  assert.match(submit, /session: \{ fecha: session\.fecha, tema: session\.tema, minutos: session\.minutos \}/);
  const form = source.slice(source.indexOf('editForm.addEventListener("submit"'), source.indexOf("editCancel.addEventListener"));
  assert.match(form, /const paginaAntesDeEditar = paginaActual/);
  assert.match(form, /paginaActual = paginaAntesDeEditar/);
  assert.doesNotMatch(form, /findSessionPage/);
});

test("cada botón de edición tiene un id estable y devuelve el foco a su origen", () => {
  const source = fs.readFileSync(require.resolve("../app.js"), "utf8");
  assert.match(source, /editButton\.id\s*=\s*`editar-sesion-\$\{sesion\.id\}`/);
  assert.match(source, /editButton\.dataset\.sessionId\s*=\s*String\(sesion\.id\)/);
  assert.match(source, /openEditDialog\(sesion, editButton\)/);
  assert.match(source, /editReturnFocus\s*=\s*origin/);
});

test("el borrado bloquea Escape y acciones duplicadas durante la petición", () => {
  const source = fs.readFileSync(require.resolve("../app.js"), "utf8");
  assert.match(source, /if \(!clearInProgress && !deleteInProgress\) deleteSessionId/);
  assert.match(source, /cancelClearButton\.addEventListener\("click", \(\) => \{\s*if \(clearInProgress \|\| deleteInProgress\) return;/);
  assert.match(source, /confirmClearButton\.addEventListener\("click", \(\) => \{\s*if \(clearInProgress \|\| deleteInProgress\) return;/);
});

test("el borrado individual reajusta página y enfoca el paginador", () => {
  const source = fs.readFileSync(require.resolve("../app.js"), "utf8");
  assert.match(source, /const paginationView = buildSessionPaginationView\(sesiones, paginaActual\)/);
  assert.match(source, /paginaActual = paginationView\.currentPage/);
  assert.match(source, /paginationControls\.dataset\.focusPage = String\(paginaActual\)/);
});
