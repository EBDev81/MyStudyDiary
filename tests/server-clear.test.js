const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { createServer } = require("../server.js");
const { createRepository } = require("../repository.js");
const { createInitialDataDocument } = require("../app.js");

async function request(server, operation) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: address.port, path: "/api/operations", method: "POST", headers: { "content-type": "application/json" } }, response => {
      let body = "";
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    req.end(JSON.stringify(operation));
  });
}

async function getData(server) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port: address.port, path: "/api/data" }, response => {
      let body = "";
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    }).on("error", reject);
  });
}

async function withServer(callback, setup = () => {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "diario-server-"));
  const file = path.join(directory, "data.json");
  const repository = createRepository({ dataFile: file, backupFile: path.join(directory, "backup.json") });
  setup(file);
  const server = createServer({ repository });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { return await callback(server, file); } finally { server.close(); }
}

test("API devuelve solo la forma de éxito del borrado", async () => {
  await withServer(async (server, file) => {
    const document = createInitialDataDocument();
    document.sesiones.push({ fecha: "2026-10-02", tema: "x", minutos: 10 });
    fs.writeFileSync(file, JSON.stringify(document));
    const result = await request(server, { type: "clear-main-data", operationId: "ok", confirmation: "BORRAR TODO" });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ok: true, deletedSessions: 1, backupPending: false });
  });
});

test("API acepta una alta de sesión y devuelve su nuevo identificador", async () => {
  await withServer(async server => {
    const result = await request(server, {
      type: "session", operationId: "alta-regresion", payload: {
        fecha: "2026-10-06", tema: "Regresión", minutos: 25, creado: Date.now()
      }
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.document.sesiones.at(-1).id, 1);
  });
});

test("API acepta establecer y restablecer el objetivo semanal", async () => {
  await withServer(async server => {
    const saved = await request(server, { type: "goal", operationId: "objetivo-regresion", payload: { objetivoSemanal: 120 } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.ok, true);
    assert.equal(saved.body.document.objetivoSemanal, 120);
    const reset = await request(server, { type: "resetGoal", operationId: "restablecer-regresion", payload: { confirmation: "¿Quieres restablecer el objetivo semanal?" } });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.ok, true);
    assert.equal(reset.body.document.objetivoSemanal, null);
  });
});

test("GET normaliza el documento legado antes de exponer sesiones a la UI", async () => {
  await withServer(async (server, file) => {
    const document = createInitialDataDocument();
    document.sesiones.push({ fecha: "2026-10-02", tema: "legada", minutos: 10 });
    fs.writeFileSync(file, JSON.stringify(document));
    const result = await getData(server);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.data.sesiones[0].id, 1);
    assert.equal(result.body.data.metadata.nextSessionId, 2);
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).sesiones[0].id, 1);
  });
});

test("API mapea códigos y mensajes del borrado", async () => {
  await withServer(async server => {
    const result = await request(server, { type: "clear-main-data", operationId: "bad", confirmation: "NO" });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, { ok: false, code: "INVALID_CLEAR_REQUEST", message: "La confirmación de borrado no es válida." });
  });
});
