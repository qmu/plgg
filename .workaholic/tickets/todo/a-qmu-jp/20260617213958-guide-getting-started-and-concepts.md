---
created_at: 2026-06-17T21:39:58+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260617213957-guide-scaffold-and-container.md]
---

# Guide T2 — Getting started & core concepts

## Overview

Write the narrative on-ramp of the guide: installation, a monorepo/family
overview, and the **plgg ethos** that every package assumes. This is the
conceptual layer the per-package API tickets (T3–T7) link back to instead of
re-explaining `Option`/`Result`/`pipe`/`cast`/`proc`/`match` in each section.

## Key Files

- `packages/guide/getting-started.md`, `packages/guide/concepts/*` (new pages
  under the IA from T1).
- `packages/plgg/README.md` - the Quick Start and Module Categories are the
  source for the concepts pages.
- `.claude/skills/plgg-coding-style` + `standards:implementation` - the
  type-driven / Option-not-null / Result-not-throw / data-last principles to
  teach.
- `packages/example/` - the runnable program the "first app" section points to.

## Implementation Steps

1. **Getting started** — what plgg is ("Pipeline Utility" + the family built on
   it), install per package (standalone packages, `file:` dist model), and a
   first runnable snippet (a `cast` validation + a `proc` pipeline) taken from
   real `plgg` tests.
2. **Core concepts pages**, each short and example-driven:
   - *Tagged data (`Box`)* — the `Box<Tag, Content>` foundation everything builds on.
   - *Option, not null* — `Option`/`some`/`none`/`matchOption`/`getOr`/`fromNullable`.
   - *Result, not throw* — `Result`/`ok`/`err`/`matchResult`/`mapErr`; errors are
     **tagged data** (`InvalidError`/`Defect`/…), not `Error` subclasses.
   - *Validation with `cast`* — `cast` + `asX` casters + `forProp`/`refine`, with
     sibling error accumulation.
   - *Async with `proc`* — `proc` pipelines, the precise inferred error union,
     `Procedural`/`PromisedResult`.
   - *Exhaustive `match`* — pattern matching and the `X$` matchers.
   - *Data-last composition* — `pipe`/`flow` and the config-first/data-last idiom.
3. Cross-link each concept to its API reference page (T3/T4) and to the packages
   that rely on it.

## Considerations

- **Single source of truth for concepts.** T3–T7 must *link* here, not restate —
  keep the ethos defined once. (`packages/guide/concepts/`)
- **Samples from real code.** Pull snippets from `packages/plgg`'s specs/README
  so they stay correct; avoid invented APIs. The doc-conventions page (T1) fixes
  this rule.
- **Reflect the shipped error model.** Errors-as-data + `Defect` + precise `proc`
  inference is current — do not document the deleted `BaseError`/`Exception`.
  (`packages/plgg/src/Exceptionals/`)
- Design lens (`standards:design`): the on-ramp is the primary *reach* into the
  whole family — keep it modeless and progressively disclosed (concept → API).
