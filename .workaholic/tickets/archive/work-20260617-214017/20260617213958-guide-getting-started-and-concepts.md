---
created_at: 2026-06-17T21:39:58+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: ea31884
category: Changed
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

## Final Report

Development completed as planned. Authored `getting-started.md`, a
`concepts/index.md` that states the ethos and links out, and seven concept pages
(tagged-data, option, result, validation, async, match, composition). Every
snippet was verified against `packages/plgg` source and `.spec.ts` tests.

### Discovered Insights

- **Insight**: `plgg`'s `match` is **curried** — `match(value)(...cases)` — but
  `packages/plgg/README.md`'s "Pattern Matching with match" example shows the
  non-curried `match(r, [...], ...)` form, which no longer compiles against the
  shipped `MatchCont` interface.
  **Context**: The README is stale on this point. The guide follows the real
  code (per the T1 doc-conventions "samples from real code" rule). Fixing the
  README is a separate change and should get its own ticket — do not silently
  edit it from a guide ticket (ticket-first workflow).
- **Insight**: The concept pages are the single source of truth; T3–T7 must
  **link** here rather than restate Option/Result/cast/proc/match. The concept
  sub-pages live under the existing "Core concepts" sidebar node — an additive,
  ticket-driven IA fill, not a restructure.
- **Insight**: `Defect` is the only error a correct domain function never
  constructs itself — `proc` mints it when a step *throws* unexpectedly (a
  thrown `PlggError` keeps its identity). Documenting it as "the bottom" keeps
  the errors-as-values contract legible.
