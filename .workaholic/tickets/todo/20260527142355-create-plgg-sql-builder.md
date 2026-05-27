---
created_at: 2026-05-27T14:23:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
---

# Create `plgg-sql` — SQL builder + typesafe row mapping (POC)

## Overview

Add a new monorepo package `src/plgg-sql`. Not really an ORM — a **SQL builder**
that produces **parameterized** SQL plus a **typesafe mapping** from raw result
rows into predefined plgg data types. Built **functionally, from scratch, on top
of [plgg](../plgg/)** like `plgg-web`: the query is pure data (an AST), builders
are data-last functions composed with `pipe`, and the database driver is left
outside as a seam. The only runtime dependency is `plgg`.

This is an **UNSTABLE / EXPERIMENTAL POC** — minimal `SELECT` builder +
row decoder; driver-agnostic (no connection). Doctrine is non-negotiable (same
as `plgg-web`): dogfood plgg types/combinators (`Box` unions for the AST,
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
2. Define the query AST as a `Box` union — POC target `Select { table, columns,
   where }`; `where` is itself an expression `Box` union: comparisons (`eq`,
   `gt`, `lt`) carrying a column + a value **bound as a parameter**, plus logical
   combinators (`and`, `or`).
3. Add builders `from(table)` (seeds a query), `select(columns)` and
   `where(expr)` as `Query => Query` `pipe` steps, plus expression constructors
   (`eq(col, value)`, `and(a, b)`, …) taking all args in one call.
4. Implement `toSql(query): { text, params }` emitting **positional**
   placeholders (Postgres `$1, $2, …` for the POC). User values **always** flow
   through `params` — never string-concatenated into `text` (injection safety).
5. Implement `decodeRows(asRow)(rows): Result<ReadonlyArray<Row>, InvalidError>`
   mapping `unknown` driver rows → typed records via plgg `cast`
   (`asObj` + `forProp`), so a shape mismatch is a value-level error.
6. Add `sh/tsc-plgg-sql.sh`, `sh/test-plgg-sql.sh` (+ watch); wire into
   `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh`.
7. Add `README.md` + a runnable `example.ts` (`npx tsx`): build a `SELECT`,
   print `{ text, params }`, then decode a sample row set into typed records.
8. Ensure `sh/tsc-plgg-sql.sh` and `sh/test-plgg-sql.sh` are green, coverage > 90%.

## Considerations

- **SQL injection safety** is a correctness requirement: every user value must
  be a bound parameter in `params`, never interpolated into the SQL `text`
  (`src/plgg-sql/`).
- **Driver-agnostic by design**: `plgg-sql` takes on no DB dependency in the
  POC. `toSql` emits `{ text, params }`; execution is a caller-supplied
  `Executor` seam. The POC builds SQL and maps a supplied row set — it does not
  open a connection.
- **Out of scope for this POC** (note as "later"): `INSERT`/`UPDATE`/`DELETE`,
  joins, group/order/limit, transactions, a real driver/connection pool,
  migrations, multi-dialect rendering (Postgres `$n` only for now).
- `npm install` needed per package in this worktree; after editing `src/plgg/src`
  run `npm run build` in `src/plgg`.
