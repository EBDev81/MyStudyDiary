const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildSessionPaginationView } = require("../app.js");

test("la estructura HTML reserva una paginación accesible", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<nav[^>]+aria-label="Paginación de sesiones"/);
  assert.match(html, /class="paginacion-controles"/);
  assert.match(html, /<nav[^>]+id="paginacion"/);
  assert.match(html, /id="paginacion-controles"[^>]+class="paginacion-controles"/);
  assert.equal((html.match(/id="paginacion-anuncio"/g) || []).length, 1);
  assert.match(html, /id="paginacion-anuncio"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /id="paginacion-controles"[^>]+aria-label="Controles de paginación"/);
  for (const label of ["Primera página", "Página anterior", "Página siguiente", "Última página"]) {
    assert.match(html, new RegExp(`aria-label="${label}"`));
  }
  assert.match(html, /aria-label="Página 1"/);
});

test("la paginación vacía permanece oculta y el anuncio no anuncia nada", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<nav[^>]+class="paginacion"[^>]+hidden/);
  assert.match(html, /id="paginacion-anuncio"[^>]*><\/p>/);
});

test("los controles base conservan un objetivo táctil accesible", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  assert.match(css, /\.paginacion-controles[^}]*min-height:\s*44px/);
  assert.match(css, /\.paginacion-boton[^}]*min-width:\s*44px/);
  assert.match(css, /\.paginacion-boton[^}]*min-height:\s*44px/);
});

test("la navegación usa el rectángulo interior y solo desplaza el carrusel", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(source, /getBoundingClientRect\(\)/);
  assert.match(source, /scrollLeft\s*[+-]=/);
  assert.match(source, /borderLeftWidth/);
  assert.match(source, /borderRightWidth/);
  assert.doesNotMatch(source, /scrollIntoView/);
  assert.doesNotMatch(source, /window\.scrollTo/);
});

test("los errores no sustituyen el estado confirmado de sesiones", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const loadBlock = source.slice(source.indexOf("async function cargarDatos"), source.indexOf("function mostrarError"));
  assert.match(loadBlock, /documento = result\.data/);
  assert.match(loadBlock, /sesiones = documento\.sesiones\.slice\(\)/);
  assert.doesNotMatch(loadBlock, /sesiones\s*=\s*\[\]\s*;/);
});

const session = (fecha, creado, extra = {}) => ({ fecha, tema: "Tema", minutos: 25, ...(creado === undefined ? {} : { creado }), ...extra });
const empty = { pageItems: [], visiblePages: [], totalPages: 0, currentPage: 0, hasPrevious: false, hasNext: false };

test("devuelve vistas vacías y pagina tamaños límite", () => {
  assert.deepEqual(buildSessionPaginationView([]), empty);
  for (const count of [1, 9, 10]) {
    const items = Array.from({ length: count }, (_, i) => session(`2026-01-${String(i + 1).padStart(2, "0")}`));
    const view = buildSessionPaginationView(items);
    assert.equal(view.totalPages, 1);
    assert.equal(view.currentPage, 1);
    assert.equal(view.pageItems.length, count);
    assert.deepEqual(view.visiblePages, [1]);
    assert.equal(view.hasPrevious, false);
    assert.equal(view.hasNext, false);
  }
  const eleven = Array.from({ length: 11 }, (_, i) => session(`2026-01-${String(i + 1).padStart(2, "0")}`));
  assert.equal(buildSessionPaginationView(eleven).totalPages, 2);
  assert.equal(buildSessionPaginationView(eleven, 2).pageItems.length, 1);
});

test("normaliza páginas inválidas y calcula flags", () => {
  const items = Array.from({ length: 101 }, (_, i) => session(`2026-01-${String((i % 28) + 1).padStart(2, "0")}`));
  for (const requested of [undefined, 0, -1, 1.5, "2", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(buildSessionPaginationView(items, requested).currentPage, 1);
  }
  assert.deepEqual(buildSessionPaginationView(items, 1).visiblePages, [1, 2, 3, 4, 5]);
  assert.deepEqual(buildSessionPaginationView(items, 6).visiblePages, [4, 5, 6, 7, 8]);
  assert.deepEqual(buildSessionPaginationView(items, 8).visiblePages, [6, 7, 8, 9, 10]);
  assert.equal(buildSessionPaginationView(items, 2).hasPrevious, true);
  assert.equal(buildSessionPaginationView(items, 2).hasNext, true);
  assert.equal(buildSessionPaginationView(items, 9).currentPage, 9);
  assert.equal(buildSessionPaginationView(items, 11).hasNext, false);
});

test("ordena por fecha, creado válido descendente y desempate estable", () => {
  const first = session("2026-02-01", 10, { id: "first" });
  const second = session("2026-02-01", 20, { id: "second", desconocido: true });
  const invalid = session("2026-02-01", undefined, { id: "invalid" });
  const older = session("2026-01-31", 99, { id: "older" });
  const sameA = session("2026-01-30", undefined, { id: "a" });
  const sameB = session("2026-01-30", undefined, { id: "b" });
  const input = [first, invalid, older, sameA, second, sameB];
  const before = input.slice();
  const view = buildSessionPaginationView(input);
  assert.deepEqual(view.pageItems.map(item => item.id), ["second", "first", "invalid", "older", "a", "b"]);
  assert.strictEqual(view.pageItems[0], second);
  assert.strictEqual(view.pageItems[5], sameB);
  assert.deepEqual(input, before);
});

test("mantiene referencias, máximo diez y rechaza entradas inválidas sin mutar", () => {
  const items = Array.from({ length: 21 }, (_, i) => session(`2026-03-${String((i % 9) + 1).padStart(2, "0")}`, i + 1));
  assert.equal(buildSessionPaginationView(items, 2).pageItems.length, 10);
  assert.ok(items.includes(buildSessionPaginationView(items, 2).pageItems[0]));
  for (const value of [null, {}, "sesiones", [session("2026-01-01"), { fecha: "2026-01-01" }], [session("2026-01-01"), session("01-01-2026")]]) {
    const snapshot = Array.isArray(value) ? value.slice() : value;
    assert.deepEqual(buildSessionPaginationView(value), empty);
    if (Array.isArray(value)) assert.deepEqual(value, snapshot);
  }
});
