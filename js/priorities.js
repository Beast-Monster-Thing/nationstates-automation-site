/**
 * priorities.js
 * Priority state management. Stat names are derived from the CSV on load.
 */

// Live priority state: { statName: score }
let priorities = {};

function initPrioritiesFromCols(cols) {
  cols.forEach(col => {
    const name = col.replace(/^Industry:\s*/i, "").replace(/^Sector:\s*/i, "");
    if (!(name in priorities)) priorities[name] = 0;
  });
}

function resetPriorities() {
  Object.keys(priorities).forEach(k => { priorities[k] = 0; });
}

function exportPriorityCfg() {
  const lines = [
    "# NationStates stat priority list",
    "# Format: Stat Name — score",
    "# Positive score = want this stat HIGHER",
    "# Negative score = want this stat LOWER",
    "# Absolute value determines priority weight",
    "# Stats not listed here are ignored entirely",
    "",
  ];
  Object.entries(priorities)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([name, score]) => lines.push(`${name} — ${score}`));

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "priority.cfg";
  a.click();
}
 
