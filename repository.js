const fs = require("node:fs");
const path = require("node:path");
const { createInitialDataDocument, validateDataDocument, normalizeSession, validateWeeklyGoal, mergeMigrationSources, isValidLocalDateText } = require("./app.js");

const DATA_DIRECTORY = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIRECTORY, "data.json");
const BACKUP_FILE = path.join(DATA_DIRECTORY, "data.backup.json");
const CORRUPTION_MESSAGE = "No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.";
const WRITE_MESSAGE = "No se han podido guardar los datos. Inténtalo de nuevo.";

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

function applyOperation(document, operation) {
  const next = structuredClone(document);
  if (operation.type === "session") {
    const session = normalizeSession(operation.payload);
    if (!session) throw new Error(WRITE_MESSAGE);
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
  function enqueue(operation) {
    if (!operation || typeof operation.operationId !== "string" || !operation.operationId) return Promise.reject(new Error(WRITE_MESSAGE));
    const key = operation.operationId;
    const hash = fingerprint(operation);
    if (known.has(key)) {
      if (known.get(key).hash !== hash) return Promise.reject(new Error("operationId ya utilizado con otro payload"));
      return known.get(key).promise;
    }
    const promise = queue.then(() => {
      const current = readDataFile(dataFile);
      const next = applyOperation(current, operation);
      const persisted = atomicWrite(dataFile, next);
      let backupPending = shouldBackup(persisted);
      if (backupPending) {
        try {
          const backedUp = persistBackup(backupFile, persisted);
          // Solo después de validar la copia se confirma su contador en el principal.
          persisted.metadata.backupSuccessfulWrites = backedUp.metadata.backupSuccessfulWrites;
          atomicWrite(dataFile, persisted);
          backupPending = false;
        } catch {
          // El principal ya está validado: un fallo de backup nunca lo deshace.
        }
      }
      return { ok: true, document: readDataFile(dataFile), backupPending };
    }).catch((error) => {
      if (error instanceof DataReadError) throw error;
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
  , shouldBackup, persistBackup
};
