---
created_at: 2026-07-02T19:12:57+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 0.25h
commit_hash: f955c38
category: Changed
depends_on:
---

# Fix latent type drifts unmasked by a fresh check-all rebuild (plggmatic build.ts + example app.ts)

## Overview

`scripts/check-all.sh` rebuilds every dist fresh, then type-checks — which unmasks **latent type drifts** that were hidden while each package type-checked against a STALE committed dep dist. Two such drifts currently turn check-all red, in packages untouched by the plgg-bundle dev-server work (684fde9); this ticket fixes both. They are the same class of bug `bb41c15` fixed in plgg-press (stale-dist masking).

**Drift 1 — plggmatic `build.ts` copyAssets missing `| Defect`.** `packages/plggmatic/src/Build/usecase/build.ts:122` annotates the `copyAssets` stage's error as `SsgError`, but `copyAssets` (plgg-server, migrated to `proc` in 211838) returns `PromisedResult<ReadonlyArray<SoftStr>, SsgError | Defect>` — `proc` structurally adds `Defect`. Too narrow → `tsc` fails at `build.ts:127` (TS2345) and declaration emit `DtsError`s. The pipeline's overall error already folds `SsgError | Defect | E` (`build.ts:79`), so widening the one stage annotation is a **no-behavior-change** fix. plggmatic (scaffolded in 213410 by copying plgg-press's pre-`bb41c15` pattern) inherited it. `write404` correctly stays `SsgError` (it is `tryCatch`-based, no `Defect`).

**Drift 2 — example `app.ts` raw-number opacity vs `Option<Float>`.** The opacity→`Float` refinement (ticket 013304) branded plgg-view's `Attribute.opacity` as `Option<Float>`, but `packages/example/src/app.ts` still passes raw `some(0)`/`some(1)` for the toast-motion opacity frames (lines 390/394/402/406) → TS2322 (`Some<number>` not assignable to `Option<Float>`). Fix: wrap each in the `Float` brand (`box("Float")(0)` / `box("Float")(1)`), matching how plgg-view's own specs construct opacity. No behavior change.

Both are pure type-annotation/construction corrections, no runtime change.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — the fix is a precise type-annotation widening, no `as`/`any`/`@ts-ignore`; it restores the machine-checkable error contract the strict flags depend on.
- `workaholic:implementation` / `policies/functional-programming.md` — the `proc` pipeline's `Defect` channel must be reflected in every stage annotation, not narrowed away.

Repo constraints: `.workaholic/constraints/quality.md` (tsc + tests green; check-all green).

## Key Files

- `packages/plggmatic/src/Build/usecase/build.ts` — line 122: the `copyAssets` stage return annotation `SsgError` → `SsgError | Defect`.
- `packages/example/src/app.ts` — lines 390/394/402/406: wrap the toast-motion opacity values in `box("Float")(…)`; add `box` to the `plgg` import.

## Related History

- [bb41c15](commit) — "Fix latent type drift in plgg-press build.ts: copyAssets stage missing `| Defect`" — the exact precedent to mirror.
- 213410 — scaffolded plggmatic by copying plgg-press's build.ts (before bb41c15's fix), inheriting the drift.
- The plgg-bundle dev-server commit (684fde9) surfaced this when its `check-all.sh` verification ran a fresh rebuild.

## Implementation Steps

1. plggmatic `build.ts`: widen the `copyAssets` stage callback's declared return error `SsgError` → `SsgError | Defect` (~line 120-122). Verify `cd packages/plggmatic && npx tsc --noEmit` exits 0.
2. example `app.ts`: add `box` to the `plgg` import; wrap the four toast opacity values `some(0)`/`some(1)` → `some(box("Float")(0))` / `some(box("Float")(1))`. Verify `cd packages/example && npx tsc --noEmit` exits 0.
3. `scripts/test-plggmatic.sh` + `scripts/coverage-plggmatic.sh` green ≥90%; `scripts/test-example.sh` green.
4. `scripts/check-all.sh` runs green end-to-end (the fresh-rebuild gate that exposed both drifts).

## Quality Gate

**Acceptance criteria:**
- `packages/plggmatic` `tsc --noEmit` exits 0; `npm run build` emits with no `DtsError`.
- All plggmatic specs pass; coverage ≥90%.
- `scripts/check-all.sh` is green (no longer red at plggmatic).
- No behavior change; no `as`/`any`/`@ts-ignore`.

**Verification method:** `scripts/test-plggmatic.sh` + `scripts/coverage-plggmatic.sh` green; `scripts/check-all.sh` exits 0.

**Gate:** plggmatic tsc/tests/coverage green, check-all green, one-line type widening only — before approval.

## Considerations

- **No behavior change** — this is purely reflecting `copyAssets`'s real error type in the stage annotation; the runtime pipeline is unchanged.
- **Scope**: only the `copyAssets` stage is wrong; `generateStatic` is already `SsgError | Defect` and `write404` is correctly `SsgError`. Do not widen `write404`.
- Ticket 041501 (strip dev from plggmatic) will touch this package; landing this fix first keeps that work on a green baseline.
