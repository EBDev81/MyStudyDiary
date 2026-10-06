const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createRepository, DataReadError, CORRUPTION_MESSAGE, validateSessionOperation, sessionError, SESSION_MESSAGES } = require("./repository.js");

const PORT = 3000;
const PUBLIC_DIRECTORY = __dirname;
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

const CLEAR_ERROR_STATUS = {
  INVALID_CLEAR_REQUEST: 400,
  IDEMPOTENCY_CONFLICT: 409,
  MAIN_DATA_MISSING: 404,
  DATA_CORRUPT: 503,
  CLEAR_WRITE_FAILED: 503
};
const SESSION_ERROR_STATUS = { INVALID_SESSION_OPERATION: 400, INVALID_SESSION_DATA: 400, SESSION_NOT_FOUND: 404, IDEMPOTENCY_CONFLICT: 409, MAIN_DATA_MISSING: 500, DATA_CORRUPT: 500, WRITE_FAILED: 500, ID_ALLOCATION_FAILED: 500 };
const SESSION_ERROR_MESSAGES = {
  ...SESSION_MESSAGES,
  MAIN_DATA_MISSING: "No se pueden leer los datos porque no existe el archivo principal.",
  DATA_CORRUPT: CORRUPTION_MESSAGE,
  WRITE_FAILED: "No se han podido guardar los datos. Inténtalo de nuevo.",
  ID_ALLOCATION_FAILED: "No se pudo asignar un identificador a la sesión."
};

function createServer({ repository = createRepository() } = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (request.method === "GET" && url.pathname === "/api/data") {
      try {
        const data = repository.ensureNormalized ? await repository.ensureNormalized() : repository.read();
        sendJson(response, 200, { ok: true, data });
      } catch (error) {
        const message = error instanceof DataReadError ? CORRUPTION_MESSAGE : "No se puede conectar con el servidor.";
        sendJson(response, 503, { ok: false, error: message });
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/operations") {
      let body = "";
      request.on("data", chunk => { body += chunk; });
      request.on("end", async () => {
        try {
          let operation;
          try { operation = JSON.parse(body); } catch { throw sessionError("INVALID_SESSION_OPERATION"); }
           if (operation && operation.type !== "clear-main-data") {
            const validation = validateSessionOperation(operation);
            if (validation) throw sessionError(validation);
          }
          const result = await repository.enqueue(operation);
          if (operation && operation.type === "clear-main-data") {
            sendJson(response, 200, {
              ok: true,
              deletedSessions: result.deletedSessions,
              backupPending: result.backupPending
            });
          } else {
            sendJson(response, 200, result);
          }
        } catch (error) {
          if (error.code && SESSION_ERROR_STATUS[error.code]) {
            sendJson(response, SESSION_ERROR_STATUS[error.code], { ok: false, code: error.code, message: SESSION_ERROR_MESSAGES[error.code] });
          } else if (error.code && CLEAR_ERROR_STATUS[error.code]) {
            sendJson(response, CLEAR_ERROR_STATUS[error.code], { ok: false, code: error.code, message: error.message });
          } else {
            sendJson(response, 503, { ok: false, error: error.message || "No se han podido guardar los datos. Inténtalo de nuevo." });
          }
        }
      });
      return;
    }
    if (request.method !== "GET") {
      sendJson(response, 405, { ok: false, error: "Método no permitido." });
      return;
    }
    let relative = decodeURIComponent(url.pathname);
    if (relative === "/") relative = "/index.html";
    const filePath = path.resolve(PUBLIC_DIRECTORY, `.${relative}`);
    if (!filePath.startsWith(`${PUBLIC_DIRECTORY}${path.sep}`)) {
      response.writeHead(404); response.end("No encontrado"); return;
    }
    fs.readFile(filePath, (error, content) => {
      if (error) { response.writeHead(error.code === "ENOENT" ? 404 : 500); response.end("No encontrado"); return; }
      response.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream" });
      response.end(content);
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, "localhost", () => console.log(`Diario de Estudio: http://localhost:${PORT}`));
}

module.exports = { createServer, PORT };
