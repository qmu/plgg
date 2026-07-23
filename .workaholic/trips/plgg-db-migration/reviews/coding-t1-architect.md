# Coding Review — T1 (plgg-sql `execScript`/`runScript` seam) — Architect

- **Reviewer**: Architect (analytical / code + architectural review; no test execution)
- **Ticket**: `20260627210145-plgg-sql-execscript-seam.md`
- **Verdict**: **Approve with minor suggestions**

---

## What I checked (against my concurrent-launch discovery + the policies)

**1. Seam shape — exact (✓).** `Db.execScript` is a **required** member
(`Db/model/Db.ts:42`), placed in the seam alongside `all`/`run`/`begin`/`commit`/
`rollback`. `runScript` (`Db/usecase/runScript.ts:23`) is a verbatim mirror of
`query`/`exec`: config-first `(db)`, data-last `(text)`, returning
`PromisedResult<void, SqlError>`, folding the driver rejection through
`toSqlError` in the `.then(onOk, onErr)` shape. Exported via the usecase barrel
(`Db/usecase/index.ts`) so it flows out of `src/index.ts`. This is precisely the
shape I specified.

**2. The flagged gap was caught (✓).** My discovery warned that a *required*
member breaks every `Db` literal, and the ticket named only `example.ts`. All
three other literals now implement `execScript`: `example.ts:82` (over
`conn.exec(text)`), `query.spec.ts:25`, `transaction.spec.ts:30`, plus the new
`runScript.spec.ts` stub. Consistent with the reported tsc-clean / 27-pass.

**3. Contract / boundary framing — right (✓).** The trusted-scripts-only contract
is documented prominently at *both* the type (`Db.ts:32-41`) and the step
(`runScript.ts:14-22`): "executed verbatim… **bypasses the parameterized `Sql`
box**… must NEVER carry user input." This is the security-critical boundary and
it is stated where a caller will see it. `runScript` exposes **no** raw-string
injection risk *of its own* — it is a thin pass-through; the trust obligation is
correctly pushed to the caller (migration bodies are developer-authored, the same
trust class as `sql`'s static template chunks). `Promise<void>` correctly
discards any driver result (DDL needs none), matching `begin`/`commit`/`rollback`.

**4. Faithfulness — thin translate-and-delegate, no escape hatches (✓).**
`runScript` does nothing but delegate to `db.execScript` and fold the outcome;
the `node:sqlite` impl is a one-line `conn.exec(text)`. No `as`/`any`/`ts-ignore`,
no `throw`, no `null`. The `runScript.spec.ts` `stub(over: Partial<Db>)` helper is
a clean full-default-plus-override with no assertion. Errors stay on the `Result`
channel.

**5. `;`-splitter correctly avoided (✓).** No statement splitting anywhere; the
whole body is handed to the driver's native multi-statement `exec`. This is the
core decision T1 exists to enable, and it is honored cleanly — the medium-severity
splitter risk from design-v1 is gone, not documented-around.

## Concern + proposal (minor, non-blocking)

**C1 — the type-member param label `sql: SoftStr` should be `text: SoftStr`.**
`Db.ts:42` declares `execScript: (sql: SoftStr) => Promise<void>`. The label is
purely documentary (a function-type annotation binds nothing, shadows nothing),
so this is **not** a correctness issue. But it reuses the label `sql` that the two
neighbouring members `all: (sql: Sql)` and `run: (sql: Sql)` use for an argument
of type **`Sql`** — so a reader scanning the seam sees three `sql:` parameters,
two of type `Sql` and one of type `SoftStr`. The whole point of `execScript` is
that it takes *raw text, not the `Sql` box*; naming the parameter `text` makes the
type self-document that distinction (`type-driven-design`: names carry meaning),
and matches the `runScript` step and the example impl, which already use `text`.
**Proposal**: rename the type-member parameter to `text: SoftStr`. One-character-
class change, no behavioral effect — fold it in now or carry as a trivial cleanup.

## Forward note (not a T1 issue)

For T5's `applyMigration`: when the body is wrapped in `plgg-sql`'s `transaction`
(BEGIN/COMMIT around `runScript`), a migration body that *itself* contains
transaction-control statements (`BEGIN`/`COMMIT`) would conflict with the outer
wrap. This is already accounted for by the design's per-migration `transaction:false`
flag (§2.1/§2.2) — flagging only so the T5 reviewer keeps it in view; nothing for
T1 to do.

## Decision

**Approve with minor suggestions.** The seam is exactly the agreed boundary
(model-v1 Boundary 1, design-v2 §0.1), faithful to plgg-sql, well-documented, and
the required-method blast radius was handled correctly. C1 is cosmetic and can be
folded without re-review.
