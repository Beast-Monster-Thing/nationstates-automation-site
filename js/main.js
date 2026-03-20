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

// ── Loading overlay ───────────────────────────────────────────────────────────

function showLoading(msg) {
  document.getElementById("loading-msg").textContent = msg;
  document.getElementById("loading-overlay").classList.add("show");
}
function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("show");
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("nav-active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("panel-active"));
    item.classList.add("nav-active");
    document.getElementById("tab-" + item.dataset.tab).classList.add("panel-active");
    document.getElementById("page-title").textContent = PAGE_TITLES[item.dataset.tab] || "";

    if (item.dataset.tab === "scorer" && !csvData) {
      document.getElementById("scorer-upload-notice").classList.remove("hidden");
      document.getElementById("scorer-content").style.display = "none";
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
      document.getElementById("drop-zone").style.display = "none";
      const notice = document.getElementById("csv-loaded-notice");
      notice.classList.remove("hidden");
      notice.classList.add("flex");
    },
    error(err) {
      hideLoading();
      console.warn("Auto-fetch failed, showing manual upload:", err);
    },
  });
}

// ── Manual upload fallback ────────────────────────────────────────────────────

const dropZone  = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag");
  const f = e.dataTransfer.files[0];
  if (f) loadCSVFile(f);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadCSVFile(fileInput.files[0]);
});

function loadCSVFile(file) {
  showLoading(`Parsing ${file.name}…`);
  setTimeout(() => {
    Papa.parse(file, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete(results) { processCSV(results); onDataLoaded(); hideLoading(); },
      error(err) { hideLoading(); alert("CSV parse error: " + err.message); },
    });
  }, 50);
}

// ── Post-load UI ──────────────────────────────────────────────────────────────

function onDataLoaded() {
  const summary = `${allIssues.length} issues · ${csvData.length} options · ${statCols.length} stats`;

  document.getElementById("sidebar-status").textContent = `${allIssues.length} issues loaded`;

  const badge = document.getElementById("data-badge");
  badge.classList.remove("hidden");
  badge.classList.add("flex");
  document.getElementById("data-badge-text").textContent = summary;

  document.getElementById("sb-issues").textContent  = allIssues.length;
  document.getElementById("sb-options").textContent = csvData.length;
  document.getElementById("sb-stats").textContent   = statCols.length;
  const sb = document.getElementById("stat-boxes");
  sb.classList.remove("hidden");
  sb.classList.add("grid");

  updatePriorityCoverage();
  renderTopPicks();
  renderPriorityList();

  document.getElementById("scorer-upload-notice").classList.add("hidden");
  document.getElementById("scorer-content").style.display = "";
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

document.getElementById("prio-search").addEventListener("input", renderPriorityList);
document.getElementById("issue-search").addEventListener("input", () => {
  clearTimeout(window._issueTimer);
  window._issueTimer = setTimeout(renderIssueList, 200);
});

// ── Buttons ───────────────────────────────────────────────────────────────────

document.getElementById("export-cfg-btn").addEventListener("click", exportPriorityCfg);
document.getElementById("reset-prio-btn").addEventListener("click", () => {
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
