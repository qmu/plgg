# plgg-sql

> **UNSTABLE** — Experimental study work (POC). Part of the [plgg monorepo](../../README.md).

Database work as **pipeline steps**, built **from scratch on [plgg](../plgg/)**.
Not an ORM and not a query-builder AST — plgg-sql gives you a handful of
data-last steps (build SQL, run it, run it in a transaction, map rows to types)
that drop straight into a plgg `proc`/`pipe` chain. Because they speak the same
vocabulary as a [plgg-web](../plgg-web/) HTTP handler, a DB step and a web step
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

See [`example.ts`](./example.ts) for a runnable version against real SQLite
(`npx tsx src/plgg-sql/example.ts`).

## The vocabulary plgg-sql adds

| Step | Shape | What it does |
|---|---|---|
| `` sql`…` `` | → `Sql` | build safe parameterized SQL; each `${value}` is a bound `?` param (`None` = SQL `NULL`), an interpolated `Sql` fragment splices |
| `query(db)` | `Sql → PromisedResult<unknown[], SqlError>` | run a `SELECT`, return raw rows |
| `exec(db)` | `Sql → PromisedResult<ExecResult, SqlError>` | run `INSERT`/`UPDATE`/`DELETE` → `{ changes, lastInsertId }` |
| `decodeRow(asRow)` / `decodeRows(asRow)` | `unknown[] → Result<T \| T[], InvalidError>` | map raw rows into typed records via plgg `cast` |
| `transaction(db, work)` | `A → PromisedResult<T, …>` | run a sub-pipe atomically; commit on `Ok`, roll back on `Err` |

**Validation and mapping are not new vocabulary** — they are plgg core's
`cast`/`asObj`/`forProp`/`refine`, the same words a plgg-web handler already
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

## Out of scope (POC)

Dynamic identifiers (table/column names as values — only literal values bind),
a real connection pool, migrations, and multi-dialect rendering (SQLite `?`
only). These are intentionally deferred.
