/**
 * ui.js — Sovereign Ledger Design
 * All DOM rendering: priority list, issue cards, option rows, mini-bars.
 */

let prioFilter = "all";

// ── Priority List ─────────────────────────────────────────────────────────────

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
    const pct     = (Math.abs(score) / maxAbs) * 100;
    const isPos   = score >= 0;
    const col     = resolveCol(name);
    const noMatch = !col && csvData;

    return `<div class="prow${noMatch ? " unmatched" : ""}"${noMatch ? ` title="Not matched in loaded CSV"` : ""}>
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
      if (csvData) { renderTopPicks(); renderIssueList(); }
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

// ── Priority Overview Mini-Bars ───────────────────────────────────────────────

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

// ── Top Picks ─────────────────────────────────────────────────────────────────

function renderTopPicks() {
  if (!csvData) return;
  const card = document.getElementById("top-picks-card");
  const body = document.getElementById("top-picks-body");
  card.classList.remove("hidden");

  const preview = allIssues.slice(0, 12);
  body.innerHTML = preview.map(iss => {
    const scored = scoreIssue(iss);
    const best   = scored[0];
    if (!best) return "";
    const sign  = best.score >= 0 ? "+" : "";
    const title = (iss.title || "").replace(/^#\d+\s*/, "").substring(0, 72);
    return `<div class="pick-row">
      <span class="pick-num">#${iss.num}</span>
      <span class="pick-title">${title}</span>
      <span class="pick-score">${sign}${best.score.toFixed(1)}</span>
    </div>`;
  }).join("");
}

// ── Issue List ────────────────────────────────────────────────────────────────

let sortMode = "num";

function renderIssueList() {
  if (!csvData) return;
  const container = document.getElementById("issue-results");
  const search    = (document.getElementById("issue-search").value || "").toLowerCase();

  let issues = allIssues.filter(iss => {
    if (!search) return true;
    return (iss.title || "").toLowerCase().includes(search) ||
           String(iss.num).includes(search);
  });

  if (sortMode === "best")  issues = [...issues].sort((a, b) => bestScore(b) - bestScore(a));
  if (sortMode === "worst") issues = [...issues].sort((a, b) => bestScore(a) - bestScore(b));

  const shown = issues.slice(0, 50);

  if (!shown.length) {
    container.innerHTML = `<p class="text-center text-on-surface-variant text-sm py-10">No issues found</p>`;
    return;
  }

  container.innerHTML = shown.map(iss => {
    const bs   = bestScore(iss);
    const sign = bs >= 0 ? "+" : "";
    const title = (iss.title || "").replace(/^#\d+\s*/, "");
    return `<div class="issue-card" data-num="${iss.num}">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0 pr-4">
          <span class="issue-badge">Legislative Queue</span>
          <h3 class="issue-title-text">${title}</h3>
          <p class="text-xs text-on-surface-variant mt-1">${iss.rows.length} options</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-[0.6rem] uppercase tracking-widest text-outline font-bold">Best Score</p>
          <p class="font-headline text-2xl font-black text-primary">${sign}${bs.toFixed(1)}</p>
        </div>
      </div>
      <div class="issue-body" id="body-${iss.num}"></div>
    </div>`;
  }).join("");

  container.querySelectorAll(".issue-card").forEach(card => {
    card.addEventListener("click", () => toggleIssue(card));
  });
}

function toggleIssue(card) {
  const num  = parseInt(card.dataset.num, 10);
  const body = document.getElementById("body-" + num);
  const open = card.classList.toggle("expanded");
  body.classList.toggle("open", open);
  if (open && !body.dataset.rendered) {
    body.dataset.rendered = "1";
    body.innerHTML = renderIssueOptions(num);
  }
}

function renderIssueOptions(num) {
  const iss = allIssues.find(i => i.num === num);
  if (!iss) return "";
  const scored = scoreIssue(iss);

  // Build option grid (2-up)
  const cards = scored.map((opt, idx) => {
    const isWinner = idx === 0;
    const sign     = opt.score >= 0 ? "+" : "";
    const scoreCol = isWinner ? "text-primary" : "text-outline";
    const labelCol = isWinner ? "text-primary" : "text-outline";

    // Top stat movers
    const movers = statCols
      .filter(col => {
        const n = col.replace(/^Industry:\s*/i,"").replace(/^Sector:\s*/i,"");
        return priorities[n] !== undefined || priorities[col] !== undefined;
      })
      .map(col => ({
        name:  col.replace(/^Industry:\s*/i,"").replace(/^Sector:\s*/i,""),
        delta: opt.row[col] || 0,
      }))
      .filter(x => Math.abs(x.delta) > 0.3)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5);

    const tableRows = movers.map(m => {
      const pScore  = priorities[m.name] || 0;
      const contrib = (m.delta * (pScore >= 0 ? 1 : -1)).toFixed(2);
      const cc      = parseFloat(contrib) >= 0 ? "contrib-pos" : "contrib-neg";
      return `<tr>
        <td>${m.name}</td>
        <td class="text-right text-on-surface-variant">${m.delta > 0 ? "+" : ""}${m.delta.toFixed(2)}</td>
        <td class="text-right text-on-surface-variant">${Math.abs(pScore)}</td>
        <td class="${cc}">${contrib}</td>
      </tr>`;
    }).join("");

    const breakdown = movers.length ? `
      <div class="breakdown-table mt-4">
        <table>
          <thead><tr>
            <th>Stat</th><th class="text-right">Delta</th>
            <th class="text-right">Weight</th><th class="text-right">Contrib</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>` : "";

    const winnerCorner = isWinner ? `
      <div class="winner-corner"></div>
      <span class="material-symbols-outlined winner-star" style="font-variation-settings:'FILL' 1">star</span>` : "";

    return `<div class="opt-card ${isWinner ? "winner" : "loser"}">
      ${winnerCorner}
      <div class="flex justify-between items-center mb-1">
        <p class="opt-label ${labelCol}">Option ${opt.num}</p>
        <p class="opt-score-big ${scoreCol}">${sign}${opt.score.toFixed(1)}</p>
      </div>
      <p class="opt-text-body">${opt.text.substring(0, 180)}</p>
      ${breakdown}
    </div>`;
  });

  // 2-column grid for first two, rest stacked
  const pairs = [];
  for (let i = 0; i < cards.length; i += 2) {
    if (i + 1 < cards.length) {
      pairs.push(`<div class="grid grid-cols-2 gap-4">${cards[i]}${cards[i+1]}</div>`);
    } else {
      pairs.push(cards[i]);
    }
  }
  return pairs.join("");
}
