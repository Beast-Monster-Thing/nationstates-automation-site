/**
 * ui.js
 * All DOM rendering: priority list, issue cards, option rows, mini-bars.
 */

// ── Priority List ────────────────────────────────────────────────────────────

let prioFilter = "all";

function renderPriorityList() {
  const list   = document.getElementById("priority-list");
  const search = document.getElementById("prio-search").value.toLowerCase();

  let entries = Object.entries(priorities);

  if (prioFilter === "pos") entries = entries.filter(([, v]) => v >= 0);
  if (prioFilter === "neg") entries = entries.filter(([, v]) => v < 0);
  if (search) entries = entries.filter(([k]) => k.toLowerCase().includes(search));

  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const maxAbs = Math.max(...Object.values(priorities).map(Math.abs), 1);

  list.innerHTML = entries.map(([name, score]) => {
    const pct    = (Math.abs(score) / maxAbs) * 100;
    const isPos  = score >= 0;
    const col    = resolveCol(name);
    const noMatch = !col && csvData;

    return `<div class="prow${noMatch ? ' unmatched' : ''}"${noMatch ? ' title="Not matched in loaded CSV"' : ''}>
      <div class="pname">${name}${noMatch ? " ⚠" : ""}</div>
      <div class="pbar-wrap">
        <div class="pbar ${isPos ? "pos" : "neg"}" style="width:${pct}%"></div>
      </div>
      <span class="pscore ${isPos ? "pos" : "neg"}">${isPos ? "+" : ""}${score}</span>
      <input type="range" min="-100" max="100" value="${score}"
             data-name="${encodeURIComponent(name)}" class="prio-slider">
    </div>`;
  }).join("");

  list.querySelectorAll(".prio-slider").forEach(sl => {
    sl.addEventListener("input", e => {
      const name = decodeURIComponent(e.target.dataset.name);
      priorities[name] = parseInt(e.target.value, 10);
      renderPriorityList();
      updatePriorityCoverage();
      if (csvData) {
        renderTopPicks();
        renderIssueList();
      }
    });
  });
}

function updatePriorityCoverage() {
  const names   = Object.keys(priorities);
  const matched = names.filter(n => !!resolveCol(n)).length;
  const total   = statCols.length || names.length;
  const pct     = total ? Math.round((matched / total) * 100) : 0;

  document.getElementById("prio-coverage").style.width = pct + "%";
  document.getElementById("prio-coverage-label").textContent =
    `Coverage: ${names.length} stats configured · ${matched} matched to CSV columns`;
}

// ── Overview mini-bars ───────────────────────────────────────────────────────

function renderPriorityPreviews() {
  const pos    = DEFAULT_PRIORITIES.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const neg    = DEFAULT_PRIORITIES.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const maxAbs = 99;

  function makeBar([name, score]) {
    const pct   = (Math.abs(score) / maxAbs) * 100;
    const isPos = score >= 0;
    return `<div class="mini-bar-row">
      <div class="mini-bar-name">${name}</div>
      <div class="mini-bar-track">
        <div class="mini-bar-fill ${isPos ? "pos" : "neg"}" style="width:${pct}%"></div>
      </div>
      <span class="mini-bar-score ${isPos ? "pos" : "neg"}">${isPos ? "+" : ""}${score}</span>
    </div>`;
  }

  document.getElementById("pos-preview").innerHTML = pos.map(makeBar).join("");
  document.getElementById("neg-preview").innerHTML = neg.map(makeBar).join("");
}

// ── Top Picks ────────────────────────────────────────────────────────────────

function renderTopPicks() {
  if (!csvData) return;
  const card = document.getElementById("top-picks-card");
  const body = document.getElementById("top-picks-body");
  card.style.display = "";

  const preview = allIssues.slice(0, 12);
  body.innerHTML = preview.map(iss => {
    const scored = scoreIssue(iss);
    const best   = scored[0];
    if (!best) return "";
    const sign = best.score >= 0 ? "+" : "";
    const title = (iss.title || "").replace(/^#\d+\s*/, "").substring(0, 80);
    return `<div class="log-entry">
      <span class="li-id">#${iss.num}</span>
      <span>${title}</span>
      <span class="li-score">${sign}${best.score.toFixed(1)}</span>
    </div>`;
  }).join("");
}

// ── Issue List ───────────────────────────────────────────────────────────────

let sortMode = "num";

function renderIssueList() {
  if (!csvData) return;

  const container = document.getElementById("issue-results");
  const search    = (document.getElementById("issue-search").value || "").toLowerCase();

  let issues = allIssues.filter(iss => {
    if (!search) return true;
    const t = (iss.title || "").toLowerCase();
    return t.includes(search) || String(iss.num).includes(search);
  });

  if (sortMode === "best")  issues = [...issues].sort((a, b) => bestScore(b) - bestScore(a));
  if (sortMode === "worst") issues = [...issues].sort((a, b) => bestScore(a) - bestScore(b));

  const shown = issues.slice(0, 50);

  if (!shown.length) {
    container.innerHTML = '<div class="empty">No issues found</div>';
    return;
  }

  container.innerHTML = shown.map(iss => {
    const bs   = bestScore(iss);
    const sign = bs >= 0 ? "+" : "";
    return `<div class="issue-card" data-num="${iss.num}">
      <div class="issue-header">
        <span class="issue-num">#${iss.num}</span>
        <span class="issue-title">${(iss.title || "").replace(/^#\d+\s*/, "")}</span>
        <span class="issue-meta">${iss.rows.length} opts · best ${sign}${bs.toFixed(1)}</span>
      </div>
      <div class="issue-body" id="body-${iss.num}"></div>
    </div>`;
  }).join("");

  container.querySelectorAll(".issue-card").forEach(card => {
    card.addEventListener("click", () => toggleIssue(card));
  });
}

function toggleIssue(card) {
  const num    = parseInt(card.dataset.num, 10);
  const body   = document.getElementById("body-" + num);
  const expand = card.classList.toggle("expanded");
  body.classList.toggle("open", expand);

  if (expand && !body.dataset.rendered) {
    body.dataset.rendered = "1";
    body.innerHTML = renderIssueOptions(num);
  }
}

function renderIssueOptions(num) {
  const iss = allIssues.find(i => i.num === num);
  if (!iss) return "";

  const scored = scoreIssue(iss);

  return scored.map((opt, idx) => {
    const isWinner = idx === 0;
    const sign     = opt.score >= 0 ? "+" : "";

    // Top stat movers relevant to configured priorities
    const movers = statCols
      .filter(col => {
        const name = col.replace(/^Industry:\s*/i,"").replace(/^Sector:\s*/i,"");
        return priorities[name] !== undefined || priorities[col] !== undefined;
      })
      .map(col => ({ col, delta: opt.row[col] || 0 }))
      .filter(x => Math.abs(x.delta) > 0.5)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);

    const moverHtml = movers.map(m => {
      const name = m.col.replace(/^Industry:\s*/i,"").replace(/^Sector:\s*/i,"");
      return `<span class="mover-tag ${m.delta > 0 ? "up" : "down"}">
        ${m.delta > 0 ? "+" : ""}${m.delta.toFixed(2)} ${name}
      </span>`;
    }).join("");

    return `<div class="opt-row${isWinner ? " winner" : ""}">
      <span class="opt-num">${opt.num}</span>
      <div>
        <div class="opt-text">${opt.text.substring(0, 200)}</div>
        ${isWinner ? '<span class="winner-badge">✓ Bot Pick</span>' : ""}
        <div class="stat-movers">${moverHtml}</div>
      </div>
      <span class="opt-score ${opt.score >= 0 ? "pos" : "neg"}">${sign}${opt.score.toFixed(1)}</span>
    </div>`;
  }).join("");
}
