# plgg-sql — SQL とパラメーターを組み立てる

`sql` に値を埋め込むと、SQL の本文には `?` が入り、値は順番に `params` に入ります。列名などの識別子は `asSqlIdent` で検証し、`identSql` で組み込みます。実行時にはアプリが用意する `Db` を使い、取得した行は `decodeRows` で検証できます。

```ts
import { sql } from "plgg-sql";

const id = 42;
const query = sql`SELECT title FROM books WHERE id = ${id}`;
console.log(query.content.text); // SELECT title FROM books WHERE id = ?
```
