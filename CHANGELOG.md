# Changelog

All notable changes to Open Construction Codes (OCC) are documented here.
OCC follows semantic versioning (see [GOVERNANCE.md](./GOVERNANCE.md)). Per semver,
`0.x` is pre-stable; the never-renumber / never-reuse contract binds from v1.0.

## 0.2.0 — numbering model

- **Keys are now permanent identifiers decoupled from display order.** Display
  order is a section's position in its division's list, not its number.
- **Section numbers are unbounded decimal** (`DD.NN`, min two digits, no maximum) —
  a division can hold as many sections as the work requires. Level 3 (`DD.NN.NN`)
  reserved for sub-breakdown.
- **One-time re-baseline** of every section to dense keys (`DD.00, DD.01, …`) in
  display order — the last assignment-by-position. From here, new sections take
  the next free number and are placed by list position.
- **Removed** the increment-of-5 banding, the required `.90` "other" slot, the
  6–12-sections-per-division cap, the ≥280-total floor, and the ascending-keys rule.
- Added a generated, searchable **`CODES.md`** catalog (with a validator drift check)
  and an explicit **display `order`** in the machine-readable pack.

## 0.1.0 — initial content release

- 36 divisions (`01`–`36`) in construction-sequence order, spanning residential,
  commercial, heavy-civil, and industrial work; 376 level-2 sections.
- English (`en`) titles; language-neutral keys ready for translation via governance.
- Zero-dependency structural validator and a machine-readable bundle generator.
