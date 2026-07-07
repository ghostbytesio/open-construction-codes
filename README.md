# Open Construction Codes (OCC)

**An open cost-classification standard for construction — divisions and priced-work sections that describe how contractors budget, buy out, and subcontract work.**

- **Version:** 0.2.0
- **License:** [CC BY 4.0](./LICENSE) — free to use, share, and adapt with attribution.
- **Status:** Draft standard (`0.x` is pre-stable — see [Stability](#stability-and-how-the-numbers-work)). Level-2 depth (divisions + sections); Level 3 is reserved and unused in this release.

### **[📖 Browse all codes → CODES.md](./CODES.md)**

A generated, searchable list of every division and section. Use your browser's find (Ctrl/⌘-F) to look up a code or trade.

## What OCC is

OCC is a **work-result / trade** classification: its divisions and sections mirror the way construction work is actually bought and priced — the granularity at which a job gets a budget line or a subcontract, not the granularity of individual products. It is deliberately language-neutral at the key level and internationalized at the title level, so the same code carries a US general contractor's, a UK quantity surveyor's, and a heavy-civil estimator's meaning.

Coverage spans **residential, commercial, heavy-civil, and industrial** work. Element and lifecycle rollups and crosswalks to other schemes are published as separate interop layers alongside the source tables rather than inside the divisions themselves.

OCC is an **original work, authored from first principles** in plain trade language. It is not derived from any other classification. See [Authorship & independence](#authorship--independence).

## Key format — `DD.NN`

Every section is identified by a **two-digit division, a dot, and a section number**:

```
05.03
│  └── section
└───── division
```

- **`DD`** — division (`01`–`36` today).
- **`NN`** — section within the division: an **unbounded decimal integer**, written with a minimum of two digits (`00, 01, …, 09, 10, …, 99, 100, 101, …`). There is **no maximum** — a division can hold as many sections as the work requires.
- **`DD.00`** — the division-general section (work belonging to the division but no specific section: mobilization, general requirements, coordination for that trade).
- **Level 3** is reserved as `DD.NN.NN` (same rule per level) for genuine sub-breakdown, and is unused in v0.2.

### Example (division 05, Concrete)

```json
{
  "division": "05",
  "title": { "en": "Concrete" },
  "sections": [
    { "key": "05.00", "title": { "en": "Concrete — general" } },
    { "key": "05.01", "title": { "en": "Formwork and falsework" } },
    { "key": "05.03", "title": { "en": "Cast-in-place structural concrete" } }
  ]
}
```

## Stability and how the numbers work

A **key is a permanent identifier — it does not encode order.** This is the most important thing to understand about OCC, and what makes it safe to store a code forever:

- **Display order is the position of a section in its division's list**, not its number. To place new work anywhere in the sequence, it is spliced into the list where it belongs and takes the next free number — whatever that number is. So a code's number never has to "fall between" its neighbours, which means **there is never a gap to run out of and never a reason to renumber.**
- **Codes are never renumbered and never reused** (from v1.0 — see [GOVERNANCE.md](./GOVERNANCE.md)). A retired code is marked deprecated in place with a `successor` pointer; its number is spent permanently.
- Because the number carries no ranking, you will see keys that are not in strict numeric order within a division — that is intentional. The order to read is the order they are listed (and shown in [CODES.md](./CODES.md)).

## Titles and internationalization (i18n)

Each section (and each division) carries a **title map keyed by language code**. English (`en`) ships in v0.2; other languages are added through governance. Where UK and US trades diverge in everyday vocabulary, the English title carries **both terms** — e.g. *"Drywall / plasterboard partitions"*, *"Rebar / reinforcement steel"* — so the same code is unambiguous on either side of the Atlantic.

## Repository layout

```
open-construction-codes/
├── divisions/DD.json       # source of truth — one file per division, 01.json … 36.json
├── CODES.md                # generated human-readable catalog of every code
├── exports/occ-pack.json   # generated machine-readable bundle (with display order + content hash)
├── scripts/validate.mjs    # structural validator (run in CI)
├── scripts/build-catalog.mjs  # regenerates CODES.md from divisions/
├── scripts/build-pack.mjs  # regenerates exports/occ-pack.json from divisions/
├── VERSION                 # single source of the version string
├── LICENSE                 # CC BY 4.0
├── GOVERNANCE.md           # how OCC changes, and the never-renumber rule
└── README.md               # this file
```

`CODES.md` and `exports/occ-pack.json` are **generated** — do not hand-edit them; regenerate with the scripts above. Interop layers (rollups to reporting standards, crosswalks to other schemes) are published separately, once each has been verified, so the core standard here stays a self-contained, fully-vetted source of truth.

## Validation

`scripts/validate.mjs` is a zero-dependency Node ESM script — the acceptance test for the content, run in CI:

```
node scripts/validate.mjs
```

It checks: filenames match their `division`; every key is well-formed (`DD.NN`, each part ≥ 2 digits) and prefixed by its division; keys are **globally unique across the entire set including deprecated entries** (the never-reuse guarantee); every division has its `DD.00` and at least one more section; deprecated entries carry a `successor` that resolves to a real key; every title is a nonempty `en` string ≤ 80 chars; and the committed `CODES.md` matches a fresh render of the source. It imposes **no** banding, per-division cap, total floor, or ascending-order requirement — keys are deliberately free of those constraints.

## Governance and stewardship

OCC is owned by its community of contributors under CC BY 4.0; attribution, open governance, and broad adoption — not gatekeeping — are how it stays durable. Implementers participate in governance on the same footing as any other contributor, and the standard carries no dependency on any implementer's software. See [GOVERNANCE.md](./GOVERNANCE.md) for the change process and the stability guarantees.

## Authorship & independence

OCC is authored from first principles in plain trade language, in its own arrangement. It reproduces no other scheme's numbering, titles, or arrangement, and no proprietary classification's identifiers appear anywhere in this repository.

Some section titles use short (two- or three-word) **generic trade terms** — *"unit masonry", "structural steel", "curtain wall", "site clearance"* — that are the ordinary names of the work and appear across the industry's schemes, glossaries, and contracts. Such overlap on the common vocabulary of the trade is unavoidable and does not make OCC derivative of any other work.

## Contributing

Changes are proposed as issues and land as pull requests against this repository; every change to `divisions/*.json` must pass `scripts/validate.mjs` in CI before merge. See [GOVERNANCE.md](./GOVERNANCE.md).

## License

Open Construction Codes (OCC) — © OCC contributors, CC BY 4.0. See [LICENSE](./LICENSE).
