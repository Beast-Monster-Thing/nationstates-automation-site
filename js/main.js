/**
 * main.js — Sovereign Ledger
 * Auto-loads ns_results.csv from repo. Manual upload as fallback.
 */

const CSV_URL = "ns_results.csv";
const PAGE_TITLES = {
  overview:   "Overview",
  priorities: "Priority Editor",
  scorer:     "Issue Scorer",
  setup:      "Setup",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function showLoading(msg) {
  el("loading-msg").textContent = msg;
  el("loading-overlay").classList.add("show");
}
function hideLoading() {
  el("loading-overlay").classList.remove("show");
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("nav-active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("panel-active"));
    item.classList.add("nav-active");
    el("tab-" + item.dataset.tab).classList.add("panel-active");
    el("page-title").textContent = PAGE_TITLES[item.dataset.tab] || "";

    if (item.dataset.tab === "scorer" && !csvData) {
      el("scorer-upload-notice").classList.remove("hidden");
      el("scorer-content").style.display = "none";
    }
  });
});

// ── Auto-fetch CSV ────────────────────────────────────────────────────────────

function fetchCSV() {
  showLoading("Loading ns_results.csv…");
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete(results) {
      processCSV(results);
      onDataLoaded();
      hideLoading();

      const dz     = el("drop-zone");
      const notice = el("csv-loaded-notice");
      if (dz)     dz.style.display = "none";
      if (notice) { notice.classList.remove("hidden"); notice.classList.add("flex"); }
    },
    error(err) {
      hideLoading();
      console.warn("Auto-fetch failed, showing manual upload:", err);
    },
  });
}

// ── Manual upload fallback ────────────────────────────────────────────────────

const dropZone  = el("drop-zone");
const fileInput = el("file-input");

if (dropZone && fileInput) {
  dropZone.addEventListener("click",     () => fileInput.click());
  dropZone.addEventListener("dragover",  e  => { e.preventDefault(); dropZone.classList.add("drag"); });
  dropZone.addEventListener("dragleave", ()  => dropZone.classList.remove("drag"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag");
    const f = e.dataTransfer.files[0];
    if (f) loadCSVFile(f);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) loadCSVFile(fileInput.files[0]);
  });
}

function loadCSVFile(file) {
  showLoading(`Parsing ${file.name}…`);
  setTimeout(() => {
    Papa.parse(file, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete(results) { processCSV(results); onDataLoaded(); hideLoading(); },
      error(err)        { hideLoading(); alert("CSV parse error: " + err.message); },
    });
  }, 50);
}

// ── Post-load UI ──────────────────────────────────────────────────────────────

function set(id, val) { const e = el(id); if (e) e.textContent = val; }

function onDataLoaded() {
  const summary = `${allIssues.length} issues · ${csvData.length} options · ${statCols.length} stats`;

  set("sidebar-status", `${allIssues.length} issues loaded`);

  const badge = el("data-badge");
  if (badge) { badge.classList.remove("hidden"); badge.classList.add("flex"); }
  set("data-badge-text", summary);

  set("sb-issues",  allIssues.length);
  set("sb-options", csvData.length);
  set("sb-stats",   statCols.length);

  const sb = el("stat-boxes");
  if (sb) { sb.classList.remove("hidden"); sb.classList.add("grid"); }

  updatePriorityCoverage();
  renderTopPicks();
  renderPriorityList();

  const notice  = el("scorer-upload-notice");
  const content = el("scorer-content");
  if (notice)  notice.classList.add("hidden");
  if (content) content.style.display = "";
  renderIssueList();
}

// ── Chips ─────────────────────────────────────────────────────────────────────

document.querySelectorAll("[data-filter]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(c => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    prioFilter = chip.dataset.filter;
    renderPriorityList();
  });
});

document.querySelectorAll("[data-sort]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-sort]").forEach(c => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    sortMode = chip.dataset.sort;
    renderIssueList();
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

el("prio-search").addEventListener("input", renderPriorityList);
el("issue-search").addEventListener("input", () => {
  clearTimeout(window._issueTimer);
  window._issueTimer = setTimeout(renderIssueList, 200);
});

// ── Buttons ───────────────────────────────────────────────────────────────────

el("export-cfg-btn").addEventListener("click", exportPriorityCfg);
el("reset-prio-btn").addEventListener("click", () => {
  if (!confirm("Reset all priorities to defaults?")) return;
  resetPriorities();
  renderPriorityList();
  updatePriorityCoverage();
  if (csvData) { renderTopPicks(); renderIssueList(); }
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderPriorityPreviews();
renderPriorityList();
updatePriorityCoverage();
fetchCSV();
