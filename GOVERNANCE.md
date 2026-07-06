# OCC Governance

How Open Construction Codes (OCC) changes, who may change it, and the guarantees that make an OCC key safe to store forever.

## Guiding principle

**A code, once published, is a permanent contract with every dataset that stored it.** Downstream systems — budgets, cost histories, subcontracts, analytics — key on OCC codes and keep them for years. The stability of the identifiers is therefore the standard's most important property, ahead of any individual cataloguing preference. Governance protects that stability.

## Stability rules

1. **Codes are never renumbered.** A published `DD.SS` (or future `DD.SS.TT`) key always means what it meant when it was published. Its meaning is never broadened or narrowed in a way that changes what already-tagged data represents.
2. **Codes are never reused.** A retired key is never reassigned to different work. Its number is spent permanently.
3. **Retirement is by deprecation, not deletion.** When work is reclassified, split, or merged, the affected code is marked **deprecated** and carries a **`successor`** pointer to the code (or codes) that now represent that work. Deprecated codes remain in the tables so historical data continues to resolve; tools may hide them from new-entry pick-lists while still displaying them on existing records.
4. **New work is added, not inserted destructively.** Sections are assigned in increments of five (`.05 .10 .15 …`) precisely so that a newly recognized kind of work can take an unused key between two existing ones without disturbing either. Divisions `01`–`36` are the v1 spine; new top-level divisions, if ever needed, take unused numbers and never displace an existing division.

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
