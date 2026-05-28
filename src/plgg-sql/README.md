# plgg-sql

> **UNSTABLE** — Experimental study work (POC). Part of the [plgg monorepo](../../README.md).

Database work as **pipeline steps**, built **from scratch on [plgg](../plgg/)**.
Not an ORM and not a query-builder AST — plgg-sql gives you a handful of
data-last steps (build SQL, run it, run it in a transaction, map rows to types)
that drop straight into a plgg `proc`/`pipe` chain. Because they speak the same
vocabulary as a [plgg-server](../plgg-server/) HTTP handler, a DB step and a web step
are **interchangeable links in the same pipe** — `request → validate → query →
map → response` is one chain. The only runtime dependency is `plgg`; the
database driver lives entirely at a seam the application supplies.

## One handler, one pipe

```typescript
post("/users", (c) =>
  proc(
    c.req.body,
    decodeJson,                                    // core:    text → unknown
    asNewUser,                                     // core:    validate → NewUser  (cast/forProp/refine)
    transaction(db, (u) =>                          // plgg-sql: everything inside is atomic
      proc(
        sql`INSERT INTO users (name, email) VALUES (${u.name}, ${u.email})`,
        exec(db),                                  // plgg-sql: DML → ExecResult
        (r) => query(db)(
          sql`SELECT id, name, email FROM users WHERE id = ${r.lastInsertId}`),
        decodeRow(asUser),                          // plgg-sql: rows → User
      )),
    (user) => jsonResponse(user, 201),             // web:     User → HttpResponse
  ))
```

`proc` awaits each async step and short-circuits on the first `Err`. If
validation fails, or the `INSERT` violates a constraint, the chain stops — and
`transaction` **rolls back** because the inner result is an `Err`, **commits**
when it is `Ok`. Errors as values drive the transaction; no try/catch.

## Runnable examples

Runs against a real in-memory SQLite database via Node's built-in
`node:sqlite` (no npm dependency):

- [`example.ts`](./example.ts) — the database pipeline (validate → INSERT →
  read-back → map, atomic; plus a read), driven by `proc`.
  `npx tsx src/plgg-sql/example.ts`

The same steps drop into a plgg-server HTTP handler unchanged — `param` and
`jsonResponse` become more links in the same `proc` chain. See
[`src/example/`](../example/) for the full SSR + JSON + CSR + `plgg-fetch`
round-trip demo.

## The vocabulary plgg-sql adds

| Step | Shape | What it does |
|---|---|---|
| `` sql`…` `` | → `Sql` | build safe parameterized SQL; each `${value}` is a bound `?` param (`None` = SQL `NULL`), an interpolated `Sql` fragment splices |
| `query(db)` | `Sql → PromisedResult<unknown[], SqlError>` | run a `SELECT`, return raw rows |
| `exec(db)` | `Sql → PromisedResult<ExecResult, SqlError>` | run `INSERT`/`UPDATE`/`DELETE` → `{ changes, lastInsertId }` |
| `decodeRows(asRow)` | `unknown[] → Result<T[], InvalidError>` | map every raw row into a typed record via plgg `cast` |
| `decodeRow(asRow)` | `unknown[] → Result<T, InvalidError>` | map the first row; an empty result set is an error |
| `transaction(db, work)` | `A → PromisedResult<T, …>` | run a sub-pipe atomically; commit on `Ok`, roll back on `Err` |

**Validation and mapping are not new vocabulary** — they are plgg core's
`cast`/`asObj`/`forProp`/`refine`, the same words a plgg-server handler already
uses. plgg-sql only adds `sql`, `query`, `exec`, `transaction`.

## The database seam

The library imports **no driver**. `query`/`exec`/`transaction` work against a
small `Db` interface the application implements — the one place that knows which
database you use (the example wires `node:sqlite`):

```typescript
type Db = {
  all: (sql: Sql) => Promise<ReadonlyArray<unknown>>;   // SELECT → rows
  run: (sql: Sql) => Promise<ExecResult>;               // DML → { changes, lastInsertId }
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};
```

Swapping SQLite for Postgres (or an async pooled driver) means rewriting only
this seam; the `sql` you write, your validators/decoders, and every
`query`/`exec`/`transaction` step are untouched.

## Reliability guarantees

- **Injection-safe by construction.** A `${value}` in `` sql`…` `` can only ever
  become a bound parameter (`?`); it never reaches the SQL text. There is no API
  for concatenating a value into the string.
- **No `null`/`undefined` in the model.** Absence is `Option` (`None` = SQL
  `NULL`); a raw `null` appears only at the driver seam.
- **Errors are values.** Driver failures are `SqlError`, shape mismatches are
  `InvalidError` — both flow through `Result`/`proc`, so nothing throws past the
  seam. A handler folds them to its own error channel with one `mapErr`.
- **Transactions are result-driven.** `transaction` commits iff the inner
  pipeline is `Ok` and rolls back on any `Err` (validation, mapping, or SQL),
  including a thrown one — proven in both examples by a duplicate-key insert that
  leaves no partial data behind.
- **Typed rows or a typed error.** `decodeRow(s)` never hand back `unknown` or a
  silently-wrong `as`-cast; a row that does not match `asRow` is an error value.

## Out of scope (POC)

Dynamic identifiers (table/column names as values — only literal values bind),
a real connection pool, migrations, and multi-dialect rendering (SQLite `?`
only). These are intentionally deferred.
