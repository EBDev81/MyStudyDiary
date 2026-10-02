const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createInitialDataDocument, validateDataDocument, normalizeSession,
  isValidLocalDateText, formatLocalDate, parseLocalDate, getTodayLocal,
  calculateWeeklyProgress, calculateCurrentStreak, calculateMonthlyStudyDays
} = require('../app.js');

test('crea y valida el documento inicial', () => {
  const document = createInitialDataDocument();
  assert.equal(document.version, 1);
  assert.deepEqual(document.sesiones, []);
  assert.equal(document.objetivoSemanal, null);
  assert.equal(document.metadata.migration.status, 'pending');
  assert.equal(document.metadata.completedAt, undefined);
  assert.equal(document.metadata.successfulWrites, 0);
  assert.equal(document.metadata.backupSuccessfulWrites, 0);
  assert.equal(validateDataDocument(document), true);
});

test('valida esquema estricto sin mutar y conserva campos desconocidos', () => {
  const document = createInitialDataDocument();
  document.extra = { conservar: true };
  document.sesiones.push({ fecha: '2026-10-02', tema: 'JS', minutos: 20, extra: 'x' });
  const before = structuredClone(document);
  assert.equal(validateDataDocument(document), true);
  assert.deepEqual(document, before);
  assert.equal(validateDataDocument({ version: 2 }), false);
  assert.equal(validateDataDocument({ ...document, objetivoSemanal: 0 }), false);
  assert.equal(validateDataDocument({ ...document, sesiones: [{}] }), false);
});

test('normaliza formatos actuales e históricos sin mutar', () => {
  const source = { date: '2026-10-02', topic: 'Lectura', minutes: 30, creado: -1, extra: 1 };
  const result = normalizeSession(source);
  assert.deepEqual(result, { fecha: '2026-10-02', tema: 'Lectura', minutos: 30 });
  assert.deepEqual(source, { date: '2026-10-02', topic: 'Lectura', minutes: 30, creado: -1, extra: 1 });
  assert.equal(normalizeSession({ fecha: '2026-02-30', tema: 'x', minutos: 2 }), null);
});

test('objetivo y metadatos requieren tipos y estados coherentes', () => {
  const document = createInitialDataDocument();
  document.metadata.migration.sources = ['diario-de-estudio-sesiones'];
  assert.equal(validateDataDocument(document), true);
  document.metadata.migration.status = 'completed';
  document.metadata.migration.completedAt = '2026-10-02';
  assert.equal(validateDataDocument(document), true);
  document.metadata.migration.completedAt = null;
  assert.equal(validateDataDocument(document), false);
});

test('rechaza fuentes de migración no autorizadas', () => {
  const document = createInitialDataDocument();
  document.metadata.migration.sources = ['fuente-inventada'];
  assert.equal(validateDataDocument(document), false);
});

test('fechas locales, today y estadísticas excluyen futuras', () => {
  const today = new Date(2026, 9, 2, 12);
  assert.equal(formatLocalDate(today), '2026-10-02');
  assert.equal(getTodayLocal(today), '2026-10-02');
  assert.equal(isValidLocalDateText('2026-10-02'), true);
  assert.equal(isValidLocalDateText('2026-02-29'), false);
  assert.equal(formatLocalDate(parseLocalDate('2026-10-02')), '2026-10-02');
  const sessions = [
    { fecha: '2026-10-02', tema: 'a', minutos: 20 },
    { fecha: '2026-10-02', tema: 'b', minutos: 10 },
    { fecha: '2026-10-03', tema: 'futuro', minutos: 99 }
  ];
  assert.equal(calculateWeeklyProgress(sessions, today), 30);
  assert.equal(calculateCurrentStreak(sessions, today), 1);
  assert.equal(calculateMonthlyStudyDays(sessions, today), 1);
});
