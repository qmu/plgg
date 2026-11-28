# plgg-sql — Build a parameterized query

Interpolating a value into `sql` adds a `?` to the statement and appends the value to `params`. For identifiers such as column names, validate with `asSqlIdent` and insert with `identSql`. Execute using your application’s `Db` adapter, then validate the returned records with `decodeRows`.

```ts
import { sql } from "plgg-sql";

const id = 42;
const query = sql`SELECT title FROM books WHERE id = ${id}`;
console.log(query.content.text); // SELECT title FROM books WHERE id = ?
```

## Working with the API

`query(db)(statement) → PromisedResult<ReadonlyArray<unknown>, SqlError>`

Selecting columns does not type the result. `decodeRows` accepts an empty list. `decodeRow` requires a first row but does not check for duplicates. Enforce uniqueness in the query or schema when required.

## Group related writes

To commit a loan and its stock adjustment together, pass the unit of work to transaction(db, work)(input). `Ok` from work triggers commit and `Err` triggers rollback. Use `exec`(db)(statement) for the individual writes and inspect changes on success.
