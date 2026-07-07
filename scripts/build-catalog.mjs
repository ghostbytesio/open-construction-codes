#!/usr/bin/env node
// OCC human-readable catalog generator — zero-dependency Node ESM.
//
// Renders divisions/*.json into CODES.md: a browsable, Ctrl-F-searchable table
// of every code. Generated, never hand-edited — validate.mjs imports
// renderCatalog() and fails CI if the committed CODES.md drifts from source.
//
// Usage: node scripts/build-catalog.mjs   (writes ../CODES.md)

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIVISIONS_DIR = join(ROOT, "divisions");

// GitHub-compatible heading anchor: lowercase, drop anything that isn't a word
// char / space / hyphen, then spaces -> hyphens. Matches GitHub's rendering so
// the table-of-contents links resolve.
function anchor(text) {
  // Keep unicode letters/numbers (so "Façades" -> "façades"), drop other
  // punctuation, spaces -> hyphens — matching GitHub's heading-slug rendering.
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

function escapeCell(s) {
  return s.replace(/\|/g, "\\|");
}

// divisionsData: array of raw division JSON objects ({ division, title, sections }),
// already in display (file) order. Returns the full CODES.md string.
export function renderCatalog(divisionsData, version) {
  const out = [];
  out.push(`# Open Construction Codes (OCC) — code catalog`);
  out.push("");
  out.push(`_Version ${version}. Generated from \`divisions/*.json\` — do not hand-edit; regenerate with \`node scripts/build-catalog.mjs\`._`);
  out.push("");
  out.push("A code is `DD.NN` — a two-digit **division** and a section number. Section numbers are stable identifiers, not a ranking: they are assigned in order of recognition and never renumbered, so the number does not imply position. Browse below or use your browser's find (Ctrl/⌘-F) to search by code or trade.");
  out.push("");

  // Table of contents
  out.push("## Divisions");
  out.push("");
  for (const d of divisionsData) {
    const heading = `${d.division} — ${d.title.en}`;
    out.push(`- [${heading}](#${anchor(heading)})`);
  }
  out.push("");

  // One table per division
  for (const d of divisionsData) {
    const heading = `${d.division} — ${d.title.en}`;
    out.push(`## ${heading}`);
    out.push("");
    out.push("| Code | Section |");
    out.push("| --- | --- |");
    for (const s of d.sections) {
      let title = escapeCell(s.title.en);
      let code = s.key;
      if (s.deprecated) {
        title = `~~${title}~~ (deprecated${s.successor ? ` → ${s.successor}` : ""})`;
        code = `~~${code}~~`;
      }
      out.push(`| \`${code}\` | ${title} |`);
    }
    out.push("");
  }

  return out.join("\n");
}

// Load raw division data in display (filename) order.
export function loadDivisions() {
  const files = readdirSync(DIVISIONS_DIR).filter((f) => f.endsWith(".json")).sort();
  return files.map((f) => JSON.parse(readFileSync(join(DIVISIONS_DIR, f), "utf8")));
}

export function readVersion() {
  return readFileSync(join(ROOT, "VERSION"), "utf8").trim();
}

// Run directly → write CODES.md
if (import.meta.url === `file://${process.argv[1]}`) {
  const md = renderCatalog(loadDivisions(), readVersion());
  writeFileSync(join(ROOT, "CODES.md"), md + "\n", "utf8");
  const count = loadDivisions().reduce((a, d) => a + d.sections.length, 0);
  console.log(`Wrote CODES.md — ${count} codes across ${loadDivisions().length} divisions.`);
}
