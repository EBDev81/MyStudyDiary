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
const openClearButton = document.querySelector("#abrir-borrado");
const clearDialogLayer = document.querySelector("#dialogo-borrado-capa");
const clearDialog = document.querySelector("#dialogo-borrado");
const confirmClearButton = document.querySelector("#confirmar-borrado");
const cancelClearButton = document.querySelector("#cancelar-borrado");
const clearResult = document.querySelector("#resultado-borrado");
const clearTitle = document.querySelector("#titulo-confirmar-borrado");
const clearWarning = document.querySelector("#advertencia-borrado");
const pagination = document.querySelector(".paginacion");
const paginationAnnouncement = document.querySelector("#paginacion-anuncio");
const paginationControls = document.querySelector(".paginacion-controles");
const editLayer = document.querySelector("#dialogo-edicion-capa");
const editDialog = document.querySelector("#dialogo-edicion");
const editForm = document.querySelector("#formulario-edicion");
const editDate = document.querySelector("#edicion-fecha");
const editTopic = document.querySelector("#edicion-tema");
const editMinutes = document.querySelector("#edicion-minutos");
const editSave = document.querySelector("#guardar-edicion");
const editCancel = document.querySelector("#cancelar-edicion");
const API_TIMEOUT = 8000;
const CONNECTION_MESSAGE = "No se puede conectar con el servidor.";
const TIMEOUT_MESSAGE = "La conexión ha tardado demasiado. Recarga la página o inténtalo de nuevo.";
const WRITE_MESSAGE = "No se han podido guardar los datos. Inténtalo de nuevo.";
const CORRUPTION_MESSAGE = "No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.";

let sesiones = [];
let documento = null;
let clearDialogReturnFocus = null;
let clearInProgress = false;
let backupPending = false;
let paginaActual = 1;
let editReturnFocus = null;
let editSessionId = null;
let editInProgress = false;
let deleteSessionId = null;
let deleteReturnFocus = null;
let deleteInProgress = false;
const CLEAR_UNEXPECTED = { ok: false, code: "UNEXPECTED_RESPONSE", message: "No se pudo confirmar la respuesta del borrado. Recarga la página antes de intentarlo de nuevo." };
const CLEAR_UNCERTAIN = "No se puede confirmar si los datos se han borrado. Recarga la página antes de intentarlo de nuevo.";
const SESSION_UNCERTAIN = "No se puede confirmar si la sesión se ha actualizado. Recarga la página antes de intentarlo de nuevo.";
const SESSION_INTEGRITY_MESSAGE = "No se pudo localizar la sesión actualizada. Recarga la página antes de continuar.";
const CLEAR_ERROR_CODES = new Set(["INVALID_CLEAR_REQUEST", "IDEMPOTENCY_CONFLICT", "MAIN_DATA_MISSING", "DATA_CORRUPT", "CLEAR_WRITE_FAILED"]);
const CLEAR_ERROR_MESSAGES = {
  INVALID_CLEAR_REQUEST: "La confirmación de borrado no es válida.",
  IDEMPOTENCY_CONFLICT: "La operación ya existe con otros datos.",
  MAIN_DATA_MISSING: "No se pueden borrar los datos porque no existe el archivo principal.",
  DATA_CORRUPT: "No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.",
  CLEAR_WRITE_FAILED: "No se han podido borrar los datos. Inténtalo de nuevo."
};

function validateClearResponse(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return CLEAR_UNEXPECTED;
  if (result.ok === true) {
    if (!Number.isSafeInteger(result.deletedSessions) || result.deletedSessions < 0 || typeof result.backupPending !== "boolean") return CLEAR_UNEXPECTED;
    return result;
  }
  if (result.ok === false && typeof result.code === "string" && CLEAR_ERROR_CODES.has(result.code) && result.message === CLEAR_ERROR_MESSAGES[result.code]) return result;
  return CLEAR_UNEXPECTED;
}

function setClearControlsDisabled(disabled) {
  clearInProgress = disabled;
  [openClearButton, confirmClearButton, cancelClearButton, resetGoalButton].forEach(control => { control.disabled = disabled; });
  [formulario, goalForm].forEach(form => { form.inert = disabled; });
  if (disabled) confirmClearButton.textContent = "Borrado en curso…";
  else confirmClearButton.textContent = "Borrar todas las sesiones";
}

function finishClear(message, additionalMessage = "") {
  clearResult.textContent = additionalMessage ? `${message} ${additionalMessage}` : message;
  closeClearDialog();
  setClearControlsDisabled(false);
  openClearButton.focus();
}

function closeClearDialog() {
  clearDialogLayer.hidden = true;
  const returnFocus = clearDialogReturnFocus;
  clearDialogReturnFocus = null;
  if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
}

function openDeleteDialog(session, origin) {
  if (clearInProgress || deleteInProgress || editInProgress) return;
  deleteSessionId = session.id;
  deleteReturnFocus = origin;
  clearTitle.textContent = "Borrar sesión";
  clearWarning.textContent = `¿Quieres borrar la sesión del ${formatSpanishDate(session.fecha)}, «${session.tema}», de ${session.minutos} minutos? Esta acción no se puede deshacer.`;
  confirmClearButton.textContent = "Borrar sesión";
  clearDialogLayer.hidden = false;
  confirmClearButton.focus();
}

function closeDeleteDialog() {
  clearDialogLayer.hidden = true;
  const origin = deleteReturnFocus;
  deleteReturnFocus = null;
  deleteSessionId = null;
  clearTitle.textContent = "Confirmar borrado de sesiones";
  clearWarning.textContent = "Vas a borrar todas las sesiones de estudio. Esta acción no se puede deshacer y la copia de seguridad no se borrará. El objetivo semanal se conservará.";
  confirmClearButton.textContent = "Borrar todas las sesiones";
  if (origin && typeof origin.focus === "function") origin.focus();
}

openClearButton.addEventListener("click", () => {
  if (clearInProgress || deleteInProgress) return;
  clearDialogReturnFocus = openClearButton;
  clearDialogLayer.hidden = false;
  confirmClearButton.focus();
});

cancelClearButton.addEventListener("click", () => {
  if (clearInProgress || deleteInProgress) return;
  setClearControlsDisabled(false);
  deleteSessionId !== null ? closeDeleteDialog() : closeClearDialog();
});
confirmClearButton.addEventListener("click", () => {
  if (clearInProgress || deleteInProgress) return;
  if (deleteSessionId !== null) {
    deleteInProgress = true;
    setClearControlsDisabled(true);
    confirmClearButton.textContent = "Borrando…";
    enviarBorradoSesion(deleteSessionId).then(result => {
      if (result.uncertain) finishDelete(CLEAR_UNCERTAIN);
       else if (result.integrity) finishDelete(SESSION_INTEGRITY_MESSAGE);
       else if (result.ok) {
        documento = result.document; sesiones = documento.sesiones.slice(); mostrarAvisoBackup(result);
         const paginationView = buildSessionPaginationView(sesiones, paginaActual);
         paginaActual = paginationView.currentPage;
         paginationControls.dataset.focusPage = String(paginaActual);
         deleteReturnFocus = null;
         mostrar(); renderWeeklyGoal(); finishDelete("Sesión borrada.");
      } else finishDelete(result.message);
    });
    return;
  }
  setClearControlsDisabled(true);
  enviarBorrado().then(result => {
    if (result.uncertain) finishClear(CLEAR_UNCERTAIN);
    else if (result.ok) {
      cargarDatos().then((reloaded) => {
        const successMessage = `Se han borrado ${result.deletedSessions} sesiones. La copia de seguridad se ha conservado.`;
        if (reloaded.ok) finishClear(successMessage);
        else finishClear(successMessage, reloaded.error);
      });
    }
    else finishClear(result.message);
  });
});
clearDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    if (!clearInProgress && !deleteInProgress) deleteSessionId !== null ? closeDeleteDialog() : closeClearDialog();
  }
  if (event.key === "Tab") {
    const focusable = [...clearDialog.querySelectorAll("button")].filter(node => !node.disabled);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function finishDelete(message) {
  clearResult.textContent = message;
  deleteInProgress = false;
  setClearControlsDisabled(false);
  closeDeleteDialog();
}

function enviarBorradoSesion(id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  const operation = { type: "delete-session", operationId: `delete-session-${Date.now()}-${Math.random()}`, payload: { id } };
  return fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(operation) })
     .then(async response => { const result = await response.json(); if (!response.ok || !result.ok) return { ok: false, message: result.message || WRITE_MESSAGE }; if (!result.document || !Array.isArray(result.document.sesiones) || result.document.sesiones.some(session => session && session.id === id) || !result.document.metadata || typeof result.document.metadata !== "object") { mostrarError(SESSION_INTEGRITY_MESSAGE); await cargarDatos(); return { integrity: true, message: SESSION_INTEGRITY_MESSAGE }; } return result; })
     .catch(error => ({ uncertain: error.name === "AbortError" || error.name === "TypeError" || error instanceof SyntaxError }))
    .finally(() => clearTimeout(timeout));
}

function formatSpanishDate(dateText) {
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [year, month, day] = dateText.split("-").map(Number);
  return `${day} de ${months[month - 1]} de ${year}`;
}

async function cargarDatos() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const response = await fetch("/api/data", { signal: controller.signal });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || CONNECTION_MESSAGE);
    documento = result.data;
    backupPending = deriveBackupPending(documento);
    sesiones = documento.sesiones.slice();
    fecha.value = fechaLocal(new Date());
    mostrar();
    renderWeeklyGoal();
    return { ok: true };
  } catch (error) {
    const message = error.name === "AbortError" ? TIMEOUT_MESSAGE : (error.message || CONNECTION_MESSAGE);
    mostrarError(message);
    return { ok: false, error: message };
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
    paginaActual = 1;
    formulario.reset();
    fecha.value = fechaLocal(new Date());
    mostrar();
    renderWeeklyGoal();
    // Mantiene el destino del alta visible sin enfocar el mensaje de objetivo.
    document.getElementById("sesiones")["scroll" + "IntoView"]({ behavior: "smooth", block: "start" });
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
    .then(async response => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.message || result.error || WRITE_MESSAGE); return result; })
    .catch(error => { mostrarError(error.name === "AbortError" ? TIMEOUT_MESSAGE : (error.message || WRITE_MESSAGE)); return null; })
    .finally(() => clearTimeout(timeout));
}

function enviarBorrado() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  const operation = { type: "clear-main-data", operationId: `clear-main-data-${Date.now()}-${Math.random()}`, confirmation: "BORRAR TODO" };
  return fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(operation) })
    .then(async response => {
      let body;
      try { body = await response.json(); } catch { return CLEAR_UNEXPECTED; }
      const result = validateClearResponse(body);
      return result;
    })
    .catch(error => ({ uncertain: error.name === "AbortError" || error.name === "TypeError" }))
    .finally(() => clearTimeout(timeout));
}

function mostrarAvisoBackup(result) {
  // La respuesta de la operación puede conocer un fallo que aún no aparece
  // en los contadores del documento devuelto.
  backupPending = result.backupPending === true || deriveBackupPending(result.document);
  if (backupPending) mostrarError("La copia de seguridad está pendiente. Los datos principales se han guardado.");
}

function deriveBackupPending(data) {
  const metadata = data && data.metadata;
  if (!metadata || !Number.isSafeInteger(metadata.successfulWrites) || !Number.isSafeInteger(metadata.backupSuccessfulWrites)) return false;
  return metadata.successfulWrites - metadata.backupSuccessfulWrites >= 5;
}

function mostrar() {
  const view = buildSessionPaginationView(sesiones, paginaActual);
  // Una recarga que deja la colección vacía debe conservar el estado vacío
  // (página 0), no inventar una página 1.
  paginaActual = view.currentPage;
  lista.innerHTML = "";
  sinSesiones.hidden = sesiones.length > 0;
  view.pageItems.forEach((sesion) => {
     const elemento = document.createElement("li");
     elemento.dataset.sessionId = String(sesion.id);
       const info = document.createElement("div"); info.className = "sesion-contenido";
       const topic = document.createElement("div"); topic.className = "tema"; topic.textContent = sesion.tema;
       const meta = document.createElement("div"); meta.className = "sesion-meta";
       const date = document.createElement("span"); date.className = "sesion-fecha"; date.textContent = formatearFecha(sesion.fecha);
       const minutes = document.createElement("span"); minutes.className = "minutos"; minutes.textContent = `${sesion.minutos} min`;
       meta.append(date, minutes);
       const actions = document.createElement("div"); actions.className = "sesion-acciones";
       const editButton = document.createElement("button"); editButton.type = "button"; editButton.className = "boton boton-secundario editar-sesion"; editButton.textContent = "Editar";
       editButton.id = `editar-sesion-${sesion.id}`;
       editButton.dataset.sessionId = String(sesion.id);
      editButton.setAttribute("aria-label", `Editar sesión ${sesion.id}`);
      editButton.addEventListener("click", () => openEditDialog(sesion, editButton));
        const deleteButton = document.createElement("button"); deleteButton.type = "button"; deleteButton.className = "boton boton-peligro borrar-sesion"; deleteButton.textContent = "Borrar";
       deleteButton.dataset.sessionId = String(sesion.id);
       deleteButton.setAttribute("aria-label", `Borrar sesión ${sesion.id}`);
        deleteButton.addEventListener("click", () => openDeleteDialog(sesion, deleteButton));
        actions.append(editButton, deleteButton);
        info.append(topic, meta, actions);
        elemento.className = "sesion-item";
        elemento.append(info);
    lista.appendChild(elemento);
  });
  renderPagination(view);
  actualizarRacha();
}

function openEditDialog(session, origin) {
  if (editInProgress) return;
  editReturnFocus = origin; editSessionId = session.id;
  editDate.value = session.fecha; editTopic.value = session.tema; editMinutes.value = session.minutos;
  clearEditErrors(); editLayer.hidden = false; editDate.focus();
}
function clearEditErrors() { ["fecha", "tema", "minutos"].forEach(name => { const node = document.querySelector(`#error-edicion-${name}`); node.textContent = ""; }); }
function closeEditDialog() { editLayer.hidden = true; editSessionId = null; const origin = editReturnFocus; editReturnFocus = null; if (origin) origin.focus(); }
function setEditBusy(busy) { editInProgress = busy; editSave.disabled = busy; editCancel.disabled = busy; editDate.disabled = busy; editTopic.disabled = busy; editMinutes.disabled = busy; editSave.textContent = busy ? "Guardando…" : "Guardar cambios"; }
function validEditResponse(result, id) { return result && result.ok === true && result.document && typeof result.document === "object" && Array.isArray(result.document.sesiones) && result.document.metadata && typeof result.document.metadata === "object" && result.document.sesiones.some(session => session && session.id === id); }
async function submitEdit(session) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  const operation = { type: "edit-session", operationId: `edit-session-${Date.now()}-${Math.random()}`, payload: {
    id: session.id,
    session: { fecha: session.fecha, tema: session.tema, minutos: session.minutos }
  } };
  try {
    const response = await fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(operation) });
    const result = await response.json();
    // Los errores contratados no son una respuesta íntegra: conservan la vista
    // actual y se muestran sin provocar una recarga innecesaria.
    if (!response.ok || !result.ok) { mostrarError(result.message || WRITE_MESSAGE); return null; }
    if (!validEditResponse(result, session.id)) throw new Error("SESSION_INTEGRITY_ERROR");
    return result;
  }
  catch (error) {
    if (error.message === "SESSION_INTEGRITY_ERROR") { mostrarError(SESSION_INTEGRITY_MESSAGE); await cargarDatos(); return null; }
    if (error.name === "AbortError" || error.name === "TypeError" || error instanceof SyntaxError) return { uncertain: true };
    mostrarError(error.message || WRITE_MESSAGE);
    return null;
  }
  finally { clearTimeout(timeout); }
}
editForm.addEventListener("submit", async event => {
  event.preventDefault(); if (editInProgress) return; clearEditErrors();
  const values = { fecha: editDate.value, tema: editTopic.value.trim(), minutos: Number(editMinutes.value) };
  const errors = { fecha: !isValidLocalDateText(values.fecha) ? "Introduce una fecha válida." : "", tema: !values.tema ? "Introduce un tema." : "", minutos: !isValidSessionMinutes(values.minutos) ? "Introduce minutos enteros positivos." : "" };
  Object.entries(errors).forEach(([name, message]) => { if (message) document.querySelector(`#error-edicion-${name}`).textContent = message; });
  const first = ["fecha", "tema", "minutos"].find(name => errors[name]); if (first) { document.querySelector(`#edicion-${first}`).focus(); return; }
   const paginaAntesDeEditar = paginaActual;
   setEditBusy(true); const result = await submitEdit({ id: editSessionId, ...values });
   if (result && result.uncertain) mostrarError(SESSION_UNCERTAIN);
   if (result && !result.uncertain) {
      documento = result.document;
      sesiones = documento.sesiones.slice();
      // La lista conserva la página visible; mostrar solo la limita si ya no existe.
      paginaActual = paginaAntesDeEditar;
     mostrarAvisoBackup(result); mostrar(); renderWeeklyGoal();
   }
  setEditBusy(false); closeEditDialog();
});
editCancel.addEventListener("click", () => { if (!editInProgress) closeEditDialog(); });
editDialog.addEventListener("keydown", event => { if (event.key === "Escape" && !editInProgress) { event.preventDefault(); closeEditDialog(); } if (event.key === "Tab") { const focusable = [...editDialog.querySelectorAll("button,input")].filter(node => !node.disabled); const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } });

function renderPagination(view) {
  if (!pagination || !paginationControls || !paginationAnnouncement) return;
  pagination.hidden = view.totalPages === 0;
  if (view.totalPages === 0) {
    paginationAnnouncement.textContent = "";
    return;
  }

  paginationAnnouncement.textContent = `Página ${view.currentPage} de ${view.totalPages}`;
  paginationControls.innerHTML = "";
    const addButton = (label, accessibleLabel, targetPage, disabled = false, current = false) => {
    const button = document.createElement("button");
    button.className = "paginacion-boton";
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", accessibleLabel);
      button.disabled = disabled;
      if (current) button.setAttribute("aria-current", "page");
      button.dataset.page = String(targetPage);
      // El clic es el mismo camino para ratón, tacto y activación por teclado.
      button.addEventListener("click", () => handlePageChange(targetPage));
      paginationControls.appendChild(button);
    };
    addButton("<<", "Primera página", 1, !view.hasPrevious);
    addButton("<", "Página anterior", view.currentPage - 1, !view.hasPrevious);
    view.visiblePages.forEach(page => addButton(String(page), `Página ${page}`, page, false, page === view.currentPage));
    addButton(">", "Página siguiente", view.currentPage + 1, !view.hasNext);
    addButton(">>", "Última página", view.totalPages, !view.hasNext);
    if (paginationControls.dataset.focusPage) {
      const active = paginationControls.querySelector(`[data-page="${paginationControls.dataset.focusPage}"]`);
      delete paginationControls.dataset.focusPage;
      if (active) {
        active.focus();
        ensurePaginationButtonVisible(active);
      }
    }
  }

  function ensurePaginationButtonVisible(button) {
    const containerRect = paginationControls.getBoundingClientRect();
    const styles = getComputedStyle(paginationControls);
    const innerLeft = containerRect.left + parseFloat(styles.borderLeftWidth || 0);
    const innerRight = containerRect.right - parseFloat(styles.borderRightWidth || 0);
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.left < innerLeft) {
      paginationControls.scrollLeft -= innerLeft - buttonRect.left;
    } else if (buttonRect.right > innerRight) {
      paginationControls.scrollLeft += buttonRect.right - innerRight;
    }
  }

  function handlePageChange(targetPage) {
    const view = buildSessionPaginationView(sesiones, paginaActual);
    if (!Number.isSafeInteger(targetPage) || !view.totalPages || targetPage < 1 || targetPage > view.totalPages || targetPage === view.currentPage) return;
    paginaActual = targetPage;
    paginationControls.dataset.focusPage = String(targetPage);
    mostrar();
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

// Mantiene la validación disponible también para las pruebas sin DOM.
function validateClearResponse(result) {
    const messages = {
      INVALID_CLEAR_REQUEST: "La confirmación de borrado no es válida.",
      IDEMPOTENCY_CONFLICT: "La operación ya existe con otros datos.",
      MAIN_DATA_MISSING: "No se pueden borrar los datos porque no existe el archivo principal.",
      DATA_CORRUPT: "No se pueden leer los datos. Conserva una copia del archivo y corrígelo antes de continuar.",
      CLEAR_WRITE_FAILED: "No se han podido borrar los datos. Inténtalo de nuevo."
    };
    if (result && result.ok === true && Number.isSafeInteger(result.deletedSessions) && result.deletedSessions >= 0 && typeof result.backupPending === "boolean") return result;
    if (result && result.ok === false && messages[result.code] === result.message) return result;
    return { ok: false, code: "UNEXPECTED_RESPONSE", message: "No se pudo confirmar la respuesta del borrado. Recarga la página antes de intentarlo de nuevo." };
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

function buildSessionPaginationView(sesiones, paginaSolicitada) {
  const emptyView = { pageItems: [], visiblePages: [], totalPages: 0, currentPage: 0, hasPrevious: false, hasNext: false };
  if (!Array.isArray(sesiones)) return emptyView;
  const isNormalized = (record) => record && typeof record === "object" && !Array.isArray(record)
    && isValidLocalDateText(record.fecha) && typeof record.tema === "string"
    && isValidSessionMinutes(record.minutos)
    && (record.creado === undefined || (Number.isSafeInteger(record.creado) && record.creado > 0));
  if (!sesiones.every(isNormalized)) return emptyView;
  const ordered = sesiones.map((item, index) => ({ item, index })).sort((a, b) =>
     b.item.fecha.localeCompare(a.item.fecha)
     || ((b.item.creado !== undefined ? 1 : 0) - (a.item.creado !== undefined ? 1 : 0))
     || (b.item.creado !== undefined ? b.item.creado - a.item.creado : 0)
     || (Number.isSafeInteger(b.item.id) && Number.isSafeInteger(a.item.id) ? b.item.id - a.item.id : 0)
     || a.index - b.index).map(entry => entry.item);
  const totalPages = Math.ceil(ordered.length / 10);
  const requested = Number.isSafeInteger(paginaSolicitada) && paginaSolicitada >= 1 ? paginaSolicitada : 1;
  const currentPage = Math.min(requested, totalPages);
  const start = (currentPage - 1) * 10;
  const visibleStart = totalPages <= 5 ? 1 : Math.min(Math.max(1, currentPage - 2), totalPages - 4);
  return { pageItems: ordered.slice(start, start + 10), currentPage, totalPages,
    visiblePages: Array.from({ length: Math.min(5, totalPages) }, (_, i) => visibleStart + i),
    hasPrevious: currentPage > 1, hasNext: currentPage < totalPages };
}

function findSessionPage(sesiones, sessionId, fallbackPage = 1) {
  if (!Array.isArray(sesiones)) return fallbackPage;
  const sorted = sesiones.map((item, originalIndex) => ({ item, originalIndex })).sort((a, b) =>
      b.item.fecha.localeCompare(a.item.fecha)
      || ((b.item.creado !== undefined ? 1 : 0) - (a.item.creado !== undefined ? 1 : 0))
      || (b.item.creado !== undefined ? b.item.creado - a.item.creado : 0)
      || (Number.isSafeInteger(b.item.id) && Number.isSafeInteger(a.item.id) ? b.item.id - a.item.id : 0)
      || a.originalIndex - b.originalIndex);
  const sortedIndex = sorted.findIndex(entry => entry.item.id === sessionId);
  return sortedIndex < 0 ? fallbackPage : Math.floor(sortedIndex / 10) + 1;
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
       , buildSessionPaginationView
      , findSessionPage
     , getTodayLocal
     , formatLocalDate
      , parseLocalDate
       , validateClearResponse
       , deriveBackupPending
        };
}
