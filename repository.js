const fs = require("node:fs");
const path = require("node:path");
const { createInitialDataDocument, validateDataDocument, normalizeSession, validateWeeklyGoal, mergeMigrationSources, isValidLocalDateText } = require("./app.js");

const NORMALIZABLE = "NORMALIZABLE";
const NORMALIZED = "NORMALIZED";
const DATA_CORRUPT = "DATA_CORRUPT";
const MIGRATION_SOURCES = new Set(["diario-de-estudio-sesiones", "diario-estudio-sesiones", "diario-de-estudio-objetivo-semanal"]);

function validPositiveId(value) { return Number.isSafeInteger(value) && value > 0; }

function validMigration(migration) {
  if (!migration || typeof migration !== "object" || Array.isArray(migration) ||
      !["pending", "failed", "completed"].includes(migration.status) || !Array.isArray(migration.sources) ||
      new Set(migration.sources).size !== migration.sources.length ||
      !migration.sources.every(source => typeof source === "string" && MIGRATION_SOURCES.has(source)) ||
      !Array.isArray(migration.ignoredSources) ||
      new Set([...migration.sources, ...migration.ignoredSources.map(item => item && item.source)]).size !== migration.sources.length + migration.ignoredSources.length ||
      !migration.ignoredSources.every(item => item && typeof item === "object" && typeof item.source === "string" && MIGRATION_SOURCES.has(item.source) && typeof item.reason === "string" && Number.isSafeInteger(item.count) && item.count >= 0) ||
      !Object.prototype.hasOwnProperty.call(migration, "completedAt")) return false;
  return migration.status === "completed" ? typeof migration.completedAt === "string" && isValidLocalDateText(migration.completedAt) : migration.completedAt === null;
}

function classifyDataDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document) || document.version !== 1 || !Array.isArray(document.sesiones) ||
      !Object.prototype.hasOwnProperty.call(document, "objetivoSemanal") || !document.metadata || typeof document.metadata !== "object" || Array.isArray(document.metadata)) return DATA_CORRUPT;
  if (document.objetivoSemanal !== null && !validateWeeklyGoal(document.objetivoSemanal)) return DATA_CORRUPT;
  const metadata = document.metadata;
  if (!validMigration(metadata.migration) || !Number.isSafeInteger(metadata.successfulWrites) || metadata.successfulWrites < 0 ||
      !Number.isSafeInteger(metadata.backupSuccessfulWrites) || metadata.backupSuccessfulWrites < 0 || metadata.backupSuccessfulWrites > metadata.successfulWrites) return DATA_CORRUPT;
  if (document.sesiones.some(session => !session || typeof session !== "object" || Array.isArray(session) ||
      !isValidLocalDateText(session.fecha) || typeof session.tema !== "string" || !session.tema.trim() || !Number.isSafeInteger(session.minutos) || session.minutos <= 0)) return DATA_CORRUPT;
  const ids = document.sesiones.map(session => session.id);
  return ids.every(validPositiveId) && new Set(ids).size === ids.length && validPositiveId(metadata.nextSessionId) && metadata.nextSessionId > Math.max(0, ...ids) ? NORMALIZED : NORMALIZABLE;
}

function normalizeDataDocument(document) {
  if (classifyDataDocument(document) === DATA_CORRUPT) return null;
  const next = structuredClone(document);
  const used = new Set();
  let candidate = 1;
  for (const session of next.sesiones) {
    if (!validPositiveId(session.id) || used.has(session.id)) {
      while (used.has(candidate)) candidate++;
      if (!Number.isSafeInteger(candidate)) return null;
      session.id = candidate; used.add(candidate);
    } else used.add(session.id);
    if (Object.prototype.hasOwnProperty.call(session, "creado") && !validPositiveId(session.creado)) delete session.creado;
  }
  let nextId = used.size ? Math.max(...used) + 1 : 1;
  if (!Number.isSafeInteger(nextId)) return null;
  next.metadata.nextSessionId = nextId;
  return next;
}

const DATA_DIRECTORY = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIRECTORY, "data.json");
const BACKUP_FILE = path.join(DATA_DIRECTORY, "data.backup.json");
const CORRUPTION_MESSAGE = "No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.";
const WRITE_MESSAGE = "No se han podido guardar los datos. Inténtalo de nuevo.";
const CLEAR_MESSAGES = {
  INVALID_CLEAR_REQUEST: "La confirmación de borrado no es válida.",
  IDEMPOTENCY_CONFLICT: "La operación ya existe con otros datos.",
  MAIN_DATA_MISSING: "No se pueden borrar los datos porque no existe el archivo principal.",
  DATA_CORRUPT: CORRUPTION_MESSAGE,
  CLEAR_WRITE_FAILED: "No se han podido borrar los datos. Inténtalo de nuevo."
};

function clearError(code) {
  const error = new Error(CLEAR_MESSAGES[code]);
  error.code = code;
  return error;
}

class DataReadError extends Error {
  constructor(filePath, cause) {
    super(CORRUPTION_MESSAGE);
    this.name = "DataReadError";
    this.filePath = filePath;
    this.cause = cause;
  }
}

function writeNewDocument(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const document = createInitialDataDocument();
  fs.writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return document;
}

function readValidatedFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new DataReadError(filePath, error);
  }
  // JSON.parse deliberately rejects empty and partially written files.
  let document;
  try {
    document = JSON.parse(raw);
  } catch (error) {
    throw new DataReadError(filePath, error);
  }
  if (!validateDataDocument(document)) throw new DataReadError(filePath);
  return document;
}

function atomicWrite(filePath, document) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    fs.renameSync(temporary, filePath);
    return readValidatedFile(filePath);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function shouldBackup(document) {
  return document.metadata.successfulWrites - document.metadata.backupSuccessfulWrites >= 5;
}

function persistBackup(backupFile, document) {
  const backup = structuredClone(document);
  backup.metadata.backupSuccessfulWrites = backup.metadata.successfulWrites;
  // Valida antes de sustituir el destino: un backup previo nunca queda
  // reemplazado por un archivo corrupto o incompleto.
  const temporary = `${backupFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(temporary, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
    const validated = readValidatedFile(temporary);
    fs.renameSync(temporary, backupFile);
    return validated;
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function fingerprint(operation) {
  return JSON.stringify({ type: operation.type, payload: operation.payload });
}

function isValidClearRequest(operation) {
  if (!operation || typeof operation !== "object") return false;
  const keys = Object.keys(operation);
  return keys.length === 3 && keys.includes("type") && keys.includes("operationId") && keys.includes("confirmation") &&
    operation.type === "clear-main-data" && typeof operation.operationId === "string" && operation.operationId.length > 0 &&
    operation.confirmation === "BORRAR TODO";
}

function operationFingerprint(operation) {
  return JSON.stringify({
    type: operation.type,
    operationId: operation.operationId,
    confirmation: operation.confirmation
  });
}

const SESSION_MESSAGES = {
  INVALID_SESSION_OPERATION: "La operación de sesión no es válida.",
  INVALID_SESSION_DATA: "Los datos de la sesión no son válidos.",
  SESSION_NOT_FOUND: "La sesión ya no existe.",
  IDEMPOTENCY_CONFLICT: "La operación ya existe con otros datos."
};
const OPERATION_MESSAGES = {
  MAIN_DATA_MISSING: "No se pueden leer los datos porque no existe el archivo principal.",
  DATA_CORRUPT: CORRUPTION_MESSAGE,
  WRITE_FAILED: WRITE_MESSAGE,
  ID_ALLOCATION_FAILED: "No se pudo asignar un identificador a la sesión."
};

function sessionError(code) {
  const error = new Error(SESSION_MESSAGES[code]);
  error.code = code;
  return error;
}

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

// Valida la forma antes de entrar en la cola; los datos de la sesión tienen un error distinto.
function validateSessionOperation(operation) {
  if (!operation || typeof operation !== "object" || Array.isArray(operation) ||
      !exactKeys(operation, ["type", "operationId", "payload"]) ||
      typeof operation.operationId !== "string" || operation.operationId.trim() === "") return "INVALID_SESSION_OPERATION";
  const payload = operation.payload;
  if (operation.type === "session") {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "INVALID_SESSION_OPERATION";
    const keys = Object.keys(payload);
    if (!(keys.length === 3 || keys.length === 4) || !["fecha", "tema", "minutos"].every(key => keys.includes(key)) ||
        (keys.includes("creado") && (!Number.isSafeInteger(payload.creado) || payload.creado <= 0))) return "INVALID_SESSION_OPERATION";
    return isValidLocalDateText(payload.fecha) && typeof payload.tema === "string" && payload.tema.trim() !== "" &&
      Number.isSafeInteger(payload.minutos) && payload.minutos > 0 ? null : "INVALID_SESSION_DATA";
  }
  if (operation.type === "goal") {
    if (!exactKeys(payload, ["objetivoSemanal"])) return "INVALID_SESSION_OPERATION";
    return validateWeeklyGoal(payload.objetivoSemanal) ? null : "INVALID_SESSION_DATA";
  }
  if (operation.type === "resetGoal") {
    return exactKeys(payload, ["confirmation"]) &&
      payload.confirmation === "¿Quieres restablecer el objetivo semanal?"
      ? null : "INVALID_SESSION_OPERATION";
  }
  if (!["edit-session", "delete-session"].includes(operation.type)) return "INVALID_SESSION_OPERATION";
  if (operation.type === "delete-session") {
    return exactKeys(payload, ["id"]) && validPositiveId(payload.id) ? null : "INVALID_SESSION_OPERATION";
  }
  if (!exactKeys(payload, ["id", "session"]) || !validPositiveId(payload.id) ||
      !exactKeys(payload.session, ["fecha", "tema", "minutos"])) return "INVALID_SESSION_OPERATION";
  const session = payload.session;
  return isValidLocalDateText(session.fecha) && typeof session.tema === "string" && session.tema.trim() !== "" &&
    Number.isSafeInteger(session.minutos) && session.minutos > 0 ? null : "INVALID_SESSION_DATA";
}

function sessionOperationFingerprint(operation) {
  const payload = operation.type === "delete-session"
    ? { id: operation.payload.id }
    : { id: operation.payload.id, session: { fecha: operation.payload.session.fecha, tema: operation.payload.session.tema.trim(), minutos: operation.payload.session.minutos } };
  return JSON.stringify({ type: operation.type, operationId: operation.operationId, payload });
}

// Construye el estado vacío sin reutilizar ningún dato de las sesiones.
function buildClearedDocument(document) {
  const next = structuredClone(document);
  const deletedSessions = next.sesiones.length;
  next.sesiones = [];
  return { document: next, deletedSessions };
}

function deriveBackupPending(document) {
  return document.metadata.successfulWrites - document.metadata.backupSuccessfulWrites >= 5;
}

function applyOperation(document, operation) {
  const next = structuredClone(document);
  if (operation.type === "session") {
    const session = normalizeSession(operation.payload);
    if (!session) throw new Error(WRITE_MESSAGE);
    session.id = next.metadata.nextSessionId;
    next.metadata.nextSessionId++;
    next.sesiones.push(session);
  } else if (operation.type === "goal") {
    if (!operation.payload || !validateWeeklyGoal(operation.payload.objetivoSemanal)) throw new Error(WRITE_MESSAGE);
    next.objetivoSemanal = operation.payload.objetivoSemanal;
  } else if (operation.type === "resetGoal") {
    if (!operation.payload || operation.payload.confirmation !== "¿Quieres restablecer el objetivo semanal?") throw new Error(WRITE_MESSAGE);
    next.objetivoSemanal = null;
  } else if (operation.type === "migration") {
    if (document.metadata.migration.status === "completed") throw new Error("La migración ya se ha completado.");
    const payload = operation.payload || {};
    if (payload.confirmed !== true || !isValidLocalDateText(payload.completedAt)) throw new Error("La migración requiere confirmación.");
    const allowedSources = new Set(["diario-de-estudio-sesiones", "diario-estudio-sesiones", "diario-de-estudio-objetivo-semanal"]);
    const sourceNames = Array.isArray(payload.sourceNames) ? payload.sourceNames : [];
    const invalidSourceNames = sourceNames.filter(source => typeof source !== "string" || !allowedSources.has(source));
    const sources = payload.sources || {};
    const unauthorized = Object.keys(sources).filter(source => !allowedSources.has(source));
    const ignoredSources = Array.isArray(payload.ignoredSources) ? structuredClone(payload.ignoredSources) : [];
    const validSources = {};
    const mergedSources = {};
    for (const source of allowedSources) {
      if (!Object.prototype.hasOwnProperty.call(sources, source)) continue;
      const value = sources[source];
      const isGoal = source === "diario-de-estudio-objetivo-semanal";
      if (isGoal ? validateWeeklyGoal(value) : Array.isArray(value)) {
        if (isGoal) {
          validSources[source] = value;
          mergedSources[source] = value;
        } else {
          const validRecords = value.filter(record => normalizeSession(record));
          const invalidCount = value.length - validRecords.length;
          if (invalidCount) {
            ignoredSources.push({ source, reason: "registros inválidos", count: invalidCount });
          } else {
            validSources[source] = value;
          }
          // Los registros válidos se migran aunque la fuente quede marcada como parcial.
          mergedSources[source] = validRecords;
        }
      } else {
        ignoredSources.push({ source, reason: "formato inválido o incompleto", count: 1 });
      }
    }
    const mergedInput = { ...mergedSources, goalDecision: payload.goalDecision };
    const merged = mergeMigrationSources(mergedInput, next);
    next.sesiones = merged.sesiones;
    next.objetivoSemanal = merged.objetivoSemanal;
    next.metadata.migration = {
      status: "completed", sources: [...new Set(Object.keys(validSources))],
      ignoredSources: [
        ...ignoredSources,
        ...invalidSourceNames.map(source => ({ source: String(source), reason: "fuente no permitida", count: 1 })),
        ...unauthorized.map(source => ({ source, reason: "fuente no permitida", count: 1 }))
      ],
      completedAt: payload.completedAt
    };
  } else if (operation.type === "edit-session" || operation.type === "delete-session") {
    const id = operation.payload.id;
    const index = next.sesiones.findIndex(session => session.id === id);
    if (index < 0) throw sessionError("SESSION_NOT_FOUND");
    if (operation.type === "delete-session") next.sesiones.splice(index, 1);
    else {
      const current = next.sesiones[index];
      next.sesiones[index] = { ...current, fecha: operation.payload.session.fecha,
        tema: operation.payload.session.tema.trim(), minutos: operation.payload.session.minutos };
    }
  } else throw new Error(WRITE_MESSAGE);
  if (operation.type !== "migration") next.metadata.successfulWrites++;
  return next;
}

function readDataFile(filePath = DATA_FILE) {
  if (!fs.existsSync(filePath)) return writeNewDocument(filePath);
  return readValidatedFile(filePath);
}

function readBackupFile(filePath = BACKUP_FILE) {
  if (!fs.existsSync(filePath)) return null;
  return readValidatedFile(filePath);
}

function createRepository({ dataFile = DATA_FILE, backupFile = BACKUP_FILE } = {}) {
  const known = new Map();
  let queue = Promise.resolve();
  function ensureNormalized() {
    const promise = queue.then(() => {
       let current;
       try { current = readDataFile(dataFile); }
       catch (error) {
         const corruption = new Error(CORRUPTION_MESSAGE);
         corruption.code = "DATA_CORRUPT";
         throw corruption;
       }
       const classification = classifyDataDocument(current);
       if (classification === NORMALIZED) return current;
       if (classification === DATA_CORRUPT) {
         const error = new Error(CORRUPTION_MESSAGE);
         error.code = "DATA_CORRUPT";
         throw error;
       }
       const normalized = normalizeDataDocument(current);
      if (!normalized) {
        const error = new Error(OPERATION_MESSAGES.ID_ALLOCATION_FAILED);
        error.code = "ID_ALLOCATION_FAILED";
        throw error;
      }
      try {
        atomicWrite(dataFile, normalized);
        return readValidatedFile(dataFile);
      } catch {
        const error = new Error(WRITE_MESSAGE);
        error.code = "WRITE_FAILED";
        throw error;
      }
    });
    queue = promise.catch(() => {});
    return promise;
  }
  function enqueue(operation) {
    if (operation && operation.type === "clear-main-data" && !isValidClearRequest(operation)) {
      if (typeof operation.operationId === "string" && known.has(operation.operationId) &&
          known.get(operation.operationId).hash !== operationFingerprint(operation)) {
        return Promise.reject(clearError("IDEMPOTENCY_CONFLICT"));
      }
      return Promise.reject(clearError("INVALID_CLEAR_REQUEST"));
    }
    if (!operation || typeof operation.operationId !== "string" || !operation.operationId) return Promise.reject(new Error(WRITE_MESSAGE));
    const key = operation.operationId;
    const hash = operation.type === "clear-main-data"
      ? operationFingerprint(operation)
      : (operation.type === "edit-session" || operation.type === "delete-session"
        ? sessionOperationFingerprint(operation)
        : fingerprint(operation));
    if (known.has(key)) {
       if (known.get(key).hash !== hash) return Promise.reject(clearError("IDEMPOTENCY_CONFLICT"));
      return known.get(key).promise;
    }
    const promise = queue.then(() => {
      if (operation.type === "clear-main-data") {
        // A diferencia de la lectura normal, borrar nunca crea el principal.
         if (!fs.existsSync(dataFile)) throw clearError("MAIN_DATA_MISSING");
         let current;
         try { current = readValidatedFile(dataFile); } catch { throw clearError("DATA_CORRUPT"); }
         const cleared = buildClearedDocument(current);
         let result;
         try {
           atomicWrite(dataFile, cleared.document);
           result = readValidatedFile(dataFile);
         } catch { throw clearError("CLEAR_WRITE_FAILED"); }
         return { ok: true, document: result, deletedSessions: cleared.deletedSessions,
           backupPending: deriveBackupPending(result) };
      }
      let current;
      if (!fs.existsSync(dataFile)) {
        if (operation.type === "edit-session" || operation.type === "delete-session") {
          const error = new Error(OPERATION_MESSAGES.MAIN_DATA_MISSING); error.code = "MAIN_DATA_MISSING"; throw error;
        }
        current = readDataFile(dataFile);
      }
      if (fs.existsSync(dataFile)) {
        try { current = readValidatedFile(dataFile); } catch { const error = new Error(CORRUPTION_MESSAGE); error.code = "DATA_CORRUPT"; throw error; }
      }
      const classification = classifyDataDocument(current);
      if (classification === DATA_CORRUPT) { const error = new Error(CORRUPTION_MESSAGE); error.code = "DATA_CORRUPT"; throw error; }
      if (classification === NORMALIZABLE) {
        const normalized = normalizeDataDocument(current);
        if (!normalized) { const error = new Error(OPERATION_MESSAGES.ID_ALLOCATION_FAILED); error.code = "ID_ALLOCATION_FAILED"; throw error; }
        try { atomicWrite(dataFile, normalized); } catch { const error = new Error(WRITE_MESSAGE); error.code = "WRITE_FAILED"; throw error; }
        try { current = readValidatedFile(dataFile); } catch { const error = new Error(WRITE_MESSAGE); error.code = "WRITE_FAILED"; throw error; }
      }
      const next = applyOperation(current, operation);
      let persisted;
      try { persisted = atomicWrite(dataFile, next); } catch { const error = new Error(WRITE_MESSAGE); error.code = "WRITE_FAILED"; throw error; }
      let backupPending = shouldBackup(persisted);
      if (!backupPending && (operation.type === "edit-session" || operation.type === "delete-session")) {
        try { readBackupFile(backupFile); } catch { backupPending = true; }
        if (!fs.existsSync(backupFile)) backupPending = true;
      }
      if (backupPending) {
        try {
          const backedUp = persistBackup(backupFile, persisted);
          // Solo después de validar la copia se confirma su contador en el principal.
          persisted.metadata.backupSuccessfulWrites = backedUp.metadata.backupSuccessfulWrites;
           try {
             atomicWrite(dataFile, persisted);
             backupPending = false;
           } catch { /* se reintentará al haber otra escritura */ }
        } catch {
          // El principal ya está validado: un fallo de backup nunca lo deshace.
        }
      }
      return { ok: true, document: readDataFile(dataFile), backupPending };
    }).catch((error) => {
       if (error.code) throw error;
       if (operation && operation.type === "clear-main-data") throw clearError("CLEAR_WRITE_FAILED");
      throw new Error(error.message === WRITE_MESSAGE ? WRITE_MESSAGE : WRITE_MESSAGE);
    });
    known.set(key, { hash, promise });
    queue = promise.catch(() => {});
    return promise;
  }
  return {
    dataFile,
    backupFile,
    read() { return readDataFile(dataFile); },
    ensureNormalized,
  readBackup() { return readBackupFile(backupFile); },
    shouldBackup,
    enqueue
  };
}

module.exports = {
  DATA_DIRECTORY, DATA_FILE, BACKUP_FILE, CORRUPTION_MESSAGE,
  DataReadError, createRepository, readDataFile, readBackupFile, atomicWrite,
  WRITE_MESSAGE,
  readValidatedFile
  , shouldBackup, persistBackup, isValidClearRequest, operationFingerprint,
  buildClearedDocument, deriveBackupPending
  , NORMALIZABLE, NORMALIZED, DATA_CORRUPT, classifyDataDocument, normalizeDataDocument,
  validateSessionOperation, sessionOperationFingerprint, sessionError, SESSION_MESSAGES
};
