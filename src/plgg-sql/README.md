# plgg-sql

> **UNSTABLE** — Experimental study work (POC). Part of the [plgg monorepo](../../README.md).

A **safe SQL evaluator** — *not* an ORM and *not* a query-builder AST — built
**from scratch on the [plgg](../plgg/) framework**. You write the SQL (trusted in
your application); `plgg-sql` is the safety helper around three jobs:

1. **Build** the SQL string with interpolated values bound as parameters — never
   string-concatenated, so injection-safe by construction.
2. **Execute** it through a caller-supplied driver seam (the library ships no
   driver).
3. **Map** the raw result rows into typed plgg records.

Like [`plgg-web`](../plgg-web/), this is a dogfooding exercise: the SQL value is a
plgg `Box`, mapping uses plgg `cast`, failures are values (`Result`), and the
database lives **outside as a seam**. The only runtime dependency is `plgg`.

## The plgg-native model

| Concern | Type |
|--------|------|
| a piece of SQL | `Sql` = `Box<"Sql", { text: SoftStr; params: ReadonlyArray<SqlValue> }>` |
| a bound value | `SqlValue` = `SoftStr \| Num \| Bool \| null` |
| sync driver seam | `Executor` = `(sql: Sql) => ReadonlyArray<unknown>` |
| async driver seam | `AsyncExecutor` = `(sql: Sql) => Promise<ReadonlyArray<unknown>>` |
| evaluation result | `Result<ReadonlyArray<Row>, InvalidError>` (or `PromisedResult<…>`) |

## 1. Safe SQL building — the `sql` tagged template

```typescript
import { sql } from "plgg-sql";

const id = 7;
const q = sql`SELECT id, name FROM users WHERE id = ${id} AND active = ${true}`;
// q.content.text   === "SELECT id, name FROM users WHERE id = ? AND active = ?"
// q.content.params === [7, true]
```

The static chunks are trusted, developer-authored text. Each `${value}` becomes
a `?` placeholder and is pushed onto `params` — user values never reach the SQL
string. Because you write raw SQL, `INSERT`/`UPDATE`/`DELETE`, joins, grouping
and ordering all work without dedicated builders.

### Fragment composition

Interpolating another `Sql` fragment **splices** it (text + params merged);
interpolating a plain value **binds** it. This makes reusable / conditional
clauses safe to assemble:

```typescript
const active = sql`active = ${true}`;
const adult = sql`age >= ${18}`;
const q = sql`SELECT id FROM users WHERE ${active} AND ${adult}`;
// "SELECT id FROM users WHERE active = ? AND age >= ?", params [true, 18]
```

## 2. Execution — the `Executor` seam + `run`

The library imports **no driver**. You supply an `Executor`; `run` (sync) and
`runAsync` (async) compose it with the row decoder and hand back a `Result`:

```typescript
import { run, runAsync } from "plgg-sql";

const users = run(execute, asUser)(q);            // Result<ReadonlyArray<User>, InvalidError>
const users = await runAsync(executeAsync, asUser)(q); // PromisedResult<…>
```

## 3. Mapping — `decodeRows`

`decodeRows` (which `run` uses internally) lifts raw `unknown` driver rows into
typed records with plgg `cast` — no `as`, no exceptions. A shape mismatch becomes
a value-level `InvalidError` (failures gathered into its `sibling` array):

```typescript
import { decodeRows } from "plgg-sql";
import { cast, asObj, forProp, asNum, asSoftStr } from "plgg";

type User = { id: number; name: string };
const asUser = (row: unknown) =>
  cast(row, asObj, forProp("id", asNum), forProp("name", asSoftStr));
```

## End-to-end against real SQLite

[`example.ts`](./example.ts) is a **runnable** demo (`npx tsx src/plgg-sql/example.ts`)
that wires Node's built-in `node:sqlite` (no npm dependency) — the only code
aware of the database is the `Executor`:

```typescript
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(":memory:");
// ... create table + seed rows (via sql writes too) ...

// the seam: coerce booleans to 0/1 (SQLite has no boolean) and run
const execute = (s: Sql): ReadonlyArray<unknown> =>
  db.prepare(s.content.text).all(...s.content.params.map(toBindable));

const result = run(execute, asUser)(
  sql`SELECT id, name, age FROM users WHERE active = ${true} AND age > ${18}`,
);
```

## Out of scope (POC)

Dynamic identifiers (table / column names interpolated as values — only literal
values bind for now), transactions, a real connection pool, migrations, and
multi-dialect rendering (SQLite `?` only). These are intentionally deferred.
