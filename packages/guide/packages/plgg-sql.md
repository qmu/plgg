# plgg-sql

Database work as **pipeline steps**, built from scratch
on [plgg](/packages/plgg/). Not an ORM and not a
query-builder AST — plgg-sql gives you a handful of
data-last steps (build SQL, run it, run it in a
transaction, map rows to types) that drop straight into a
[`proc`](/concepts/async)/`pipe` chain. Because they speak
the same vocabulary as a
[plgg-server](/packages/plgg-server) handler, a DB step
and a web step are **interchangeable links in the same
pipe**. Its only runtime dependency is `plgg`; the driver
lives entirely at a seam the application supplies.

## Writing an app with it

A request comes in and a row goes out — as one
[`proc`](/concepts/async). `transaction` wraps a sub-pipe
so it is atomic, [`Result`](/concepts/result) drives the
commit/rollback, and a DB step sits right next to a web
step in the same chain:

```typescript
import { proc } from "plgg";
import {
  sql,
  exec,
  query,
  transaction,
  decodeRow,
} from "plgg-sql";

// decodeJson/asNewUser/asUser are the handler's
// own plgg `cast` validators; post/jsonResponse
// are its web vocabulary — a DB step and a web
// step are interchangeable links in one pipe.
post("/users", (c) =>
  proc(
    c.req.body,
    decodeJson,                  // core:    text → unknown
    asNewUser,                   // core:    cast/forProp/refine → NewUser
    transaction(db, (u) =>       // plgg-sql: everything inside is atomic
      proc(
        sql`INSERT INTO users (name, email) VALUES (${u.name}, ${u.email})`,
        exec(db),                // plgg-sql: DML → ExecResult
        (r) => query(db)(
          sql`SELECT id, name, email FROM users WHERE id = ${r.lastInsertId}`),
        decodeRow(asUser),       // plgg-sql: rows → User
      )),
    (user) => jsonResponse(user, 201), // web: User → HttpResponse
  ))
```

`proc` awaits each step and short-circuits on the first
`Err`. `transaction` **rolls back** when the inner result
is `Err`, **commits** when `Ok` — errors-as-values drive
the transaction; no try/catch.

## Vocabulary

The steps plgg-sql adds are all pure plgg data,
grouped by concern:

- **SQL** — the `` sql`…` `` tagged template builds a
  parameterized `Sql` ([`Box`](/concepts/tagged-data))
  where each `${value}` is a bound `?` and an
  interpolated `Sql` splices; `isSql` guards it.
- **run** — `query(db)` (a `SELECT` → raw rows),
  `exec(db)` (DML → `ExecResult`), `transaction(db, work)`
  (an atomic sub-pipe), and `runScript(db)` (trusted,
  developer-authored DDL scripts).
- **map** — `decodeRow`/`decodeRows` turn raw rows into
  typed records or a typed error, built from plgg core's
  `cast`/`asObj`/`forProp`/`refine`.
- **seam** — `Db`, the small driver interface the
  application supplies (`ExecResult` is what DML yields).
- **failure** — `SqlError` (a [`Box`](/concepts/tagged-data)
  with a serializable cause), constructed with
  `sqlError`/`toSqlError` and matched with `sqlError$`;
  shape mismatches are `InvalidError`.

Validation and mapping are **not** new vocabulary — they
are the same [`Result`](/concepts/result)-returning `cast`
words a handler already uses. The exact types and the full
step list live in the `plgg-sql` source.

## The vocabulary it adds

| Step | Shape | What it does |
|------|-------|--------------|
| `` sql`…` `` | → `Sql` | parameterized SQL; each `${value}` is a bound `?` (`None` = SQL `NULL`), an interpolated `Sql` splices |
| `query(db)` | `Sql → PromisedResult<unknown[], SqlError>` | run a `SELECT` |
| `exec(db)` | `Sql → PromisedResult<ExecResult, SqlError>` | run DML → `{ changes, lastInsertId }` |
| `decodeRows(asRow)` | `unknown[] → Result<T[], InvalidError>` | map every row via `cast` |
| `decodeRow(asRow)` | `unknown[] → Result<T, InvalidError>` | map the first row (empty set is an error) |
| `transaction(db, work)` | `A → PromisedResult<T, …>` | run a sub-pipe atomically |

Validation and mapping are **not** new vocabulary — they
are plgg core's `cast`/`asObj`/`forProp`/`refine`, the
same words a handler already uses. plgg-sql only adds
`sql`, `query`, `exec`, `transaction`.

## The database seam

The library imports **no driver**. The steps work against
a small `Db` interface the application implements (the
example wires `node:sqlite`):

```typescript
type Db = {
  all: (sql: Sql) => Promise<ReadonlyArray<unknown>>;
  run: (sql: Sql) => Promise<ExecResult>;
  execScript: (sql: SoftStr) => Promise<void>;
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};
```

Swapping SQLite for Postgres means rewriting only this
seam; your `sql`, validators, and `query`/`exec`/`transaction`
steps are untouched.

## Errors as values

Driver failures are **`SqlError`** — tagged
[`Box`](/concepts/tagged-data) data with a serializable
cause:

```typescript
export type SqlError = Box<
  "SqlError",
  { message: SoftStr; cause: Option<unknown> }
>;
```

Shape mismatches are `InvalidError`. Both flow through
`Result`/`proc` (see the
[core error model](/packages/plgg/structures-errors#the-error-model-—-errors-as-data)),
so nothing throws past the seam — a handler folds them to
its own channel with one `mapErr`. `SqlError` follows the
same `Box`-union idiom as the core errors; a future shared
"boundary error" primitive may unify them.

Other guarantees: **injection-safe by construction** (a
`${value}` can only become a bound `?`, never SQL text),
**no `null`/`undefined`** in the model (absence is `None`
= SQL `NULL`), and **typed rows or a typed error** —
`decodeRow(s)` never hands back `unknown` or a wrong cast.

Out of scope (POC): dynamic identifiers, connection
pooling, migrations, and multi-dialect rendering.
