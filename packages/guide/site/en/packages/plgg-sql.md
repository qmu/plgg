# plgg-sql — Build a parameterized query

Interpolating a value into `sql` adds a `?` to the statement and appends the value to `params`. For identifiers such as column names, validate with `asSqlIdent` and insert with `identSql`. Execute using your application’s `Db` adapter, then validate the returned records with `decodeRows`.

```ts
import { sql } from "plgg-sql";

const id = 42;
const query = sql`SELECT title FROM books WHERE id = ${id}`;
console.log(query.content.text); // SELECT title FROM books WHERE id = ?
```
