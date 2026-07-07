# OCC Governance

How Open Construction Codes (OCC) changes, who may change it, and the guarantees that make an OCC key safe to store forever.

## Guiding principle

**A code, once published, is a permanent contract with every dataset that stored it.** Downstream systems — budgets, cost histories, subcontracts, analytics — key on OCC codes and keep them for years. The stability of the identifiers is therefore the standard's most important property, ahead of any individual cataloguing preference. Governance protects that stability.

## The numbering model

**A key is a permanent identifier; it does not encode order.** A section key is `DD.NN` — a two-digit division and an **unbounded decimal** section number (min two digits: `00, 01, … 99, 100, …`, no maximum). Display order is carried separately, by the **position of a section in its division's list** — not by its number.

This separation is deliberate and is what makes the guarantees below cost-free:

- A new section takes the **next free number** and is placed in the list where it belongs. Its number never has to fall "between" two others, so there is **no gap to size and no ceiling to reach** — the standard grows without limit and without ever renumbering.
- Section numbers within a division are therefore *not* guaranteed to be contiguous or in display order. Consumers must sort by the published order (the list position / the `order` field in the machine-readable pack), never by parsing the key.
- `DD.00` is reserved as the division-general section. Level 3 (`DD.NN.NN`, same rule per level) is available for genuine sub-breakdown.

## Stability contract and pre-1.0 status

The never-renumber and never-reuse guarantees below bind from **v1.0**. Per semantic versioning, **`0.x` is explicitly pre-stable**: keys may still change before v1.0 (the v0.2.0 re-baseline to dense keys is the one such change, made while adoption is effectively zero). v1.0 is the promise that every published key is frozen forever.

## Stability rules

1. **Codes are never renumbered** (from v1.0). A published `DD.NN` (or future `DD.NN.NN`) key always means what it meant when it was published. Its meaning is never broadened or narrowed in a way that changes what already-tagged data represents.
2. **Codes are never reused.** A retired key is never reassigned to different work. Its number is spent permanently — even after deprecation, the number stays claimed.
3. **Retirement is by deprecation, not deletion.** When work is reclassified, split, or merged, the affected code is marked **deprecated** and carries a **`successor`** pointer to the code (or codes) that now represent that work. Deprecated codes remain in the tables so historical data continues to resolve; tools may hide them from new-entry pick-lists while still displaying them on existing records.
4. **New work is added, never inserted destructively.** Because a key does not encode order (see *The numbering model*), a newly recognized section simply takes the **next free number** in its division and is placed at its position in the list. Nothing moves, no gap is required, and no existing key changes. New top-level divisions, if ever needed, likewise take unused numbers and never displace an existing division.

## Versioning (semantic versioning)

OCC releases are versioned `MAJOR.MINOR.PATCH`:

- **MAJOR** — a structural recode: any change to the division set or to the meaning/placement of existing codes. Rare, disruptive, and undertaken only with a documented migration path (deprecations + successors) so no historical data is orphaned.
- **MINOR** — additive: new divisions or sections that do not change any existing code. Backward-compatible; safe to adopt without touching stored data.
- **PATCH** — corrections to titles, descriptions, translations, or crosswalk entries that do not change any key or its meaning.

## Change process

- **All changes are proposed and tracked as issues, and land as pull requests** against the public repository. Nothing changes by side channel.
- Every change to `divisions/*.json` must pass `scripts/validate.mjs` (the structural contract) in CI before merge.
- Substantive additions or reclassifications record their rationale in the pull request and are summarized in `CHANGELOG.md` on release.
- Deprecations must ship with their `successor` pointers in the same change that deprecates them.

## Stewardship

- **OCC is owned by its community of contributors**, under CC BY 4.0. Attribution — not copyright control — is the intended growth mechanism; open governance and broad adoption are the standard's durability, not gatekeeping.
- **CrewHelix is the first implementer of OCC, not its owner.** Implementers — CrewHelix among them — participate in governance on the same footing as any other contributor. No single implementer's product roadmap dictates the standard, and the standard carries no dependency on any implementer's software.
- Interop layers (ICMS rollups, Uniclass and other crosswalks) are governed alongside the divisions but never redistribute another party's proprietary tables; they reference external identifiers for interoperability only, with attribution, subject to counsel review before publication.

## Scope of this document

This file governs the **standard's content** (divisions, sections, crosswalks). It does not govern any implementer's product. Where an implementer's software needs behavior the standard does not define, that behavior belongs in the implementer's own repository, not here.
