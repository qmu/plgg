---
created_at: 2026-06-27T21:01:45+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on:
---

# Add a trusted raw-script capability to the `plgg-sql` `Db` seam (`execScript` + `runScript`)

## Overview

`plgg-db-migration` must apply a migration's `up`/`down` body: **trusted,
developer-authored, frequently multi-statement raw DDL/DML with no bound
parameters**. The existing `Db` seam cannot do this. `Db.run(sql)` goes through
`conn.prepare(text).run(...)` (`packages/plgg-sql/example.ts`), and a prepared
statement compiles a **single** statement — which is exactly why the example
reaches for `conn.exec("BEGIN")` for its multi-statement needs. The only
alternatives are a fragile statement-splitter (mishandles `;` inside string
literals / `BEGIN…END` / dollar-quoted bodies) or an additive raw-script
capability on the seam. We take the latter.

Add one **required** method to the `Db` type — `execScript(text: SoftStr):
Promise<void>` — for executing a trusted SQL script, plus a sibling pipeline
step `runScript(db)(text)` that folds a driver rejection into a value-level
`SqlError`, mirroring `query`/`exec`. Update the `node:sqlite` `Db` in
`example.ts` to implement it (over `conn.exec`).

This is a breaking change to the `Db` type (every implementer must add
`execScript`). That is sanctioned — plgg is its own only consumer, and a
**required** method is deliberate: an *optional* method would force every caller
to keep a statement-splitter fallback alive, reintroducing the exact risk we are
removing.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — the new
  usecase lands in `packages/plgg-sql/src/Db/usecase/`, the seam type in
  `Db/model/`, following the package's existing layout.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; `unknown` driver rejection folded through `toSqlError`;
  arrow functions, `type`, `Readonly`. Prettier printWidth 50.
- `workaholic:implementation` / `policies/type-driven-design.md` — `execScript`
  takes `SoftStr` (trusted text, not the parameterized `Sql` box) and is
  documented as trusted-input-only, the same trust contract `sql`'s static
  template chunks carry.
- `workaholic:implementation` / `policies/functional-programming.md` —
  `runScript` returns `PromisedResult<void, SqlError>` (errors as values, no
  `throw`); config-first/data-last like `query`/`exec`.
- `workaholic:implementation` / `policies/persistence.md` — this capability is
  what lets the migration framework run schema DDL through the relational seam.
- `workaholic:implementation` / `policies/test.md` — unit-test `runScript`'s
  ok/err folding against an in-memory `node:sqlite` `Db`; keep coverage > 90%.

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v2.md` §0 item 1 + §1.2 (the
required `execScript` seam + `runScript` step; the `;`-splitter dropped
entirely) and §5 (driver/placeholder risks), the consensus folding of
`reviews/round-1-architect.md` (Boundary 1) and `reviews/round-1-constructor.md`
(required not optional; named `execScript` to avoid colliding with the existing
`exec` usecase; owned by `plgg-sql` as the seam owner).

## Key Files

- `packages/plgg-sql/src/Db/model/Db.ts` - the `Db` type; add the required
  `execScript` member next to `all`/`run`/`begin`/`commit`/`rollback`.
- `packages/plgg-sql/src/Db/usecase/query.ts` - the `query`/`exec` steps to
  mirror for `runScript`.
- `packages/plgg-sql/src/Db/usecase/index.ts` - barrel to export `runScript`.
- `packages/plgg-sql/example.ts` - the `node:sqlite` `Db`; implement
  `execScript` over `conn.exec(text)`.

## Implementation Steps

1. Add `execScript: (sql: SoftStr) => Promise<void>` as a **required** member of
   the `Db` type in `Db/model/Db.ts`, documented as "trusted scripts only —
   never user input; bypasses the parameterized `Sql` box".
2. Add `runScript` to `Db/usecase/query.ts` (or a sibling file):
   `runScript = (db: Db) => (text: SoftStr): PromisedResult<void, SqlError> =>
   db.execScript(text).then(() => ok(undefined), (c) => err(toSqlError(c)))`.
   Export it from the usecase barrel and `src/index.ts`.
3. Implement `execScript` in `example.ts`'s `open` seam over `conn.exec(text)`
   (which already handles multi-statement scripts).
4. Add unit tests for `runScript` (ok path + a rejecting `Db` → `SqlError`),
   keeping branch/line coverage > 90%.
5. `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh` green.

## Considerations

- `execScript` deliberately bypasses parameter binding; it is for trusted,
  developer-authored SQL only. Document this at the type and in the README so it
  is never used with user input (`packages/plgg-sql/src/Db/model/Db.ts`).
- Naming: the existing usecase `exec` wraps `db.run` (DML, one statement);
  `runScript` wraps `db.execScript` (trusted multi-statement). Keep both names
  distinct to avoid call-site confusion (`packages/plgg-sql/src/Db/usecase/`).
- This is a prerequisite for every `plgg-db-migration` apply step; it must land
  and be published (`file:` dep) before those tickets build.
