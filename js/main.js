/**
 * priorities.js
 * Default priority data (from priority.cfg) and priority state management.
 */

const DEFAULT_PRIORITIES = [
  ["Religiousness",              99],
  ["Defense Forces",             97],
  ["Law Enforcement",            96],
  ["Authoritarianism",           95],
  ["Compliance",                 94],
  ["Taxation",                   92],
  ["Government Size",            90],
  ["Influence",                  90],
  ["Social Conservatism",        88],
  ["Arms Manufacturing",         87],
  ["Ideological Radicality",     85],
  ["Weaponization",              85],
  ["Information Technology",     82],
  ["Culture",                    80],
  ["Intelligence",               78],
  ["Economy",                    75],
  ["Agriculture",                70],
  ["Population",                 68],
  ["Manufacturing",              65],
  ["Book Publishing",            60],
  ["Scientific Advancement",     58],
  ["Mining",                     55],
  ["Employment",                 50],
  ["Health",                     48],
  ["Political Apathy",           45],
  ["Ignorance",                  40],
  ["Foreign Aid",                38],
  ["Wealth Gaps",                35],
  ["Average Income of Rich",     32],
  ["World Assembly Endorsements",30],
  ["Integrity",                  28],
  ["Residency",                  25],
  ["Public Education",           22],
  ["Automobile Manufacturing",   20],
  ["Tourism",                    18],
  ["Civil Rights",              -95],
  ["Political Freedom",         -92],
  ["Secularism",                -90],
  ["Freedom From Taxation",     -88],
  ["Pacifism",                  -85],
  ["Inclusiveness",             -70],
  ["Economic Freedom",          -65],
  ["Youth Rebelliousness",      -60],
  ["Black Market",              -50],
  ["Crime",                     -48],
  ["Recreational Drug Use",     -40],
  ["Gambling",                  -35],
  ["Nudity",                    -30],
  ["Corruption",                -25],
  ["Income Equality",           -20],
  ["Eco-Friendliness",          -10],
];

// Live priority state: { statName: score }
let priorities = {};
DEFAULT_PRIORITIES.forEach(([name]) => { priorities[name] = 0; });

function resetPriorities() {
  priorities = {};
  DEFAULT_PRIORITIES.forEach(([name]) => { priorities[name] = 0; });
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
