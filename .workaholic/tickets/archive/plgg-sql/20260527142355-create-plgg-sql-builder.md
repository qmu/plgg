---
created_at: 2026-05-27T14:23:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort: 2h
commit_hash: 5b56818
category: Added
---

# Create `plgg-sql` — safe SQL evaluator (build + execute + map) (POC)

## Overview

Add a new monorepo package `src/plgg-sql`. **Not an ORM and not a query-builder
AST** — a **safe SQL evaluator**. The developer writes SQL (trusted in the app);
the library is a *safety helper* around three jobs: (1) **build** the SQL string
with interpolated values bound as parameters (never concatenated — injection
safe), (2) **execute** it through a caller-supplied driver seam, (3) **map**
result rows into typed plgg data. Built **functionally, from scratch, on top of
[plgg](../plgg/)** like `plgg-web`. The only runtime dependency is `plgg`
(the example wires Node's builtin `node:sqlite`, which is not an npm dependency).

This is an **UNSTABLE / EXPERIMENTAL POC**. Doctrine is non-negotiable (same as
`plgg-web`): dogfood plgg types/combinators (`Box` for the `Sql` value,
`cast`/`asObj`/`forProp` for row mapping); extend plgg core when a primitive is
missing; `as`/`any`/`ts-ignore` STRICTLY PROHIBITED; no OOP/method chaining;
expression-only bodies; errors as values; driver only at the seam; coverage > 90%.

## Key Files

- `src/plgg-web/` - **reference precedent**: package layout, `model/`+`usecase/`
  feature dirs, `export *` barrels, tsconfig split, `vite.config.ts`
  (coverage 91), and the data-last currying convention.
- `src/plgg/src/index.ts` - plgg core barrel (`cast`, `asObj`, `forProp`,
  `Result`, `Option`, `match*`); extend here if a primitive is missing, then
  `npm run build` in `src/plgg`.
- `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh` - wire the package in.
- `sh/tsc-plgg-web.sh`, `sh/test-plgg-web.sh` - template the `*-plgg-sql.sh`
  scripts on these.

## Implementation Steps

1. Scaffold `src/plgg-sql/`: `package.json` (`name: plgg-sql`,
   `dependencies: { plgg: "file:../plgg" }`), `tsconfig.json`
   (`paths: { "plgg-sql*": ["./src/*"] }`), `tsconfig.build.json`,
   `vite.config.ts` (lib es+cjs, `vite-plugin-dts`, coverage thresholds 91),
   `src/index.ts` barrel.
2. Define the `Sql` value as a plgg `Box<"Sql", { text, params }>` plus
   `SqlValue = SoftStr | Num | Bool | null` and an `isSql` guard. The `Box` tag
   lets the builder tell an interpolated nested fragment from a bound value.
3. Implement the `sql` **tagged template** (the safe string builder):
   `sql\`SELECT … WHERE id = ${id}\`` → `Sql` where each `${value}` becomes a
   SQLite `?` placeholder pushed onto `params`. **Fragment splicing**: when an
   interpolation is itself a `Sql`, splice its `text`+`params` (reusable/
   conditional clauses); otherwise bind the value as a parameter. Static
   template chunks are trusted text; user values **never** hit the SQL string.
4. Implement the execution seam + `run` combinator (both sync and async):
   `Executor = (sql: Sql) => ReadonlyArray<unknown>` and
   `AsyncExecutor = (sql: Sql) => Promise<ReadonlyArray<unknown>>`;
   `run(execute, asRow)(sql): Result<ReadonlyArray<T>, InvalidError>` and
   `runAsync(execute, asRow)(sql): PromisedResult<ReadonlyArray<T>, InvalidError>`
   compose the caller's executor with `decodeRows`. The library imports no driver.
5. Implement `decodeRows(asRow)(rows): Result<ReadonlyArray<Row>, InvalidError>`
   mapping `unknown` driver rows → typed records via plgg `cast`
   (`asObj` + `forProp`), so a shape mismatch is a value-level error. (Kept from
   the prior design — the only piece that survives the redesign.)
6. Add `sh/tsc-plgg-sql.sh`, `sh/test-plgg-sql.sh` (+ watch); wire into
   `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh`.
7. Add `README.md` + a **living, runnable** `example.ts` (`npx tsx`) that
   connects to a **real SQLite database** via Node's built-in `node:sqlite`
   (`DatabaseSync`; no new npm dependency, driver lives at the seam). It must
   demonstrate the intended **application** usage end-to-end: open a DB, create
   a `users` table + insert sample rows (via `sql` for the writes too), author a
   `SELECT` with the `sql` template, define an `Executor` seam against SQLite,
   then `run`/`decodeRows` into typed records — printing verifiable output.
   Demonstrate **both** the sync `run` and async `runAsync` paths.
8. Ensure `sh/tsc-plgg-sql.sh` and `sh/test-plgg-sql.sh` are green, coverage > 90%.

## Considerations

- **SQL injection safety** is a correctness requirement: every user value must
  be a bound parameter in `params`, never interpolated into the SQL `text`
  (`src/plgg-sql/`).
- **Driver-agnostic by design**: the `plgg-sql` *library* takes on no DB
  dependency — `toSql` emits `{ text, params }` and `decodeRows` maps a supplied
  row set; execution is a caller-supplied `Executor` seam. The **example**,
  however, must prove the seam against a real database: it wires `node:sqlite`
  (a Node builtin, not an npm dependency) so the end-to-end flow is verifiable.
- Because the developer writes raw SQL through `sql`, `INSERT`/`UPDATE`/`DELETE`,
  joins, grouping and ordering all work **for free** — no per-statement builders.
- **Out of scope for this POC** (note as "later"): dynamic identifiers
  (table/column names interpolated as values — only literal values bind for now),
  transactions, a real connection pool, migrations, multi-dialect rendering
  (SQLite `?` only for now).
- `npm install` needed per package in this worktree; after editing `src/plgg/src`
  run `npm run build` in `src/plgg`.

## Discussion

### Revision 1 - 2026-05-27T14:47:05+09:00

**User feedback**: "the start is that we need to support SQLite. I want to see a
living example that we can run and verify is valid with SQLite. There should
probably be an example.ts that is actually runnable by connecting to SQLite. By
seeing that example.ts, I want to see how this library is supposed to be used in
the application codebase. With that output, I can then approve."

**Ticket updates**:
- Step 4: target dialect changed from Postgres `$1,$2` to **SQLite** anonymous
  `?` placeholders bound in `params` order.
- Step 7: `example.ts` must connect to a **real SQLite database** via Node's
  built-in `node:sqlite` and demonstrate end-to-end application usage (create
  table, insert, build `SELECT`, run via an `Executor` seam, `decodeRows` into
  typed records, print verifiable output) — not just print `{ text, params }`.
- Considerations: clarified that the *library* stays driver-agnostic while the
  *example* wires `node:sqlite` (a Node builtin, not an npm dependency); the
  out-of-scope note now says "SQLite `?` only" instead of "Postgres `$n` only".

**Direction change**: SQLite is the first-class target dialect. `toSql` emits
`?` placeholders (no `$n` index threading needed). `example.ts` becomes a living,
runnable end-to-end demo against an in-memory SQLite DB, showing the intended
app integration: `toSql` → `Executor` (node:sqlite `prepare/all`) → `decodeRows`.

### Revision 2 - 2026-05-27T14:47:05+09:00

**User feedback**: "What I wanted to create is not quite an ORM, but an SQL
evaluator. The design is basically like this: the user provides SQL, and while we
trust SQL in the application, we need a safety helper to build the string. I am
imagining a tool that handles: 1. Safe string SQL building 2. Execution 3.
Mapping to the object. Would you first give me the design note so that we can have
an agreement on the design before you write the actual code?"

A design note was presented and agreed before coding. Agreed decisions:
- **Builder**: a `sql` tagged template with **fragment splicing** (interpolated
  `Sql` fragments splice; plain values bind as `?` params).
- **Execution**: ship a thin `run` combinator that composes a caller-supplied
  executor with `decodeRows`; the library still imports no driver.
- **Executor flavor**: support **both** sync (`Executor`/`run`) and async
  (`AsyncExecutor`/`runAsync`, returning `PromisedResult`).

**Ticket updates**:
- Title/Overview: reframed from "SQL builder (AST)" to "safe SQL **evaluator**"
  (build string + execute + map).
- Steps 2–4: replaced the query AST (`Expr` `eq/gt/lt/and/or`, `Query`
  `from/select/where`, `toSql`) with the `Sql` `Box` + `sql` tagged template +
  `run`/`runAsync` execution seam. Step 5 (`decodeRows`) is unchanged.
- Step 7: example now authors SQL via `sql`, seeds via `sql` writes, and shows
  both sync `run` and async `runAsync`.
- Considerations: raw SQL means DML/joins/ordering are free; new "later" note for
  dynamic identifiers.

**Direction change**: The AST builder is removed entirely. The library becomes a
safe-string `sql` template (injection-safe interpolation + fragment composition),
an execution seam with sync/async `run` combinators, and the existing
`decodeRows` mapper. This matches "user provides SQL; library makes it safe,
runs it, and maps it."

## Final Report

Development completed as planned, after two design pivots captured in the
Discussion above (SQLite-first, then full reframe from AST builder to a safe SQL
*evaluator*). Final shape: `sql` tagged template (`Box<"Sql">` + fragment
splicing), `Executor`/`AsyncExecutor` seam with `run`/`runAsync`, and the kept
`decodeRows`. tsc + 17 tests + es/cjs/dts build green; 100% coverage. `example.ts`
runs end-to-end against in-memory `node:sqlite`, proving both sync and async paths.

### Discovered Insights

- **Insight**: `node:sqlite`'s bind API (`SupportedValueType`) has no boolean
  type — passing a JS `true`/`false` throws. The example's `Executor` coerces
  booleans to `1`/`0` at the seam.
  **Context**: Confirms the design choice to keep the library driver-agnostic
  and push dialect/value quirks into the caller's `Executor`. A future real
  driver adapter must own the same value-coercion responsibility.
- **Insight**: plgg's `asObj` accepts null-prototype objects, and `node:sqlite`
  returns rows as null-prototype objects — so `decodeRows` maps driver rows
  directly with no normalization step.
  **Context**: Saves a defensive `{ ...row }` copy at the seam; relevant if a
  different driver returns class instances or exotic row objects instead.
- **Insight**: under `noUncheckedIndexedAccess`, defensive `?? ""` fallbacks on
  `TemplateStringsArray` indices are dead branches (the array length invariant
  makes them unreachable), which fails the 91% branch threshold. Rewriting `sql`
  to map over `strings` and append `placeholder(values[i])` makes the empty-tail
  branch genuinely reachable, keeping 100% branch coverage without `as` or a
  faked template array.
  **Context**: A reusable pattern for tagged-template builders in this codebase
  given the strict tsconfig + coverage doctrine.
