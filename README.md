# Open Construction Codes (OCC)

**An open cost-classification standard for construction — divisions and priced-work sections that describe how contractors budget, buy out, and subcontract work.**

- **Version:** 0.1 (initial content release)
- **License:** [CC BY 4.0](./LICENSE) — free to use, share, and adapt with attribution.
- **Status:** Draft standard. Level-2 depth (divisions + sections). Level 3 is reserved and absent in v0.1.

## What OCC is

OCC is a **work-result / trade** classification: its divisions and sections mirror the way construction work is actually bought and priced — the granularity at which a job gets a budget line or a subcontract, not the granularity of individual products. It is deliberately language-neutral at the key level and internationalized at the title level, so the same code carries a US general contractor's, a UK quantity surveyor's, and a heavy-civil estimator's meaning.

Coverage spans **residential, commercial, heavy-civil, and industrial** work. Element and lifecycle rollups and crosswalks to other schemes are published as separate interop layers alongside the source tables rather than inside the divisions themselves.

OCC is an **original work, authored from first principles** in plain trade language and arranged in construction-sequence order. It is not derived from any other classification. See [Authorship & independence](#authorship--independence) below.

## Key format — `DD.SS`

Every section is identified by a **two-digit division, a dot, and a two-digit section**:

```
05.30
│  └── section  (level 2)
└───── division (level 1)
```

- **`DD`** — division, `01`–`36`, zero-padded.
- **`SS`** — section within the division, zero-padded, assigned in **increments of 5** (`.05 .10 .15 …`) so new sections can be inserted between existing ones without renumbering.
- **`DD.00`** — the division-general section (work that belongs to the division but not to any one section: mobilization, general requirements, coordination for that trade).
- **`DD.90`** — the "other / miscellaneous" catch-all for that division.
- **Level 3** is reserved as `DD.SS.TT` and is **not** used in v0.1.

Keys are zero-padded so that **lexicographic order equals numeric order**, contain no internal whitespace, and are visibly distinct from other schemes' formats (e.g. space-delimited numeric codes or `Ss_25_10`-style identifiers).

### Example (excerpt of division 05, Concrete)

```json
{
  "division": "05",
  "title": { "en": "Concrete" },
  "sections": [
    { "key": "05.00", "title": { "en": "Concrete — general" } },
    { "key": "05.10", "title": { "en": "Formwork and falsework" } },
    { "key": "05.30", "title": { "en": "Cast-in-place structural concrete" } },
    { "key": "05.90", "title": { "en": "Other concrete work" } }
  ]
}
```

## Titles and internationalization (i18n)

Each section (and each division) carries a **title map keyed by language code**. English (`en`) ships in v0.1; other languages are added through governance:

```json
"title": { "en": "Drywall / plasterboard partitions" }
```

Where UK and US trades diverge in their everyday vocabulary, the English title carries **both terms** so the same code is unambiguous on either side of the Atlantic — e.g. *"Drywall / plasterboard partitions"*, *"Skirting / baseboard and trim"*, *"Rebar / reinforcement steel"*.

## Repository layout

```
open-construction-codes/
├── divisions/DD.json      # source of truth — one file per division, 01.json … 36.json
├── exports/occ-pack.json  # generated machine-readable bundle (rebuild via scripts/build-pack.mjs)
├── scripts/validate.mjs   # structural validator (run in CI; see below)
├── scripts/build-pack.mjs # regenerates exports/occ-pack.json from divisions/
├── LICENSE                # CC BY 4.0 + attribution line
├── GOVERNANCE.md          # how OCC changes, and the never-renumber rule
└── README.md              # this file
```

Interop layers (rollups to reporting standards and crosswalks to other schemes) are published separately, once each has been verified, so the core standard here stays a self-contained, fully-vetted source of truth.

Each `divisions/DD.json` is the **source of truth**. The filename base must equal the file's `division` value (`05.json` → `"division": "05"`).

## Validation

`scripts/validate.mjs` is a zero-dependency Node ESM script that enforces the structural contract every division file must satisfy. It is the acceptance test for the content in this repository and runs in CI:

```
node scripts/validate.mjs
```

It checks: filenames match their `division`; divisions cover exactly `01`–`36`; every section key matches `^\d{2}\.\d{2}$` with a prefix equal to its division; keys are globally unique and strictly ascending within a division; every division has both `DD.00` and `DD.90`; every division has at least 6 sections and the grand total is at least 280; every title is a nonempty `en` string of at most 80 characters. It prints per-division counts and the grand total, and exits non-zero listing every violation.

## Governance and stewardship

OCC is owned by its community of contributors under CC BY 4.0; attribution, open governance, and broad adoption — not gatekeeping — are how it stays durable. Implementers participate in governance on the same footing as any other contributor, and the standard carries no dependency on any implementer's software. See [GOVERNANCE.md](./GOVERNANCE.md) for the change process and the stability guarantees (codes are never renumbered or reused).

## Authorship & independence

OCC is authored from first principles in plain trade language, in its own construction-sequence arrangement. It reproduces no other scheme's numbering, titles, or arrangement, and no proprietary classification's identifiers appear anywhere in this repository.

Some section titles use short (two- or three-word) **generic trade terms** — *"unit masonry", "structural steel", "curtain wall", "site clearance"* — that are the ordinary names of the work and appear across the industry's schemes, glossaries, and contracts. Such overlap on the common vocabulary of the trade is unavoidable and does not make OCC derivative of any other work.

## Contributing

Changes are proposed as issues and land as pull requests against this repository; every change to `divisions/*.json` must pass `scripts/validate.mjs` in CI before merge. See [GOVERNANCE.md](./GOVERNANCE.md).

## License

Open Construction Codes (OCC) — © OCC contributors, CC BY 4.0. See [LICENSE](./LICENSE).
