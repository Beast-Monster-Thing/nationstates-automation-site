/**
 * main.js
 * Entry point: wires up tabs, file upload, chip filters,
 * search inputs, and export/reset buttons.
 */

// ── Loading overlay ──────────────────────────────────────────────────────────

function showLoading(msg) {
  document.getElementById("loading-msg").textContent = msg;
  document.getElementById("loading-overlay").classList.add("show");
}

function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("show");
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");

    if (tab.dataset.tab === "scorer" && !csvData) {
      document.getElementById("scorer-upload-notice").style.display = "";
      document.getElementById("scorer-content").style.display = "none";
    }
  });
});

// ── File Upload ───────────────────────────────────────────────────────────────

const dropZone  = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag");
  const f = e.dataTransfer.files[0];
  if (f) loadCSV(f);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadCSV(fileInput.files[0]);
});

function loadCSV(file) {
  showLoading(`Parsing ${file.name}…`);
  // Slight delay so the overlay renders before the (synchronous) parse blocks the thread
  setTimeout(() => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete(results) {
        processCSV(results);
        onDataLoaded();
        hideLoading();
      },
      error(err) {
        hideLoading();
        alert("CSV parse error: " + err.message);
      },
    });
  }, 50);
}

function onDataLoaded() {
  // Header status
  document.getElementById("header-info").textContent =
    `${allIssues.length} issues · ${csvData.length} options · ${statCols.length} stats`;

  // Stat boxes
  document.getElementById("sb-issues").textContent  = allIssues.length;
  document.getElementById("sb-options").textContent = csvData.length;
  document.getElementById("sb-stats").textContent   = statCols.length;
  document.getElementById("stat-boxes").style.display = "";

  // Re-render all data-dependent views
  updatePriorityCoverage();
  renderTopPicks();
  renderPriorityList();

  // Scorer tab
  document.getElementById("scorer-upload-notice").style.display = "none";
  document.getElementById("scorer-content").style.display = "";
  renderIssueList();
}

// ── Priority Chips ────────────────────────────────────────────────────────────

document.querySelectorAll("[data-filter]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(c => c.classList.remove("active-chip"));
    chip.classList.add("active-chip");
    prioFilter = chip.dataset.filter;
    renderPriorityList();
  });
});

// ── Sort Chips ────────────────────────────────────────────────────────────────

document.querySelectorAll("[data-sort]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("[data-sort]").forEach(c => c.classList.remove("active-chip"));
    chip.classList.add("active-chip");
    sortMode = chip.dataset.sort;
    renderIssueList();
  });
});

// ── Search Inputs ─────────────────────────────────────────────────────────────

document.getElementById("prio-search").addEventListener("input", renderPriorityList);

document.getElementById("issue-search").addEventListener("input", () => {
  clearTimeout(window._issueSearchTimer);
  window._issueSearchTimer = setTimeout(renderIssueList, 200);
});

// ── Buttons ───────────────────────────────────────────────────────────────────

document.getElementById("export-cfg-btn").addEventListener("click", exportPriorityCfg);

document.getElementById("reset-prio-btn").addEventListener("click", () => {
  if (!confirm("Reset all priorities to defaults?")) return;
  resetPriorities();
  renderPriorityList();
  updatePriorityCoverage();
  if (csvData) {
    renderTopPicks();
    renderIssueList();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderPriorityPreviews();
renderPriorityList();
updatePriorityCoverage();
