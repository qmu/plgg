---
created_at: 2026-07-01T01:33:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 0.5h
commit_hash: 7e5f7e1
category: Changed
depends_on:
---

# Bounded unit-interval reals: CSS opacity `number` → `Float`

## Overview

CSS opacity is a `0..1` fraction — the JSDoc on the utility even says so — yet it
is typed as unbounded `number`. `Float` (`packages/plgg/src/Basics/Float.ts`) is
the precise hierarchy type for a bounded real. This is the smallest of the five
"by major definition" refinements (2 sites, confined to plgg-view) and a fully
self-contained cleanup: it has **no dependency** on the other tickets and can
land any time.

It is broken out as its own ticket — rather than folded into the sized-uint
ticket — because it is the *real* (non-integer) member of the number axis: a
distinct major definition (`Float`, not `U16`/`U32`/`Int`), so it earns its own
slice under the chosen "ticket by major definition" structure.

## Scope (this ticket)

In scope: CSS opacity fields/params typed `number` → `Float`, in plgg-view only.

Out of scope: integral/sized numeric quantities (the `Int` and sized-uint
tickets); CSS spacing half-steps and other fractional values the sweep flagged
as **not** unit-interval.

## Key Files

- `packages/plgg-view/src/Html/model/Attribute.ts:19` — `opacity: Option<number>`
  → `Float` (keep the `Option` wrapper: `Option<Float>`).
- `packages/plgg-view/src/Style/usecase/utilities.ts:162` — `opacity(n: number):
  Styles` → `Float` param (the JSDoc already documents the `0..1` range).

## Implementation Steps

1. Change the `opacity` field/param to `Float` (`Option<Float>` where optional).
2. Construct via `asFloat` at the call boundary (where a caller supplies the
   numeric opacity); the existing `0..1` JSDoc becomes an enforced brand.
3. `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green.
4. Add a spec proving the `Float` opacity path **rejects** an out-of-interval
   value (e.g. `1.5` or `-0.2`) that the prior `number` field accepted.

## Considerations

- **Confirm `Float`'s semantics.** Verify what `Float` actually constrains in
  `packages/plgg/src/Basics/Float.ts` — if it brands "is a real number" but does
  **not** itself clamp to `0..1`, decide whether opacity needs the interval bound
  enforced in the constructor or whether `Float` alone is the intended precision
  for this pass. Don't claim a tighter guarantee than the brand provides.
- **Keep `Option`** — opacity is genuinely optional on `Attribute`; model
  `Option<Float>`, not a defaulted `Float`.
- **No escape hatches:** construct via `asFloat`; never `as`/`any`/`ts-ignore`.
- Tooling: `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh`; Prettier 50.

## Quality Gate

The `/drive` approval gate requires **all** of:

1. **tsc + tests green:** `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh`
   passing, >90% coverage thresholds intact.
2. **No new escape hatches:** zero `as`/`any`/`ts-ignore`; opacity bridges via
   `asFloat`/`isFloat`.
3. **Boundary actually tightened:** a spec shows the `Float` opacity path rejects
   (or, if `Float` is unbounded, that the documented `0..1` invariant is now
   enforced where it previously was only a comment) a value the prior `number`
   accepted.
4. **Loose-type count drops:** both opacity sites are no longer bare `number`.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — refine to the
  precise numeric brand; no `as`/`any`/`ts-ignore`; Option over defaulting.
- `workaholic:implementation` / `policies/type-driven-design.md` — turn the
  documented `0..1` invariant into a checkable type boundary.
- `workaholic:implementation` / `policies/directory-structure.md` — changes stay
  in plgg-view's existing `model/` + `usecase/` role files.

## Final Report

Refined CSS opacity from bare `number` to `Float` in plgg-view: `Attribute.Frame.opacity` and the `frame()` param → `Option<Float>`; the `opacity()` style utility → `Float` param (stringified via `.content`). `render.ts` `frameToKeyframe` unwraps the `Float` back to a `number` for the WAAPI keyframe. Internal animation presets (`fadeIn`/`fadeOut`/`slideIn`) construct their compile-time-constant `0`/`1` opacities via `box("Float")(…)` (the sanctioned Box constructor — not an escape hatch — for statically-valid literals). Updated the two fixture specs (`Attribute.spec`, `render.spec`) to build `Float` opacities.

**Float is finite-only, not `0..1`.** Per the ticket's Consideration, I did not claim a tighter guarantee than the brand provides: `Float` brands "finite number" (`packages/plgg/src/Basics/Float.ts`), so the enforced tightening is rejection of non-finite values (`NaN`/`Infinity`) that the prior `number` field silently accepted. The `0..1` range remains documented in JSDoc, not type-enforced (a true unit-interval brand would be separate, out of scope).

Verification: `scripts/test-plgg-view.sh` 128 passed (+1: `"opacity boundary rejects non-finite"` asserts `asFloat(0.5)` ok, `asFloat(Infinity)`/`asFloat(NaN)` not ok). No `as`/`any`/`ts-ignore`. Contained entirely to plgg-view (no external consumers of `Frame`/`opacity`).
