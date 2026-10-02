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

test("API mapea códigos y mensajes del borrado", async () => {
  await withServer(async server => {
    const result = await request(server, { type: "clear-main-data", operationId: "bad", confirmation: "NO" });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, { ok: false, code: "INVALID_CLEAR_REQUEST", message: "La confirmación de borrado no es válida." });
  });
});
