const state = {
  token: localStorage.getItem("declic_token") || "",
  user: readStoredUser(),
  lastSubmissionCode: localStorage.getItem("declic_last_code") || "",
  toastTimeout: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  restoreSessionUi();
  refreshAllData();
});

function cacheElements() {
  [
    "apiStatusDot",
    "apiStatusLabel",
    "refreshDataButton",
    "healthPill",
    "healthMessage",
    "healthHint",
    "activeEndpoint",
    "sessionSummary",
    "lastTrackingCode",
    "heroTotalSignalements",
    "heroResolutionRate",
    "heroUsers",
    "globalTotal",
    "globalResolved",
    "globalInProgress",
    "globalUsers",
    "signalementForm",
    "submitSignalementButton",
    "signalementFeedback",
    "submissionCode",
    "submissionMessage",
    "loginForm",
    "loginFeedback",
    "registerForm",
    "registerFeedback",
    "loginTab",
    "registerTab",
    "sessionCard",
    "sessionName",
    "sessionRole",
    "logoutButton",
    "dailyTrend",
    "serviceStatsList",
    "quartierStatsList",
    "filtersForm",
    "filterService",
    "filterStatut",
    "filterQuartier",
    "resetFiltersButton",
    "reportsSummary",
    "reportsList",
    "toast",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  elements.refreshDataButton.addEventListener("click", refreshAllData);
  elements.signalementForm.addEventListener("submit", handleSignalementSubmit);
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.registerForm.addEventListener("submit", handleRegisterSubmit);
  elements.filtersForm.addEventListener("submit", handleFilterSubmit);
  elements.resetFiltersButton.addEventListener("click", resetFilters);
  elements.loginTab.addEventListener("click", () => setActiveAuthTab("login"));
  elements.registerTab.addEventListener("click", () => setActiveAuthTab("register"));
  elements.logoutButton.addEventListener("click", handleLogout);
}

async function refreshAllData() {
  setInlineFeedback(elements.signalementFeedback, "");
  await checkHealth();
  await Promise.allSettled([
    loadGlobalStats(),
    loadServiceStats(),
    loadQuartierStats(),
    loadDailyTrend(),
    loadSignalements(),
  ]);
}

async function checkHealth() {
  try {
    const payload = await apiRequest("/api/health", { method: "GET" }, { skipAuth: true });
    setApiState(true, payload.message || "API en ligne");
    elements.healthPill.textContent = "Connecte";
    elements.healthPill.className = "pill success";
    elements.healthMessage.textContent = payload.message || "Connexion reussie avec le backend.";
    elements.healthHint.textContent = "Le frontend passe par un proxy local qui relaie les appels vers l'API disponible.";
    elements.activeEndpoint.textContent = "/api (proxy local)";
  } catch (error) {
    setApiState(false, error.message);
    elements.healthPill.textContent = "Indisponible";
    elements.healthPill.className = "pill danger";
    elements.healthMessage.textContent = "Le backend n'est pas joignable pour le moment.";
    elements.healthHint.textContent = error.message;
  }
}

async function loadGlobalStats() {
  try {
    const payload = await apiRequest("/api/statistiques/globales", { method: "GET" }, { skipAuth: true });
    const data = payload.data || {};
    updateText(elements.heroTotalSignalements, formatNumber(data.totalSignalements));
    updateText(elements.heroResolutionRate, `${formatNumber(data.tauxResolution)}%`);
    updateText(elements.heroUsers, formatNumber(data.utilisateursInscrits));
    updateText(elements.globalTotal, formatNumber(data.totalSignalements));
    updateText(elements.globalResolved, formatNumber(data.signalementsResolus));
    updateText(elements.globalInProgress, formatNumber(data.signalementsEnCours));
    updateText(elements.globalUsers, formatNumber(data.utilisateursInscrits));
  } catch (error) {
    fillStatFallback();
  }
}

async function loadServiceStats() {
  try {
    const payload = await apiRequest("/api/statistiques/service", { method: "GET" }, { skipAuth: true });
    const entries = Array.isArray(payload.data) ? payload.data : [];
    renderStackList(elements.serviceStatsList, entries, (item, maxValue) => ({
      title: item.service,
      value: `${formatNumber(item.count)} signalement(s)`,
      width: maxValue ? (item.count / maxValue) * 100 : 0,
    }));
  } catch (error) {
    renderEmpty(elements.serviceStatsList, "Impossible de charger la repartition par service.");
  }
}

async function loadQuartierStats() {
  try {
    const payload = await apiRequest("/api/statistiques/quartier", { method: "GET" }, { skipAuth: true });
    const entries = Array.isArray(payload.data) ? payload.data : [];
    renderStackList(elements.quartierStatsList, entries, (item, maxValue) => ({
      title: item.quartier || "Quartier non renseigne",
      value: `${formatNumber(item.total)} total / ${formatNumber(item.resolus)} resolu(s)`,
      width: maxValue ? (item.total / maxValue) * 100 : 0,
    }));
  } catch (error) {
    renderEmpty(elements.quartierStatsList, "Impossible de charger les donnees par quartier.");
  }
}

async function loadDailyTrend() {
  try {
    const payload = await apiRequest("/api/statistiques/evolution-7-jours", { method: "GET" }, { skipAuth: true });
    const entries = Array.isArray(payload.data) ? payload.data : [];
    renderTrend(entries);
  } catch (error) {
    renderEmpty(elements.dailyTrend, "Impossible de charger l'activite recente.");
  }
}

async function loadSignalements() {
  try {
    const params = new URLSearchParams();
    params.set("limit", "8");

    if (elements.filterService.value) {
      params.set("service", elements.filterService.value);
    }

    if (elements.filterStatut.value) {
      params.set("statut", elements.filterStatut.value);
    }

    if (elements.filterQuartier.value.trim()) {
      params.set("quartier", elements.filterQuartier.value.trim());
    }

    const payload = await apiRequest(`/api/signalements?${params.toString()}`, { method: "GET" }, { skipAuth: true });
    const entries = Array.isArray(payload.data) ? payload.data : [];
    const pagination = payload.pagination || {};

    elements.reportsSummary.textContent = `${formatNumber(pagination.total || entries.length)} signalement(s) trouves`;
    renderReports(entries);
  } catch (error) {
    elements.reportsSummary.textContent = "Impossible de recuperer les signalements.";
    renderEmpty(elements.reportsList, error.message);
  }
}

async function handleSignalementSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = elements.submitSignalementButton;
  const selectedTypes = Array.from(form.querySelectorAll('input[name="typesProbleme"]:checked')).map((input) => input.value);
  const description = form.description.value.trim();

  if (description.length < 20) {
    setInlineFeedback(elements.signalementFeedback, "La description doit contenir au moins 20 caracteres.", "error");
    return;
  }

  const payload = {
    service: form.service.value,
    description,
    localisation: {
      quartier: form.quartier.value.trim(),
      adresse: form.adresse.value.trim(),
    },
    emailCitoyen: form.emailCitoyen.value.trim() || (state.user && state.user.email) || undefined,
    numeroTelephone: form.numeroTelephone.value.trim() || undefined,
    typesProbleme: selectedTypes,
  };

  if (state.user && state.user.id) {
    payload.utilisateurId = state.user.id;
  }

  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Envoi...</span>';

  try {
    const response = await apiRequest("/api/signalements", { method: "POST", body: payload });
    const trackingCode = response.codeSuivi || (response.data && response.data.codeSuivi) || "Code indisponible";

    state.lastSubmissionCode = trackingCode;
    localStorage.setItem("declic_last_code", trackingCode);
    updateText(elements.lastTrackingCode, trackingCode);
    updateText(elements.submissionCode, trackingCode);
    elements.submissionMessage.textContent = response.message || "Signalement cree avec succes.";
    setInlineFeedback(elements.signalementFeedback, "Signalement envoye avec succes.", "success");
    showToast("Signalement envoye au backend.");
    form.reset();
    restoreSessionUi();
    await Promise.allSettled([loadGlobalStats(), loadSignalements()]);
  } catch (error) {
    setInlineFeedback(elements.signalementFeedback, error.message, "error");
    elements.submissionMessage.textContent = error.message;
    updateText(elements.submissionCode, "Echec");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Soumettre au backend</span>';
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const response = await apiRequest("/api/utilisateurs/login", {
      method: "POST",
      body: {
        email: form.email.value.trim(),
        motDePasse: form.motDePasse.value,
      },
    }, { skipAuth: true });

    persistSession(response);
    setInlineFeedback(elements.loginFeedback, response.message || "Connexion reussie.", "success");
    showToast("Connexion reussie.");
    form.reset();
    restoreSessionUi();
  } catch (error) {
    setInlineFeedback(elements.loginFeedback, error.message, "error");
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const response = await apiRequest("/api/utilisateurs/register", {
      method: "POST",
      body: {
        prenom: form.prenom.value.trim(),
        nom: form.nom.value.trim(),
        quartier: form.quartier.value.trim(),
        telephone: form.telephone.value.trim(),
        email: form.email.value.trim(),
        motDePasse: form.motDePasse.value,
      },
    }, { skipAuth: true });

    persistSession(response);
    setInlineFeedback(elements.registerFeedback, response.message || "Compte cree avec succes.", "success");
    showToast("Compte cree et session ouverte.");
    form.reset();
    setActiveAuthTab("login");
    restoreSessionUi();
    syncSignalementFormWithSession();
  } catch (error) {
    setInlineFeedback(elements.registerFeedback, error.message, "error");
  }
}

async function handleFilterSubmit(event) {
  event.preventDefault();
  await loadSignalements();
}

function resetFilters() {
  elements.filtersForm.reset();
  loadSignalements();
}

function handleLogout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("declic_token");
  localStorage.removeItem("declic_user");
  restoreSessionUi();
  showToast("Session fermee.");
}

function setActiveAuthTab(tab) {
  const loginActive = tab === "login";
  elements.loginTab.classList.toggle("active", loginActive);
  elements.registerTab.classList.toggle("active", !loginActive);
  elements.loginForm.classList.toggle("hidden", !loginActive);
  elements.registerForm.classList.toggle("hidden", loginActive);
}

function restoreSessionUi() {
  updateText(elements.lastTrackingCode, state.lastSubmissionCode || "Aucun");
  updateText(elements.submissionCode, state.lastSubmissionCode || "En attente");
  syncSignalementFormWithSession();

  if (state.user) {
    elements.sessionCard.classList.remove("hidden");
    elements.sessionName.textContent = `${state.user.prenom || ""} ${state.user.nom || ""}`.trim() || state.user.email || "Session active";
    elements.sessionRole.textContent = `${capitalize(state.user.role || "citoyen")} ${state.user.quartier ? `- ${state.user.quartier}` : ""}`.trim();
    elements.sessionSummary.textContent = state.user.email || "Session active";
  } else {
    elements.sessionCard.classList.add("hidden");
    elements.sessionName.textContent = "Aucune session";
    elements.sessionRole.textContent = "";
    elements.sessionSummary.textContent = "Aucune session";
  }
}

function syncSignalementFormWithSession() {
  if (!state.user) {
    return;
  }

  if (!elements.signalementForm.emailCitoyen.value && state.user.email) {
    elements.signalementForm.emailCitoyen.value = state.user.email;
  }

  if (!elements.signalementForm.quartier.value && state.user.quartier) {
    elements.signalementForm.quartier.value = state.user.quartier;
  }
}

function persistSession(response) {
  state.token = response.token || "";
  state.user = response.user || null;

  localStorage.setItem("declic_token", state.token);
  localStorage.setItem("declic_user", JSON.stringify(state.user));
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem("declic_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

async function apiRequest(path, options = {}, config = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (!config.skipAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : { message: await response.text() };

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.status));
  }

  return payload;
}

function extractErrorMessage(payload, status) {
  if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((item) => item.msg || item.message).filter(Boolean).join(" | ");
  }

  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (status === 502) {
    return "Le proxy frontend ne trouve aucun backend actif. Lancez le backend puis actualisez.";
  }

  return "Une erreur est survenue pendant l'appel API.";
}

function setApiState(online, message) {
  elements.apiStatusDot.classList.remove("online", "offline");
  elements.apiStatusDot.classList.add(online ? "online" : "offline");
  elements.apiStatusLabel.textContent = online ? "API connectee" : "API hors ligne";
  if (!online) {
    elements.healthHint.textContent = message;
  }
}

function renderStackList(container, items, mapItem) {
  if (!items.length) {
    renderEmpty(container, "Aucune donnee disponible.");
    return;
  }

  const maxValue = items.reduce((max, item) => {
    const value = typeof item.total === "number" ? item.total : item.count;
    return Math.max(max, value || 0);
  }, 0);

  container.innerHTML = items.map((item) => {
    const data = mapItem(item, maxValue);
    return `
      <article class="stack-item">
        <div class="stack-head">
          <strong>${escapeHtml(data.title)}</strong>
          <span>${escapeHtml(data.value)}</span>
        </div>
        <div class="meter">
          <div class="meter-fill" style="width: ${Math.max(data.width, 6)}%"></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderTrend(entries) {
  if (!entries.length) {
    renderEmpty(elements.dailyTrend, "Aucune activite sur les 7 derniers jours.");
    return;
  }

  const maxValue = entries.reduce((max, item) => Math.max(max, item.count || 0), 0);
  elements.dailyTrend.innerHTML = entries.map((item) => `
    <article class="trend-item">
      <div class="trend-head">
        <strong>${escapeHtml(item.date || "--")}</strong>
        <span>${formatNumber(item.count)} signalement(s)</span>
      </div>
      <div class="meter">
        <div class="meter-fill" style="width: ${maxValue ? Math.max((item.count / maxValue) * 100, 6) : 6}%"></div>
      </div>
    </article>
  `).join("");
}

function renderReports(entries) {
  if (!entries.length) {
    renderEmpty(elements.reportsList, "Aucun signalement ne correspond aux filtres actuels.");
    return;
  }

  elements.reportsList.innerHTML = entries.map((item) => {
    const statutClass = statusClassName(item.statut);
    const description = truncate(item.description || "Sans description", 180);
    const quartier = item.localisation && item.localisation.quartier ? item.localisation.quartier : "Quartier non renseigne";
    const code = item.codeSuivi || "Sans code";
    const createdAt = item.createdAt ? formatDate(item.createdAt) : "Date inconnue";

    return `
      <article class="report-item">
        <div class="report-head">
          <div>
            <p class="report-title">${escapeHtml(item.service || "Service non renseigne")}</p>
            <div class="report-meta">
              <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(quartier)}</span>
              <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(createdAt)}</span>
              <span><i class="fa-solid fa-barcode"></i> ${escapeHtml(code)}</span>
            </div>
          </div>
          <span class="status-badge ${statutClass}">${escapeHtml(item.statut || "Inconnu")}</span>
        </div>
        <p class="supporting-copy">${escapeHtml(description)}</p>
        <div class="report-extra">
          <span><i class="fa-solid fa-layer-group"></i> Priorite: ${escapeHtml(item.priorite || "Non definie")}</span>
          <span><i class="fa-solid fa-tags"></i> ${escapeHtml((item.typesProbleme || []).join(", ") || "Type non renseigne")}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderEmpty(container, message) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function fillStatFallback() {
  ["heroTotalSignalements", "heroResolutionRate", "heroUsers", "globalTotal", "globalResolved", "globalInProgress", "globalUsers"].forEach((key) => {
    updateText(elements[key], "--");
  });
}

function setInlineFeedback(node, message, tone = "") {
  node.textContent = message;
  node.classList.remove("success", "error");
  if (tone) {
    node.classList.add(tone);
  }
}

function updateText(node, value) {
  node.textContent = value;
}

function showToast(message) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.classList.remove("hidden");

  if (state.toastTimeout) {
    clearTimeout(state.toastTimeout);
  }

  state.toastTimeout = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 3200);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    return "Date invalide";
  }
}

function capitalize(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}

function statusClassName(status) {
  switch (status) {
    case "Re\u00e7u":
      return "received";
    case "En cours":
      return "progress";
    case "R\u00e9solu":
      return "resolved";
    case "En attente":
      return "pending";
    case "Archiv\u00e9":
      return "archived";
    default:
      return "received";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
