#!/usr/bin/env node
// OCC scheme-pack builder — zero-dependency Node ESM.
//
// Reads divisions/*.json (the validated OCC content — see validate.mjs for
// the structural contract this depends on: 36 divisions "01".."36", each
// with >= 1 section, every key globally unique) and emits
// exports/occ-pack.json: the "occ" SchemePack, the spine every other scheme
// (Uniclass, ICMS, a customer's own external codes) crosswalks onto.
//
// codes = one row per division (`key` = "05", `parent_key` = null) plus one
// row per section (`key` = "05.10", `parent_key` = "05"), title taken from
// each file's `title.en` (v0.1 pack codes carry titles only — a few sections
// in divisions/*.json also carry an optional `description` field, added in a
// later content review; build-pack.mjs deliberately ignores `description` for
// v0.1 pack codes, titles only. If/when the pack format grows a description
// field, wire it here and bump version_label).
//
// The occ pack carries NO `crosswalk_to_occ` — occ IS the spine other
// schemes crosswalk onto, so a crosswalk-to-itself is meaningless (and
// `SchemePack::validate` on the Rust side rejects an occ pack that has one).
// The Uniclass/ICMS crosswalk CSVs under crosswalks/ stay repo files, read by
// a separate (later) pipeline that builds THEIR scheme packs — they are not
// occ-pack content.
//
// Every code also carries an `order` — a single 0-based GLOBAL display rank
// across the whole pack, in display order (each division immediately followed
// by its sections): 01 -> 0, 01.00 -> 1, 01.01 -> 2, …, 02 -> next, and so on.
// This is the DISPLAY order, decoupled from the key (a key is a stable
// identifier that does NOT encode sequence — see GOVERNANCE.md). A consumer
// renders the catalog by simply sorting on `order`, so display stays correct
// even when a future section's key is out of key-order.
//
// content_hash canonicalization (MUST match `SchemePack::parse`'s
// re-verification in
// api/crates/cm-domain/src/models/construction/scheme_pack.rs byte for
// byte — this is the cross-language-stable recipe, chosen over a plain
// `JSON.stringify(codes)` specifically to sidestep any Node/Rust JSON
// serialization divergence, e.g. object-key ordering or float/escape
// formatting):
//   1. Sort `codes` by `key` (ascending, plain string compare).
//   2. For each code, in that sorted order, build the plain-text line:
//        `${key}|${parent_key ?? ""}|${title.en}|${deprecated}|${successor ?? ""}|${order}`
//      (`deprecated` rendered as the literal string "true"/"false"; `order` as
//      its base-10 integer. A pack built by this script never has
//      `deprecated`/`successor` set, so those are "false"/"" here — the format
//      still carries them so a later hand-authored or edited pack, e.g. a
//      scheme's next version marking retired codes, hashes the same way.
//      `order` IS included so re-ordering display is a detectable content
//      change → new hash → patch release.)
//   3. Join those lines with "\n" (no trailing newline).
//   4. sha256, hex-encoded (lowercase) digest of that UTF-8 string.
// This DEVIATES from an earlier sketch of hashing `JSON.stringify(codes)` —
// the delimited-line form is what both this script and scheme_pack.rs
// actually implement.
//
// Usage: node scripts/build-pack.mjs   (run from anywhere; paths resolve
// relative to this file). Writes exports/occ-pack.json and exits 0, or
// prints a fatal error and exits 1.

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIVISIONS_DIR = resolve(HERE, "..", "divisions");
const EXPORTS_DIR = resolve(HERE, "..", "exports");
const OUT_PATH = join(EXPORTS_DIR, "occ-pack.json");

const SCHEME = "occ";
const VERSION_LABEL = readFileSync(resolve(HERE, "..", "VERSION"), "utf8").trim();

function fatal(msg) {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

// ---- load every divisions/*.json -------------------------------------------
let files;
try {
  files = readdirSync(DIVISIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
} catch (err) {
  fatal(`cannot read ${DIVISIONS_DIR}: ${err.message}`);
}
if (files.length === 0) {
  fatal(`no division files found in ${DIVISIONS_DIR}`);
}

// codes: division rows first (in file order, i.e. "01".."36"), then every
// section row nested under its division (in-file order) — final content_hash
// canonicalization re-sorts by key regardless, so this build-order is just
// for a stable, readable JSON file; it is not the hash's sort.
const codes = [];
let order = 0; // single global display rank, incremented for every code in display order
for (const file of files) {
  const path = join(DIVISIONS_DIR, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fatal(`${file}: not valid JSON (${err.message})`);
  }

  const divisionKey = data.division;
  const divisionTitleEn = data?.title?.en;
  if (typeof divisionKey !== "string" || typeof divisionTitleEn !== "string" || !divisionTitleEn) {
    fatal(`${file}: missing "division" or "title.en"`);
  }

  codes.push({
    key: divisionKey,
    parent_key: null,
    title: { en: divisionTitleEn },
    deprecated: false,
    successor: null,
    order: order++,
  });

  const sections = Array.isArray(data.sections) ? data.sections : [];
  for (const s of sections) {
    const sectionTitleEn = s?.title?.en;
    if (typeof s?.key !== "string" || typeof sectionTitleEn !== "string" || !sectionTitleEn) {
      fatal(`${file}: section ${JSON.stringify(s?.key)} missing "key" or "title.en"`);
    }
    codes.push({
      key: s.key,
      parent_key: divisionKey,
      title: { en: sectionTitleEn },
      deprecated: false,
      successor: null,
      // order = global DISPLAY rank (see module doc). Decoupled from the key.
      order: order++,
      // s.description is deliberately NOT carried onto the pack code.
    });
  }
}

// ---- content_hash: see the module-doc recipe above -------------------------
function contentHash(codeRows) {
  const sorted = [...codeRows].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const lines = sorted.map((c) => {
    const parent = c.parent_key ?? "";
    const titleEn = c.title.en;
    const deprecated = c.deprecated ? "true" : "false";
    const successor = c.successor ?? "";
    return `${c.key}|${parent}|${titleEn}|${deprecated}|${successor}|${c.order}`;
  });
  const canonical = lines.join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

const pack = {
  scheme: SCHEME,
  version_label: VERSION_LABEL,
  content_hash: contentHash(codes),
  codes,
  crosswalk_to_occ: null, // occ IS the spine — see module doc.
};

mkdirSync(EXPORTS_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(pack, null, 2) + "\n", "utf8");

const divisionCount = codes.filter((c) => c.parent_key === null).length;
const sectionCount = codes.length - divisionCount;
console.log(`Wrote ${OUT_PATH}`);
console.log(`  scheme=${pack.scheme} version_label=${pack.version_label}`);
console.log(`  ${divisionCount} divisions + ${sectionCount} sections = ${codes.length} codes`);
console.log(`  content_hash=${pack.content_hash}`);
process.exit(0);
