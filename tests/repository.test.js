const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createInitialDataDocument } = require("../app.js");
const { createRepository, CORRUPTION_MESSAGE, DataReadError, isValidClearRequest, operationFingerprint, buildClearedDocument, deriveBackupPending } = require("../repository.js");

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "diario-repository-"));
  return { directory, file: path.join(directory, "data.json"), backup: path.join(directory, "data.backup.json") };
}

test("crea el principal solo cuando no existe", () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  assert.deepEqual(repository.read(), createInitialDataDocument());
  assert.equal(JSON.parse(fs.readFileSync(paths.file, "utf8")).version, 1);
});

test("bloquea principal vacío, corrupto, parcial o con tipos inválidos sin sobrescribirlo", () => {
  for (const content of ["", "{", "[]", JSON.stringify({ version: 1 })]) {
    const paths = fixture(); fs.writeFileSync(paths.file, content);
    assert.throws(() => createRepository({ dataFile: paths.file }).read(), (error) => error instanceof DataReadError && error.message === CORRUPTION_MESSAGE);
    assert.equal(fs.readFileSync(paths.file, "utf8"), content);
  }
});

test("valida el backup con el mismo esquema y nunca lo restaura", () => {
  const paths = fixture();
  fs.writeFileSync(paths.file, JSON.stringify(createInitialDataDocument()));
  fs.writeFileSync(paths.backup, "");
  const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  assert.throws(() => repository.readBackup(), (error) => error.message === CORRUPTION_MESSAGE);
  assert.deepEqual(repository.read(), createInitialDataDocument());
});

test("serializa operaciones, hace idempotencia y rechaza payload conflictivo", async () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file });
  const first = await repository.enqueue({ operationId: "op-1", type: "session", payload: { fecha: "2026-10-02", tema: "A", minutos: 20 } });
  const second = await repository.enqueue({ operationId: "op-2", type: "goal", payload: { objetivoSemanal: 100 } });
  assert.equal(first.ok, true);
  assert.equal(second.document.objetivoSemanal, 100);
  assert.deepEqual(await repository.enqueue({ operationId: "op-1", type: "session", payload: { fecha: "2026-10-02", tema: "A", minutos: 20 } }), first);
  await assert.rejects(repository.enqueue({ operationId: "op-1", type: "session", payload: { fecha: "2026-10-02", tema: "B", minutos: 20 } }), /operación ya existe/);
  assert.equal(repository.read().sesiones.length, 1);
  assert.equal(repository.read().metadata.successfulWrites, 2);
});

test("valida el contrato raíz exacto de clear-main-data sin depender del orden", () => {
  const request = { confirmation: "BORRAR TODO", operationId: "clear-1", type: "clear-main-data" };
  assert.equal(isValidClearRequest(request), true);
  assert.equal(isValidClearRequest({ type: "clear-main-data", operationId: "clear-1", confirmation: "BORRAR TODO", extra: true }), false);
  assert.equal(isValidClearRequest({ type: "clear-main-data", operationId: "", confirmation: "BORRAR TODO" }), false);
  assert.equal(isValidClearRequest({ type: "clear-main-data", operationId: 1, confirmation: "BORRAR TODO" }), false);
  assert.equal(isValidClearRequest({ type: "clear-main-data", operationId: "clear-1", confirmation: "BORRAR" }), false);
  assert.equal(isValidClearRequest({ type: "session", operationId: "clear-1", confirmation: "BORRAR TODO" }), false);
});

test("construye un documento vacío conservando raíz y metadatos", () => {
  const document = { version: 1, objetivoSemanal: 120,
    sesiones: [{ fecha: "2026-10-01", tema: "x", minutos: 20, desconocido: true }],
    metadata: { migration: { status: "pending", sources: [], ignoredSources: [], completedAt: null }, successfulWrites: 7, backupSuccessfulWrites: 1, extra: "m" }, extra: "r" };
  const result = buildClearedDocument(document);
  assert.deepEqual(result.document.sesiones, []);
  assert.equal(result.deletedSessions, 1);
  assert.equal(result.document.extra, "r");
  assert.equal(result.document.metadata.extra, "m");
  assert.equal(deriveBackupPending(result.document), true);
  assert.equal(document.sesiones.length, 1);
});

test("clear-main-data vacía sesiones sin contadores ni backup", async () => {
  const paths = fixture();
  const document = { version: 1, sesiones: [{ fecha: "2026-10-01", tema: "x", minutos: 20 }], objetivoSemanal: 120,
    metadata: { migration: { status: "pending", sources: [], ignoredSources: [], completedAt: null }, successfulWrites: 2, backupSuccessfulWrites: 1 } };
  fs.writeFileSync(paths.file, JSON.stringify(document));
  fs.writeFileSync(paths.backup, "backup-intacto");
  const before = fs.readFileSync(paths.backup);
  const result = await createRepository({ dataFile: paths.file, backupFile: paths.backup }).enqueue({ type: "clear-main-data", operationId: "clear-test", confirmation: "BORRAR TODO" });
  assert.equal(result.deletedSessions, 1);
  assert.deepEqual(result.document.sesiones, []);
  assert.equal(result.document.metadata.successfulWrites, 2);
  assert.deepEqual(fs.readFileSync(paths.backup), before);
});

test("clear distingue principal ausente y principal corrupto sin tocar el backup", async () => {
  for (const kind of ["missing", "corrupt"]) {
    const paths = fixture();
    fs.writeFileSync(paths.backup, "backup-byte-a-byte");
    if (kind === "corrupt") fs.writeFileSync(paths.file, "");
    const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
    await assert.rejects(repository.enqueue({ type: "clear-main-data", operationId: kind, confirmation: "BORRAR TODO" }), error =>
      error.code === (kind === "missing" ? "MAIN_DATA_MISSING" : "DATA_CORRUPT"));
    assert.deepEqual(fs.readFileSync(paths.backup), Buffer.from("backup-byte-a-byte"));
    assert.equal(kind === "missing" ? fs.existsSync(paths.file) : fs.readFileSync(paths.file, "utf8"), kind === "missing" ? false : "");
  }
});

test("clear acepta cero sesiones y objetivo ausente es corrupción", async () => {
  const paths = fixture();
  const document = createInitialDataDocument();
  fs.writeFileSync(paths.file, JSON.stringify(document));
  const repository = createRepository({ dataFile: paths.file });
  const result = await repository.enqueue({ type: "clear-main-data", operationId: "empty", confirmation: "BORRAR TODO" });
  assert.equal(result.deletedSessions, 0);
  assert.equal(result.document.metadata.successfulWrites, document.metadata.successfulWrites);
  const broken = { ...document }; delete broken.objetivoSemanal;
  fs.writeFileSync(paths.file, JSON.stringify(broken));
  await assert.rejects(repository.enqueue({ type: "clear-main-data", operationId: "no-goal", confirmation: "BORRAR TODO" }), error => error.code === "DATA_CORRUPT");
});

test("clear no lee ni modifica backup válido, antiguo, corrupto o ausente", async () => {
  for (const backup of [null, "corrupto", JSON.stringify(createInitialDataDocument()), JSON.stringify({ ...createInitialDataDocument(), sesiones: [{ fecha: "2020-01-01", tema: "antigua", minutos: 1 }] })]) {
    const paths = fixture(); fs.writeFileSync(paths.file, JSON.stringify(createInitialDataDocument()));
    if (backup !== null) fs.writeFileSync(paths.backup, backup);
    const before = backup === null ? null : fs.readFileSync(paths.backup);
    await createRepository({ dataFile: paths.file, backupFile: paths.backup }).enqueue({ type: "clear-main-data", operationId: `b-${String(backup)}`, confirmation: "BORRAR TODO" });
    assert.equal(backup === null ? fs.existsSync(paths.backup) : Buffer.compare(before, fs.readFileSync(paths.backup)), backup === null ? false : 0);
  }
});

test("clear diferencia fallo de escritura y conserva resultado sin rollback tras fallo de validación", async () => {
  const paths = fixture(); fs.writeFileSync(paths.file, JSON.stringify(createInitialDataDocument()));
  const originalWrite = fs.writeFileSync;
  fs.writeFileSync = (file, ...args) => { if (file.includes(".tmp")) throw new Error("fallo"); return originalWrite(file, ...args); };
  try {
    const repository = createRepository({ dataFile: paths.file });
    await assert.rejects(repository.enqueue({ type: "clear-main-data", operationId: "write-fail", confirmation: "BORRAR TODO" }), e => e.code === "CLEAR_WRITE_FAILED");
  } finally { fs.writeFileSync = originalWrite; }
});

test("clear memoriza repetición y devuelve conflicto exacto", async () => {
  const paths = fixture(); const repository = createRepository({ dataFile: paths.file });
  repository.read();
  const request = { type: "clear-main-data", operationId: "same", confirmation: "BORRAR TODO" };
  const first = await repository.enqueue(request);
  assert.deepEqual(await repository.enqueue({ confirmation: request.confirmation, operationId: request.operationId, type: request.type }), first);
  await assert.rejects(repository.enqueue({ ...request, confirmation: "otra" }), e => e.code === "IDEMPOTENCY_CONFLICT" && e.message === "La operación ya existe con otros datos.");
});

test("el fingerprint de clear ignora orden, prototipo y propiedades no enumerables", () => {
  const first = { type: "clear-main-data", operationId: "clear-1", confirmation: "BORRAR TODO" };
  const second = { confirmation: "BORRAR TODO", operationId: "clear-1", type: "clear-main-data" };
  Object.defineProperty(second, "hidden", { value: "ignored", enumerable: false });
  Object.setPrototypeOf(second, { extra: "ignored" });
  assert.equal(operationFingerprint(first), operationFingerprint(second));
  assert.notEqual(operationFingerprint(first), operationFingerprint({ ...first, operationId: "clear-2" }));
});

test("rechaza contratos clear inválidos sin mutar ni crear datos", async () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  const invalid = { type: "clear-main-data", operationId: "clear-1", confirmation: "no", extra: true };
  await assert.rejects(repository.enqueue(invalid), /confirmación de borrado/);
  assert.equal(fs.existsSync(paths.file), false);
  assert.equal(fs.existsSync(paths.backup), false);
});

test("restablecer objetivo exige confirmación exacta y conserva sesiones", async () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file });
  await repository.enqueue({ operationId: "s", type: "session", payload: { fecha: "2026-10-02", tema: "A", minutos: 20 } });
  await repository.enqueue({ operationId: "g", type: "goal", payload: { objetivoSemanal: 100 } });
  await assert.rejects(repository.enqueue({ operationId: "r1", type: "resetGoal", payload: { confirmation: "no" } }));
  const result = await repository.enqueue({ operationId: "r2", type: "resetGoal", payload: { confirmation: "¿Quieres restablecer el objetivo semanal?" } });
  assert.equal(result.document.objetivoSemanal, null);
  assert.equal(result.document.sesiones.length, 1);
});

test("intenta el backup en la quinta escritura y deja aviso pendiente si falla", async () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  for (let i = 1; i <= 4; i++) await repository.enqueue({ operationId: `w${i}`, type: "session", payload: { fecha: "2026-10-02", tema: `A${i}`, minutos: 20 } });
  assert.equal(fs.existsSync(paths.backup), false);
  const fifth = await repository.enqueue({ operationId: "w5", type: "session", payload: { fecha: "2026-10-02", tema: "A5", minutos: 20 } });
  assert.equal(fifth.backupPending, false);
  assert.equal(repository.readBackup().metadata.backupSuccessfulWrites, 5);
  assert.equal(repository.read().metadata.successfulWrites, 5);
});

test("si falla el backup, la siguiente escritura lo reintenta", async () => {
  const paths = fixture();
  const originalRename = fs.renameSync;
  let failBackup = true;
  fs.renameSync = (from, to) => {
    if (failBackup && to === paths.backup) throw new Error("fallo simulado");
    return originalRename(from, to);
  };
  try {
    const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
    for (let i = 1; i <= 5; i++) await repository.enqueue({ operationId: `f${i}`, type: "session", payload: { fecha: "2026-10-02", tema: `F${i}`, minutos: 10 } });
    assert.equal(repository.read().metadata.backupSuccessfulWrites, 0);
    failBackup = false;
    const result = await repository.enqueue({ operationId: "f6", type: "session", payload: { fecha: "2026-10-02", tema: "F6", minutos: 10 } });
    assert.equal(result.backupPending, false);
    assert.equal(repository.read().metadata.backupSuccessfulWrites, 6);
  } finally { fs.renameSync = originalRename; }
});

test("un backup inválido no restaura el principal ni se usa automáticamente", async () => {
  const paths = fixture();
  fs.writeFileSync(paths.backup, "corrupto");
  const repository = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  assert.throws(() => repository.readBackup(), /No se pueden leer/);
  for (let i = 1; i <= 5; i++) await repository.enqueue({ operationId: `x${i}`, type: "session", payload: { fecha: "2026-10-02", tema: `X${i}`, minutos: 10 } });
  assert.equal(repository.read().sesiones.length, 5);
  assert.equal(repository.readBackup().metadata.successfulWrites, 5);
});

test("los contadores se conservan al crear otro repositorio", async () => {
  const paths = fixture();
  const first = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  await first.enqueue({ operationId: "persist-1", type: "session", payload: { fecha: "2026-10-02", tema: "A", minutos: 10 } });
  const restarted = createRepository({ dataFile: paths.file, backupFile: paths.backup });
  assert.equal(restarted.read().metadata.successfulWrites, 1);
  assert.equal(restarted.read().metadata.backupSuccessfulWrites, 0);
});

test("la migración exige decisión ante objetivos distintos y usa el inventario autorizado", async () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file });
  await repository.enqueue({ operationId: "old-goal", type: "goal", payload: { objetivoSemanal: 100 } });
  const base = { operationId: "mig", type: "migration", payload: {
    confirmed: true, completedAt: "2026-10-02",
    sources: { "diario-de-estudio-objetivo-semanal": 200 },
    sourceNames: ["diario-de-estudio-objetivo-semanal"]
  }};
  await assert.rejects(repository.enqueue(base), /No se han podido guardar/);
  assert.equal(repository.read().objetivoSemanal, 100);
  const result = await repository.enqueue({ ...base, operationId: "mig-ok", payload: { ...base.payload, goalDecision: 200 } });
  assert.equal(result.document.objetivoSemanal, 200);
  assert.deepEqual(result.document.metadata.migration.sources, ["diario-de-estudio-objetivo-semanal"]);
});

test("la migración ignora fuentes autorizadas inválidas y conserva el inventario real", async () => {
  const paths = fixture();
  const repository = createRepository({ dataFile: paths.file });
  const result = await repository.enqueue({ operationId: "mig-invalid", type: "migration", payload: {
    confirmed: true, completedAt: "2026-10-02",
    sources: {
      "diario-de-estudio-sesiones": [{ fecha: "2026-10-02", tema: "válida", minutos: 20 }, { fecha: "no", tema: "rota", minutos: 0 }],
      "diario-estudio-sesiones": { incompleto: true },
      "diario-de-estudio-objetivo-semanal": "no-json-valido"
    }, sourceNames: ["diario-de-estudio-sesiones", "diario-estudio-sesiones", "diario-de-estudio-objetivo-semanal"]
  }});
  assert.equal(result.document.sesiones.length, 1);
  assert.deepEqual(result.document.metadata.migration.sources, []);
  assert.equal(result.document.metadata.migration.sources.includes("diario-de-estudio-sesiones"), false);
  assert.deepEqual(result.document.metadata.migration.ignoredSources, [
    { source: "diario-de-estudio-sesiones", reason: "registros inválidos", count: 1 },
    { source: "diario-estudio-sesiones", reason: "formato inválido o incompleto", count: 1 },
    { source: "diario-de-estudio-objetivo-semanal", reason: "formato inválido o incompleto", count: 1 }
  ]);
});
