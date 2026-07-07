#!/usr/bin/env node
// OCC structural validator — zero-dependency Node ESM.
//
// The acceptance test for divisions/*.json. Run in CI; exit 0 = pass, 1 = fail
// with every violation listed.
//
// The numbering model (see GOVERNANCE.md): a key is a permanent identifier; it
// does NOT encode display order (that is list position). Keys are unbounded
// decimal, min-2-digit, and are never renumbered or reused. So this validator
// deliberately does NOT require keys to be gap-free, banded, ascending, capped,
// or to sit in any particular order — only that they are well-formed, unique
// across the whole set (including deprecated entries), and prefixed correctly.
//
// Checks:
//   - each divisions/*.json filename base equals its "division" value; divisions unique
//   - division key ^\d{2,}$; section key ^\d{2,}\.\d{2,}$; optional L3 ^\d{2,}\.\d{2,}\.\d{2,}$
//   - a section/L3 key is prefixed by its division ("05.07" under division "05")
//   - keys globally unique across ALL divisions INCLUDING deprecated entries (never-reuse)
//   - every division has its DD.00 division-general section and >= 1 section beyond it
//   - deprecated entries (deprecated:true) carry a "successor" that references an existing key
//   - every title is { en: <string> } with en nonempty and <= 80 chars
//   - crosswalks/ checks run only when the files are present (optional interop layer)
//
// Usage: node scripts/validate.mjs   (paths resolve relative to this file).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCatalog, readVersion } from "./build-catalog.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIVISIONS_DIR = resolve(HERE, "..", "divisions");
const CROSSWALKS_DIR = resolve(HERE, "..", "crosswalks");
const ICMS_CSV = join(CROSSWALKS_DIR, "icms.csv");
const UNICLASS_CSV = join(CROSSWALKS_DIR, "uniclass.csv");
const CODES_MD = resolve(HERE, "..", "CODES.md");

const UNICLASS_CODE_RE = /^(Ss|EF)_\d{2}(_\d{2}){0,3}$/;
const MAX_TITLE_LEN = 80;

const DIVISION_RE = /^\d{2,}$/;
const SECTION_KEY_RE = /^\d{2,}\.\d{2,}$/;
const L3_KEY_RE = /^\d{2,}\.\d{2,}\.\d{2,}$/;

const violations = [];
const fail = (msg) => violations.push(msg);

function validateTitle(title, where) {
  if (typeof title !== "object" || title === null) {
    fail(`${where}: title must be an object { en: … }`);
    return;
  }
  const en = title.en;
  if (typeof en !== "string" || en.trim().length === 0) {
    fail(`${where}: title.en must be a nonempty string`);
    return;
  }
  if (en.length > MAX_TITLE_LEN) {
    fail(`${where}: title.en "${en}" is ${en.length} chars (max ${MAX_TITLE_LEN})`);
  }
}

// ---- load every divisions/*.json -----------------------------------------
let files;
try {
  files = readdirSync(DIVISIONS_DIR).filter((f) => f.endsWith(".json")).sort();
} catch (err) {
  console.error(`FATAL: cannot read ${DIVISIONS_DIR}: ${err.message}`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`FATAL: no division files found in ${DIVISIONS_DIR}`);
  process.exit(1);
}

const divisions = []; // { file, division, sections, count }
const rawDivisions = []; // parsed division objects in file order (for the CODES.md drift check)
const globalKeys = new Map(); // key -> "file (deprecated?)"  — every key, incl. deprecated
const allKeySet = new Set(); // for successor resolution (divisions + sections)
const seenDivisionNumbers = new Set();

for (const file of files) {
  const path = join(DIVISIONS_DIR, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`${file}: not valid JSON (${err.message})`);
    continue;
  }

  rawDivisions.push(data);
  const base = file.replace(/\.json$/, "");
  const division = data.division;

  if (typeof division !== "string" || !DIVISION_RE.test(division)) {
    fail(`${file}: "division" must be a decimal string of >= 2 digits (got ${JSON.stringify(division)})`);
  } else {
    if (division !== base) fail(`${file}: filename base "${base}" != division "${division}"`);
    if (seenDivisionNumbers.has(division)) fail(`${file}: duplicate division number "${division}"`);
    seenDivisionNumbers.add(division);
    allKeySet.add(division);
  }

  validateTitle(data.title, `${file} division title`);

  const sections = Array.isArray(data.sections) ? data.sections : null;
  if (!sections) {
    fail(`${file}: "sections" must be an array`);
    divisions.push({ file, division, sections: [], count: 0 });
    continue;
  }

  let hasGeneral = false;
  let realSections = 0; // sections other than DD.00
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const where = `${file} sections[${i}]`;
    if (typeof s !== "object" || s === null) {
      fail(`${where}: not an object`);
      continue;
    }
    const key = s.key;
    const isL2 = typeof key === "string" && SECTION_KEY_RE.test(key);
    const isL3 = typeof key === "string" && L3_KEY_RE.test(key);
    if (!isL2 && !isL3) {
      fail(`${where}: key must match DD.NN (or DD.NN.NN), each part >= 2 digits (got ${JSON.stringify(key)})`);
    } else {
      if (DIVISION_RE.test(division) && !key.startsWith(`${division}.`)) {
        fail(`${where}: key "${key}" is not prefixed by its division "${division}"`);
      }
      if (globalKeys.has(key)) {
        fail(`${where}: key "${key}" duplicates ${globalKeys.get(key)} — keys are never reused, even after deprecation`);
      } else {
        globalKeys.set(key, `${file}${s.deprecated ? " (deprecated)" : ""}`);
        allKeySet.add(key);
      }
      if (key === `${division}.00`) hasGeneral = true;
      else realSections++;
    }
    validateTitle(s.title, `${where} (${typeof key === "string" ? key : "?"})`);
  }

  if (DIVISION_RE.test(division)) {
    if (!hasGeneral) fail(`${file}: missing required section ${division}.00 (division-general)`);
    if (realSections < 1) fail(`${file}: needs >= 1 section beyond ${division}.00`);
  }

  divisions.push({ file, division, sections, count: sections.length });
}

// ---- deprecated entries must carry a resolvable successor -------------------
for (const { file, sections } of divisions) {
  for (const s of sections) {
    if (s && s.deprecated) {
      if (typeof s.successor !== "string" || !allKeySet.has(s.successor)) {
        fail(`${file}: deprecated key "${s.key}" must carry a "successor" that references an existing key (got ${JSON.stringify(s.successor)})`);
      }
    }
  }
}

// ---- crosswalk coverage (OPTIONAL interop layer) ---------------------------
const allSectionKeys = new Set();
for (const d of divisions) {
  for (const s of d.sections) {
    if (s && typeof s.key === "string" && (SECTION_KEY_RE.test(s.key) || L3_KEY_RE.test(s.key))) {
      allSectionKeys.add(s.key);
    }
  }
}
const allOccKeys = new Set([...seenDivisionNumbers, ...allSectionKeys]);

function readCsv(path, expectedHeader) {
  const raw = readFileSync(path, "utf8");
  const rows = [];
  let header = null;
  for (const [i, line] of raw.split(/\r?\n/).entries()) {
    if (line.trim() === "") continue;
    if (header === null && line.startsWith("#")) continue;
    const cells = line.split(",").map((c) => c.trim());
    if (header === null) {
      header = cells;
      if (expectedHeader && header.join(",") !== expectedHeader) {
        fail(`${path.split("/").pop()}: header is "${header.join(",")}", expected "${expectedHeader}"`);
      }
      continue;
    }
    rows.push({ cells, lineNo: i + 1 });
  }
  return { rows };
}

if (!existsSync(ICMS_CSV)) {
  console.log("note: crosswalks/icms.csv absent — skipping ICMS crosswalk checks (core release).");
} else {
  const { rows } = readCsv(ICMS_CSV, "occ_key,icms_code,icms_label");
  const seen = new Map();
  for (const { cells, lineNo } of rows) {
    const [occKey, icmsCode, icmsLabel] = cells;
    if (cells.length < 3) { fail(`icms.csv line ${lineNo}: expected 3 columns, got ${cells.length}`); continue; }
    if (!allOccKeys.has(occKey)) fail(`icms.csv line ${lineNo}: occ_key "${occKey}" is not a known division or section`);
    if (!icmsCode) fail(`icms.csv line ${lineNo}: icms_code must be nonempty (occ_key "${occKey}")`);
    if (!icmsLabel) fail(`icms.csv line ${lineNo}: icms_label must be nonempty (occ_key "${occKey}")`);
    if (seen.has(occKey)) fail(`icms.csv line ${lineNo}: occ_key "${occKey}" mapped again (first at line ${seen.get(occKey)})`);
    else seen.set(occKey, lineNo);
  }
  for (const key of [...allOccKeys].sort()) {
    if (!seen.has(key)) fail(`icms.csv: no mapping for occ_key "${key}" (every division and section must be covered exactly once)`);
  }
}

if (!existsSync(UNICLASS_CSV)) {
  console.log("note: crosswalks/uniclass.csv absent — skipping Uniclass crosswalk checks (core release).");
} else {
  const { rows } = readCsv(UNICLASS_CSV, "occ_key,uniclass_code,confidence");
  const sectionCovered = new Set();
  for (const { cells, lineNo } of rows) {
    const [occKey, uniCode, confStr] = cells;
    if (cells.length < 3) { fail(`uniclass.csv line ${lineNo}: expected 3 columns, got ${cells.length}`); continue; }
    if (!allOccKeys.has(occKey)) fail(`uniclass.csv line ${lineNo}: occ_key "${occKey}" is not a known division or section`);
    else if (allSectionKeys.has(occKey)) sectionCovered.add(occKey);
    if (!UNICLASS_CODE_RE.test(uniCode)) fail(`uniclass.csv line ${lineNo}: uniclass_code "${uniCode}" must match ${UNICLASS_CODE_RE}`);
    const conf = Number(confStr);
    if (!Number.isFinite(conf) || conf <= 0 || conf > 1) fail(`uniclass.csv line ${lineNo}: confidence "${confStr}" must be a number in (0,1]`);
  }
  for (const key of [...allSectionKeys].sort()) {
    if (!sectionCovered.has(key)) fail(`uniclass.csv: section "${key}" has no Uniclass row (every section needs >= 1)`);
  }
}

// ---- CODES.md drift check --------------------------------------------------
// The committed catalog must match a fresh render of the source. Only runs when
// the structural checks passed, so a render over malformed data can't throw.
if (violations.length === 0) {
  if (!existsSync(CODES_MD)) {
    fail("CODES.md is missing — run `node scripts/build-catalog.mjs` and commit it");
  } else {
    const fresh = renderCatalog(rawDivisions, readVersion()) + "\n";
    if (fresh !== readFileSync(CODES_MD, "utf8")) {
      fail("CODES.md is out of date — run `node scripts/build-catalog.mjs` and commit the result");
    }
  }
}

// ---- report ---------------------------------------------------------------
const total = divisions.reduce((acc, d) => acc + d.count, 0);
console.log("OCC division section counts:");
for (const d of [...divisions].sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`  ${d.division}  ${String(d.count).padStart(3)} sections`);
}
console.log(`  ----`);
console.log(`  TOTAL ${total} sections across ${divisions.length} divisions`);

if (violations.length > 0) {
  console.error(`\nFAIL — ${violations.length} violation(s):`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`\nPASS — ${total} sections, all structural checks satisfied.`);
process.exit(0);
