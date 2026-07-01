---
created_at: 2026-07-01T21:18:38+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Collapse hand-rolled `.then`/`isOk` async-`Result` ladders onto `proc`/`chainResult`

## Overview

`proc` is the foundation's async-`Result` composition combinator, but several domains that do real async-`Result` work **bypass it** and hand-roll `promise.then((res) => isOk(res) ? next : res)` fail-fast ladders instead. This is the exact "unsophisticated, repeating pattern" the foundation-semantics audit targets: `proc(seed, step1, step2, …)` (or `pipe(..., chainResult(...))`) already expresses "run steps in sequence, short-circuit on `Err`, thread the success value" — the ladders re-implement it by hand, one `isOk` branch at a time.

Canonical repro (`plgg-db-migration/src/domain/usecase/applyMigration.ts:34`, `runThenRecord`):

```ts
runScript(db)(script).then((scriptRes) =>
  isOk(scriptRes)
    ? exec(db)(record).then((recordRes) =>
        isOk(recordRes) ? ok(undefined) : recordRes)
    : scriptRes);
```

is a two-step fail-fast async-`Result` chain — i.e. `proc(script, () => runScript(db)(script), () => exec(db)(record), () => ok(undefined))`-shaped work. Across the repo the ladder recurs in **three packages** (measured, coverage/specs excluded): all `.then` + `isOk` with **zero** `proc`/`chainResult`.

**Scope decision (author-confirmed):** *All verified sites, one ticket.* Strictly adopt the **existing** `proc`/`chainResult` combinators — behavior-identical, no new foundation primitive. Any observation that `proc` needs a lighter/more-discoverable sibling for the common 2-step case is **noted for a separate design ticket, not built here** (that ergonomics question also sits in the audit ticket's considerations).

Why this drifted (context, from history): `proc`'s error-union inference was only made reliable on **2026-06-17** ([20260617081221-proc-error-union-and-collapse.md]) — its stated goal was "collapse bespoke async flows onto a core primitive." Code written before/around that used `.then`/`isOk` as the safe choice and was never migrated back. This ticket finishes that migration for the sites that were missed.

**Trip Origin:** none — spun off from the foundation-semantics audit ([20260701201654-audit-foundation-semantics-repetition.md](.workaholic/tickets/archive/work-20260701-185044/20260701201654-audit-foundation-semantics-repetition.md)) and the `proc`-usage analysis in its drive session.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — the refactor must stay escape-hatch-free (no `as`/`any`/`@ts-ignore`); `proc`'s inferred error union replaces the manual `isOk` narrowing.
- `workaholic:implementation` / `policies/functional-programming.md` — the whole point: replace imperative `.then`/`isOk` statements with declarative, signature-preserving composition (`proc`/`chainResult`); behavior predictable from the pipeline shape.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — these are domain usecases; keeping them composed through the shared `proc` vocabulary (not bespoke plumbing) is what makes them read as domain logic.
- `workaholic:implementation` / `policies/objective-documentation.md` — each migrated function keeps its "why" JSDoc; the behavior (fail-fast, error propagation) must be provably identical.
- `plgg-coding-style` (skill) — `proc` for async, `pipe`+`chainResult` where a seed threads sync/async `Result` steps; Prettier printWidth 50; colocated specs stay green.
- `.workaholic/constraints/quality.md` — strict flags, ≥90% coverage, `tsc-plgg.sh` + `test-plgg.sh` green.

## Key Files

Verified ladder sites (measured `.then` / `isOk`, `proc`+`chainResult`=0):

- `packages/plgg-db-migration/src/domain/usecase/migrateTenant.ts` — 10 `.then` / 9 `isOk` (densest).
- `packages/plgg-db-migration/src/domain/usecase/migrateUp.ts` — 4 / 4.
- `packages/plgg-db-migration/src/domain/usecase/migrateDown.ts` — 4 / 4.
- `packages/plgg-db-migration/src/domain/usecase/applyMigration.ts` — 2 / 2 (`runThenRecord`, the canonical repro).
- `packages/plgg-db-migration/src/domain/usecase/status.ts` — 2 / 2.
- `packages/plgg-db-migration/src/domain/usecase/listApplied.ts` — 1 / 2.
- `packages/plgg-db-migration/src/entrypoints/cli.ts` — 1 / 5 (entrypoint; migrate only the composition, not boundary wiring).
- `packages/plgg-server/src/Ssg/usecase/writeStatic.ts` — 12 / 5.
- `packages/plgg-server/src/Routing/usecase/toFetch.ts` — 2 / 2.
- `packages/plgg-sql/src/Db/usecase/transaction.ts` — 3 / 1 (commit-or-rollback branch; also cited by the audit as a rare manual-`isOk` site).

Foundation combinators the migration targets (do not modify — just consume):

- `packages/plgg/src/Flowables/proc.ts` — variadic async-`Result` composition (2–19 steps); `UnwrapProcedural`/`ProcErr` recover success + error types.
- `packages/plgg/src/Disjunctives/Result.ts` — `chainResult`/`mapResult`/`matchResult` for the `pipe`-based cases.

## Related History

- [20260617081221-proc-error-union-and-collapse.md](.workaholic/tickets/archive/work-20260617-002003/20260617081221-proc-error-union-and-collapse.md) — made `proc`'s error-union inference reliable and collapsed SSG/HTTP flows onto it; this ticket applies the same collapse to the sites that were missed.
- [20260617081220-errors-as-data-migration.md](.workaholic/tickets/archive/work-20260617-002003/20260617081220-errors-as-data-migration.md) — the errors-as-data model these `Result` chains carry.
- [20260525205926-match-type-completeness-gap-analysis.md](.workaholic/tickets/archive/work-20260513-182057/20260525205926-match-type-completeness-gap-analysis.md) — sibling combinator gap-analysis whose method this follows.

## Implementation Steps

1. Start with the canonical repro: rewrite `applyMigration.ts` `runThenRecord` as a `proc`/`chainResult` composition, confirming the fail-fast semantics (record runs only on script success; first `Err` propagates) are byte-identical. Keep `applyMigration.spec.ts` green with no assertion changes.
2. Migrate the remaining `plgg-db-migration` usecases (migrateTenant, migrateUp, migrateDown, status, listApplied) and the composition portions of `entrypoints/cli.ts`. Leave genuine boundary/adapter async (e.g. `testkit/sqliteDb.ts` driver methods) alone — those are edges, not compositions.
3. Migrate `plgg-server` `writeStatic.ts` and `toFetch.ts`, and `plgg-sql` `transaction.ts` (the commit-or-rollback branch).
4. After each package, run `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`; rebuild dependents (db-migration depends on plgg-sql) before its tests.
5. Sweep once more for any residual `.then((x) => isOk(x) ? … : x)` shape introduced/missed; the acceptance target is **zero** hand-rolled async-`Result` ladders in domain/usecase code.
6. In the ticket's Final Report, record the one-line observation on whether a lighter 2-step `proc` sibling is worth a separate design ticket (do not build it).

## Quality Gate

**Acceptance criteria:**
- Every listed site's hand-rolled `.then`/`isOk` async-`Result` ladder is replaced by `proc` or `pipe`+`chainResult`; boundary/adapter async (driver methods, entrypoint wiring) is intentionally left as-is and noted.
- Behavior is provably identical: fail-fast ordering, error propagation, and return values unchanged — every existing spec passes **without assertion edits** (import/shape-only edits allowed).
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error`; the manual `isOk` narrowing is gone, replaced by `proc`'s inferred error union.
- Net reduction in manual `isOk` branches across the migrated files (measure before/after).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green with coverage ≥90% (statements/branches/functions/lines).
- Existing per-usecase specs (`applyMigration.spec.ts`, `migrateUp/Down.spec.ts`, `writeStatic.spec.ts`, `transaction.spec.ts`, …) stay green as the behavior oracle.
- `grep -rE '\.then\(.*isOk|isOk\(.*\?' packages/plgg-db-migration/src/domain packages/plgg-server/src packages/plgg-sql/src/Db/usecase` returns no async-`Result` ladder after migration.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, all listed sites migrated with specs green and no assertion changes, and the ladder-grep clean.

## Considerations

- **Edges are not compositions.** `plgg-db-migration/src/testkit/sqliteDb.ts` and other driver adapters legitimately use raw `async`/`.then` to implement a Promise-returning interface — do **not** force `proc` there (`packages/plgg-db-migration/src/testkit/sqliteDb.ts`).
- **`transaction.ts` is subtle.** Its commit/rollback decision on `isOk(result)` is control flow with side effects on both branches; ensure the `proc`/`matchResult` rewrite preserves rollback-on-`Err` exactly (`packages/plgg-sql/src/Db/usecase/transaction.ts`).
- **`proc` vs `chainResult`.** Use `proc` when a seed threads through async steps; use `pipe(..., chainResult(...))` when the flow is already a `pipe` and only needs `Result`-aware chaining. Don't force everything into `proc` if `chainResult` reads better at a given site.
- **Ergonomics signal, deferred.** If the 2-step case feels heavier than the `.then` it replaces, that is evidence for a lighter `proc` sibling — record it for a separate design ticket rather than blocking this refactor.
- Sibling to the four audit-spawned foundation tickets (`20260701204204`-`204207`); this one is consumer-side adoption, not a foundation addition, so it has no `depends_on` on them.
