#!/usr/bin/env node
// OCC structural validator — zero-dependency Node ESM.
//
// This is the acceptance test for the content in divisions/*.json. It enforces
// the structural contract that Tasks 2-3 (crosswalks, pack pipeline) and the
// product's cost-code registry rely on. Run in CI; exit 0 = pass, 1 = fail with
// every violation listed.
//
// Checks:
//   - each divisions/*.json filename base equals its "division" value
//   - divisions cover exactly 01..36, each matching ^\d{2}$, none missing/extra
//   - every section key matches ^\d{2}\.\d{2}$ and its DD prefix == the division
//   - section keys are globally unique across all divisions
//   - section keys are strictly ascending within each division
//   - every division has both DD.00 and DD.90
//   - every division has >= 6 sections and <= 12 sections
//   - grand total sections >= 280
//   - every title is { en: <string> } with en nonempty and <= 80 chars
//
// Usage: node scripts/validate.mjs   (run from the repo root or anywhere;
// paths resolve relative to this file).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIVISIONS_DIR = resolve(HERE, "..", "divisions");
const CROSSWALKS_DIR = resolve(HERE, "..", "crosswalks");
const ICMS_CSV = join(CROSSWALKS_DIR, "icms.csv");
const UNICLASS_CSV = join(CROSSWALKS_DIR, "uniclass.csv");

const UNICLASS_CODE_RE = /^(Ss|EF)_\d{2}(_\d{2}){0,3}$/;

const MIN_SECTIONS_PER_DIVISION = 6;
const MAX_SECTIONS_PER_DIVISION = 12;
const MIN_TOTAL_SECTIONS = 280;
const MAX_TITLE_LEN = 80;
const FIRST_DIVISION = 1;
const LAST_DIVISION = 36;

const DIVISION_RE = /^\d{2}$/;
const KEY_RE = /^\d{2}\.\d{2}$/;

const violations = [];
const fail = (msg) => violations.push(msg);

// ---- load every divisions/*.json -----------------------------------------
let files;
try {
  files = readdirSync(DIVISIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
} catch (err) {
  console.error(`FATAL: cannot read ${DIVISIONS_DIR}: ${err.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`FATAL: no division files found in ${DIVISIONS_DIR}`);
  console.error("(expected divisions/01.json … divisions/36.json)");
  process.exit(1);
}

const divisions = []; // { file, division, sections, count }
const globalKeys = new Map(); // key -> file (first seen)
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

  const base = file.replace(/\.json$/, "");
  const division = data.division;

  // division field shape + filename agreement
  if (typeof division !== "string" || !DIVISION_RE.test(division)) {
    fail(`${file}: "division" must be a two-digit string (got ${JSON.stringify(division)})`);
  } else {
    if (division !== base) {
      fail(`${file}: filename base "${base}" != division "${division}"`);
    }
    if (seenDivisionNumbers.has(division)) {
      fail(`${file}: duplicate division number "${division}"`);
    }
    seenDivisionNumbers.add(division);
  }

  // division title
  validateTitle(data.title, `${file} division title`);

  // sections
  const sections = Array.isArray(data.sections) ? data.sections : null;
  if (!sections) {
    fail(`${file}: "sections" must be an array`);
    divisions.push({ file, division, sections: [], count: 0 });
    continue;
  }

  const keysInOrder = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const where = `${file} sections[${i}]`;
    if (typeof s !== "object" || s === null) {
      fail(`${where}: not an object`);
      continue;
    }
    const key = s.key;
    if (typeof key !== "string" || !KEY_RE.test(key)) {
      fail(`${where}: key must match DD.SS (got ${JSON.stringify(key)})`);
    } else {
      // prefix must equal the division
      const prefix = key.slice(0, 2);
      if (DIVISION_RE.test(division) && prefix !== division) {
        fail(`${where}: key "${key}" prefix "${prefix}" != division "${division}"`);
      }
      // global uniqueness
      if (globalKeys.has(key)) {
        fail(`${where}: key "${key}" duplicates ${globalKeys.get(key)}`);
      } else {
        globalKeys.set(key, file);
      }
      keysInOrder.push(key);
    }
    validateTitle(s.title, `${where} (${typeof key === "string" ? key : "?"})`);
  }

  // strictly ascending within the division
  for (let i = 1; i < keysInOrder.length; i++) {
    if (!(keysInOrder[i] > keysInOrder[i - 1])) {
      fail(`${file}: keys not strictly ascending: "${keysInOrder[i - 1]}" then "${keysInOrder[i]}"`);
    }
  }

  // DD.00 and DD.90 present
  if (DIVISION_RE.test(division)) {
    if (!keysInOrder.includes(`${division}.00`)) {
      fail(`${file}: missing required section ${division}.00 (division-general)`);
    }
    if (!keysInOrder.includes(`${division}.90`)) {
      fail(`${file}: missing required section ${division}.90 (other/misc)`);
    }
  }

  // minimum and maximum sections per division
  if (sections.length < MIN_SECTIONS_PER_DIVISION) {
    fail(`${file}: has ${sections.length} sections, need >= ${MIN_SECTIONS_PER_DIVISION}`);
  }
  if (sections.length > MAX_SECTIONS_PER_DIVISION) {
    fail(`${file}: has ${sections.length} sections, need <= ${MAX_SECTIONS_PER_DIVISION}`);
  }

  divisions.push({ file, division, sections, count: sections.length });
}

// ---- coverage: exactly 01..36 ---------------------------------------------
const expected = [];
for (let n = FIRST_DIVISION; n <= LAST_DIVISION; n++) {
  expected.push(String(n).padStart(2, "0"));
}
for (const dd of expected) {
  if (!seenDivisionNumbers.has(dd)) fail(`missing division ${dd}`);
}
for (const dd of seenDivisionNumbers) {
  if (DIVISION_RE.test(dd) && !expected.includes(dd)) {
    fail(`unexpected division ${dd} (spine is 01..36)`);
  }
}

// ---- grand total ----------------------------------------------------------
const total = divisions.reduce((acc, d) => acc + d.count, 0);
if (total < MIN_TOTAL_SECTIONS) {
  fail(`grand total ${total} sections < required ${MIN_TOTAL_SECTIONS}`);
}

// ---- crosswalk coverage: icms.csv + uniclass.csv --------------------------
// The set of every valid occ_key: each division "DD" plus each section "DD.SS".
// Crosswalk rows may only reference keys in this set; icms.csv must cover the
// whole set exactly once; uniclass.csv must cover every SECTION at least once.
const allDivisionKeys = new Set(); // "01" .. "36"
const allSectionKeys = new Set(); // "01.00" .. "36.90"
for (const d of divisions) {
  if (DIVISION_RE.test(d.division)) allDivisionKeys.add(d.division);
  for (const s of d.sections) {
    if (s && typeof s.key === "string" && KEY_RE.test(s.key)) allSectionKeys.add(s.key);
  }
}
const allOccKeys = new Set([...allDivisionKeys, ...allSectionKeys]);

// Minimal RFC-4180-ish CSV reader: strips a leading "#"-comment/blank lines,
// treats the first remaining line as the header, ignores later blank lines,
// and does NOT support quoted commas (our crosswalk values never contain them).
function readCsv(path, expectedHeader) {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);
  const rows = [];
  let header = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (header === null && line.startsWith("#")) continue; // header comment(s)
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
  return { header, rows };
}

// icms.csv: OPTIONAL interop layer. When present it must cover every division
// AND section exactly once, with nonempty icms_code + icms_label and no unknown
// occ_key. A core release that ships only the divisions (no crosswalks/) is
// valid — the crosswalk layers are added in a later, separately verified release.
if (!existsSync(ICMS_CSV)) {
  console.log("note: crosswalks/icms.csv absent — skipping ICMS crosswalk checks (core release).");
} else {
  const { rows } = readCsv(ICMS_CSV, "occ_key,icms_code,icms_label");
  const seen = new Map(); // occ_key -> first lineNo
  for (const { cells, lineNo } of rows) {
    const [occKey, icmsCode, icmsLabel] = cells;
    if (cells.length < 3) {
      fail(`icms.csv line ${lineNo}: expected 3 columns, got ${cells.length}`);
      continue;
    }
    if (!allOccKeys.has(occKey)) {
      fail(`icms.csv line ${lineNo}: occ_key "${occKey}" is not a known division or section`);
    }
    if (!icmsCode || icmsCode.length === 0) {
      fail(`icms.csv line ${lineNo}: icms_code must be nonempty (occ_key "${occKey}")`);
    }
    if (!icmsLabel || icmsLabel.length === 0) {
      fail(`icms.csv line ${lineNo}: icms_label must be nonempty (occ_key "${occKey}")`);
    }
    if (seen.has(occKey)) {
      fail(`icms.csv line ${lineNo}: occ_key "${occKey}" mapped again (first at line ${seen.get(occKey)}); ICMS mapping must be exactly one row per key`);
    } else {
      seen.set(occKey, lineNo);
    }
  }
  for (const key of [...allOccKeys].sort()) {
    if (!seen.has(key)) fail(`icms.csv: no mapping for occ_key "${key}" (every division and section must be covered exactly once)`);
  }
}

// uniclass.csv: OPTIONAL interop layer. When present, every SECTION has >= 1
// row, codes match the Uniclass identifier shape, confidence in (0,1], no
// unknown occ_key. Absent in a core release (see the ICMS note above).
if (!existsSync(UNICLASS_CSV)) {
  console.log("note: crosswalks/uniclass.csv absent — skipping Uniclass crosswalk checks (core release).");
} else {
  const { rows } = readCsv(UNICLASS_CSV, "occ_key,uniclass_code,confidence");
  const sectionCovered = new Set();
  for (const { cells, lineNo } of rows) {
    const [occKey, uniCode, confStr] = cells;
    if (cells.length < 3) {
      fail(`uniclass.csv line ${lineNo}: expected 3 columns, got ${cells.length}`);
      continue;
    }
    if (!allOccKeys.has(occKey)) {
      fail(`uniclass.csv line ${lineNo}: occ_key "${occKey}" is not a known division or section`);
    } else if (allSectionKeys.has(occKey)) {
      sectionCovered.add(occKey);
    }
    if (!UNICLASS_CODE_RE.test(uniCode)) {
      fail(`uniclass.csv line ${lineNo}: uniclass_code "${uniCode}" must match ${UNICLASS_CODE_RE}`);
    }
    const conf = Number(confStr);
    if (!Number.isFinite(conf) || conf <= 0 || conf > 1) {
      fail(`uniclass.csv line ${lineNo}: confidence "${confStr}" must be a number in (0,1]`);
    }
  }
  for (const key of [...allSectionKeys].sort()) {
    if (!sectionCovered.has(key)) fail(`uniclass.csv: section "${key}" has no Uniclass row (every section needs >= 1)`);
  }
}

// ---- report ---------------------------------------------------------------
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

console.log("OCC division section counts:");
for (const d of [...divisions].sort((a, b) => a.file.localeCompare(b.file))) {
  const flag = d.count < MIN_SECTIONS_PER_DIVISION ? "  <-- under minimum" : "";
  console.log(`  ${d.division}  ${String(d.count).padStart(2)} sections${flag}`);
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
