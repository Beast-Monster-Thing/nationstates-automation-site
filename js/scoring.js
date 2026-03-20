/**
 * scoring.js
 * CSV parsing, stat normalization, and option scoring.
 * Mirrors the logic in main.py exactly.
 */

let csvData      = null;  // array of parsed row objects
let statCols     = [];    // census column names (everything after col index 3)
let statStds     = {};    // { colName: stdDev }
let allIssues    = [];    // [{ num, title, rows[] }] sorted by num

/**
 * Ingest PapaParse results and build derived data structures.
 */
function processCSV(results) {
  csvData = results.data;

  // Stat columns: everything after issue_num, issue_title, option_num, option_text
  const cols = Object.keys(csvData[0]);
  statCols = cols.slice(4);

  // Standard deviations per stat (population std)
  statStds = {};
  statCols.forEach(col => {
    const vals = csvData
      .map(r => r[col])
      .filter(v => v != null && !isNaN(v));
    if (!vals.length) { statStds[col] = 0; return; }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sq   = vals.map(v => (v - mean) ** 2);
    statStds[col] = Math.sqrt(sq.reduce((a, b) => a + b, 0) / vals.length);
  });

  // Group rows by issue
  const issueMap = {};
  csvData.forEach(row => {
    const k = row.issue_num;
    if (!issueMap[k]) issueMap[k] = { num: k, title: row.issue_title, rows: [] };
    issueMap[k].rows.push(row);
  });
  allIssues = Object.values(issueMap).sort((a, b) => a.num - b.num);
}

/**
 * Resolve a priority name to its actual CSV column.
 * Handles "Industry: " / "Sector: " prefixes transparently.
 */
function resolveCol(name) {
  const n = name.toLowerCase();
  for (const col of statCols) {
    const clean = col
      .replace(/^Industry:\s*/i, "")
      .replace(/^Sector:\s*/i, "")
      .toLowerCase();
    if (clean === n || col.toLowerCase() === n) return col;
  }
  return null;
}

/**
 * Build linear rank weights from current priorities.
 * Highest |score| → highest weight.
 */
function buildWeights() {
  const sorted = Object.entries(priorities)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const weights = {};
  sorted.forEach(([name], idx) => { weights[name] = sorted.length - idx; });
  return weights;
}

/**
 * Score a single CSV row against current priorities.
 * Mirrors score_option() in main.py.
 */
function scoreRow(row) {
  const weights = buildWeights();
  let total = 0;

  for (const [name, pScore] of Object.entries(priorities)) {
    const w   = weights[name] || 0;
    const col = resolveCol(name);
    if (!col) continue;

    const delta = row[col];
    if (delta == null || isNaN(delta)) continue;

    const std = statStds[col] || 0;
    if (std === 0) continue;

    const norm = delta / std;
    const dir  = pScore >= 0 ? norm : -norm;
    total += w * dir;
  }

  return total;
}

/**
 * Score every option for an issue and return them sorted best-first.
 */
function scoreIssue(issueObj) {
  return issueObj.rows
    .map(row => ({
      row,
      num:   row.option_num,
      text:  row.option_text || "",
      score: scoreRow(row),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Return the best-scoring option score for an issue (for sorting the list).
 */
function bestScore(issueObj) {
  return Math.max(...issueObj.rows.map(r => scoreRow(r)));
}
