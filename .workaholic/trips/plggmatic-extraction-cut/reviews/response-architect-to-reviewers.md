---
type: Review
trip: plggmatic-extraction-cut
kind: author-response
author: Architect
responds_to:
  - reviews/round-1-planner.md
  - reviews/round-1-constructor.md
revises: models/model-v1.md
supersedes_with: models/model-v2.md
---

# Author response — Architect to reviewers

- **Author:** Architect
- **Regarding:** `models/model-v1.md`
- **Outcome:** Accept both revision requests. No escalation. Superseded by `models/model-v2.md`.

Both reviewers requested revision on the same two points, and my own round-1
review (`reviews/round-1-architect.md`) had already reached the same conclusions,
so there is nothing to contest — I accept and revise.

## Accepted — 1. Package count: one, not two

**Accepted.** My v1 proposed two packages (`plgg-scheme` + `plgg-ui`); the
Constructor proposed one (`plgg-ui`). I concede on evidence I re-verified against
the code: `Component/usecase/themeToggle.ts` imports `Component/model/interaction`,
and `Component ↔ Form` is a real mutual cycle — so the theme surface plggpress
consumes is not cleanly severable without carving Component apart (surgery, not the
Constructor's verbatim `git mv`), and it buys nothing this trip needs. v2 adopts
**one `plgg-ui` package** and carries my two-surface concern forward as the
`plgg-ui/style` **subpath** (theme) vs. root barrel (runtime), with the future
clean split line recorded rather than taken now.

## Accepted — 2. `--pm` ownership: parameterized `Theme`, default stays in plgg-ui

**Accepted.** The convergence matches the resolution in my round-1 review: the
theme **mechanism** and the `--pm`/`vp-appearance`/monochrome **default** stay in
`plgg-ui/style` as a neutral `defaultTheme`; plggpress imports and passes it
explicitly and never imports plggmatic; plggmatic owns the `Theme` **contract +
brand + DSL** (canonical/documentary ownership + a typed override seam), not the
exclusive value home. v2 softens all "move the values out to plggmatic" framing to
this split, which is the only reading that keeps the dependency invariant
(plggpress ↛ plggmatic) while honoring D16 byte-stability.

## No escalation

Both points are resolved by convergence; no unresolved conflict remains for the
lead to adjudicate. The v1 analysis I keep unchanged (two-surface import map,
module classification, dependency-direction + vendor-boundary verification, the
192518 re-point, and the declined `plgg-view/style` base-token fold) was not
contested and carries into v2.
