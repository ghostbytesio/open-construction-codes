# Changelog

All notable changes to Open Construction Codes (OCC) are documented here.
OCC follows semantic versioning (see [GOVERNANCE.md](./GOVERNANCE.md)).

## 0.1.0 — initial content release

- 36 divisions (`01`–`36`) in construction-sequence order, spanning residential,
  commercial, heavy-civil, and industrial work.
- 376 level-2 sections (`DD.SS`), assigned in increments of five, each with a
  `DD.00` division-general and `DD.90` catch-all section.
- English (`en`) titles; language-neutral keys ready for translation via governance.
- Zero-dependency structural validator (`scripts/validate.mjs`) and a
  machine-readable bundle generator (`scripts/build-pack.mjs`).
- Level 3 (`DD.SS.TT`) is reserved and unused in this release.
