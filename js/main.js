/**
 * main.js — Sovereign Ledger
 * Entry point: tabs, CSV auto-fetch, cfg import, search, buttons.
 */

const CSV_URL = "ns_results.csv";

function el(id) { return document.getElementById(id); }

function showLoading(msg) {
  el("loading-msg").textContent = msg;
  el("loading-overlay").classList.add("show");
}
function hideLoading() {
  el("loading-overlay").classList.remove("show");
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("tab-active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("panel-active"));
    tab.classList.add("tab-active");
    el("tab-" + tab.dataset.tab).classList.add("panel-active");
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
    },
    error(err) {
      hideLoading();
      console.warn("Auto-fetch failed:", err);
      const n = el("scorer-upload-notice");
      if (n) n.classList.remove("hidden");
    },
  });
}

// ── Post-load UI ──────────────────────────────────────────────────────────────

function set(id, val) { const e = el(id); if (e) e.textContent = val; }

function onDataLoaded() {
  const badge = el("data-badge");
  if (badge) { badge.classList.remove("hidden"); badge.classList.add("flex"); }
  set("data-badge-text", `${allIssues.length} issues · ${statCols.length} stats`);

  updatePriorityCoverage();
  renderPriorityList();
  renderIssueList();
}

// ── CFG Parsing ───────────────────────────────────────────────────────────────

function parseCfgText(text) {
  const result = {};
  let parsed = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let name, scoreStr;
    if (line.includes("—")) {
      const parts = line.split("—");
      name      = parts[0].trim();
      scoreStr  = parts[1]?.trim();
    } else {
      const parts = line.split(" ");
      scoreStr = parts[parts.length - 1];
      name     = line.slice(0, line.lastIndexOf(scoreStr)).trim().replace(/-+$/, "").trim();
    }
    const score = parseFloat(scoreStr);
    if (name && !isNaN(score)) { result[name] = score; parsed++; }
  }
  return { result, parsed };
}

function applyCfg(text) {
  const { result, parsed } = parseCfgText(text);
  if (parsed === 0) return "No valid entries found. Format: StatName — score";
  // Merge: keep existing stats from CSV at 0 if not in cfg
  Object.keys(priorities).forEach(k => { priorities[k] = 0; });
  Object.entries(result).forEach(([name, score]) => {
    if (name in priorities) priorities[name] = score;
  });
  renderPriorityList();
  updatePriorityCoverage();
  if (csvData) renderIssueList();
  return null;
}

// ── Import via file ───────────────────────────────────────────────────────────

const cfgFileInput = el("cfg-file-input");
el("import-cfg-btn").addEventListener("click", () => cfgFileInput.click());
cfgFileInput.addEventListener("change", () => {
  const file = cfgFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const err = applyCfg(e.target.result);
    if (err) alert(err);
  };
  reader.readAsText(file);
  cfgFileInput.value = "";
});

// ── Import via paste ──────────────────────────────────────────────────────────

el("paste-cfg-btn").addEventListener("click", () => {
  el("paste-modal").classList.remove("hidden");
  el("paste-textarea").focus();
  el("paste-error").classList.add("hidden");
});

el("paste-cancel-btn").addEventListener("click", () => {
  el("paste-modal").classList.add("hidden");
  el("paste-textarea").value = "";
});

el("paste-apply-btn").addEventListener("click", () => {
  const text = el("paste-textarea").value.trim();
  if (!text) return;
  const err = applyCfg(text);
  if (err) {
    el("paste-error").textContent = err;
    el("paste-error").classList.remove("hidden");
  } else {
    el("paste-modal").classList.add("hidden");
    el("paste-textarea").value = "";
  }
});

// ── Filter chips ──────────────────────────────────────────────────────────────

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
  if (!confirm("Reset all priorities to 0?")) return;
  resetPriorities();
  renderPriorityList();
  updatePriorityCoverage();
  if (csvData) renderIssueList();
});

// ── Init ──────────────────────────────────────────────────────────────────────

renderPriorityList();
updatePriorityCoverage();
fetchCSV();
