/**
 * Génère docs/COPY_CATALOG.md depuis dictionaries/fr.json + en.json.
 * Ne pas éditer le catalogue à la main.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function flatten(value, prefix = "") {
  /** @type {{ key: string, text: string }[]} */
  const rows = [];
  if (value == null) return rows;
  if (typeof value === "string") {
    rows.push({ key: prefix, text: value });
    return rows;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      rows.push(...flatten(item, `${prefix}[${i}]`));
    });
    return rows;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k;
      rows.push(...flatten(v, next));
    }
  }
  return rows;
}

function escapeCell(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

const fr = JSON.parse(readFileSync(join(root, "dictionaries/fr.json"), "utf8"));
const en = JSON.parse(readFileSync(join(root, "dictionaries/en.json"), "utf8"));
const frRows = flatten(fr);
const enMap = new Map(flatten(en).map((r) => [r.key, r.text]));

const byNs = new Map();
for (const row of frRows) {
  const ns = row.key.split(/[.[]/)[0];
  if (!byNs.has(ns)) byNs.set(ns, []);
  byNs.get(ns).push(row);
}

const date = new Date().toISOString().slice(0, 10);
let md = `# Catalogue copy écran (généré)

**Type :** living · **Vérité pour :** liste FR/EN de tout le copy dictionnaire.  
**Ne pas éditer.** Source : \`dictionaries/fr.json\` + \`en.json\`. Régénérer : \`node scripts/export-copy-catalog.mjs\`.  
**Canon :** [COPY.md](COPY.md) · **Généré :** ${date} · **Entrées :** ${frRows.length}

`;

for (const [ns, rows] of byNs) {
  md += `## \`${ns}\`\n\n`;
  md += `| Clé | FR | EN |\n|-----|----|----|\n`;
  for (const row of rows) {
    const enText = enMap.get(row.key) ?? "—";
    md += `| \`${row.key}\` | ${escapeCell(row.text)} | ${escapeCell(enText)} |\n`;
  }
  md += `\n`;
}

const missingEn = frRows.filter((r) => !enMap.has(r.key)).map((r) => r.key);
const extraEn = [...enMap.keys()].filter((k) => !frRows.some((r) => r.key === k));
if (missingEn.length || extraEn.length) {
  md += `## Écarts FR/EN\n\n`;
  if (missingEn.length) md += `Clés FR sans EN : ${missingEn.map((k) => `\`${k}\``).join(", ")}\n\n`;
  if (extraEn.length) md += `Clés EN sans FR : ${extraEn.map((k) => `\`${k}\``).join(", ")}\n\n`;
}

writeFileSync(join(root, "docs/COPY_CATALOG.md"), md);
console.log(`[copy-catalog] ${frRows.length} clés → docs/COPY_CATALOG.md`);
