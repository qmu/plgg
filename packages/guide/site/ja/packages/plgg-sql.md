# plgg-sql — SQL とパラメーターを組み立てる

`sql` に値を埋め込むと、SQL の本文には `?` が入り、値は順番に `params` に入ります。列名などの識別子は `asSqlIdent` で検証し、`identSql` で組み込みます。実行時にはアプリが用意する `Db` を使い、取得した行は `decodeRows` で検証できます。

```ts
import { sql } from "plgg-sql";

const id = 42;
const query = sql`SELECT title FROM books WHERE id = ${id}`;
console.log(query.content.text); // SELECT title FROM books WHERE id = ?
```

## 使い方と制約

`query(db)(statement) → PromisedResult<ReadonlyArray<unknown>, SqlError>`

列を選んだだけでは戻り値の型は決まりません。ゼロ行でも一覧として成功させるなら `decodeRows` を、一行が必須なら `decodeRow` を使います。後者は先頭行を読み、二行目以降の重複を調べません。一意性は制約や問い合わせで保証します。

## 二つの書き込みをまとめる

貸出記録と在庫の更新を同時に確定したい場合は transaction(db, work)(input) に一まとまりの処理を渡します。work が `Ok` なら commit、`Err` なら rollback が呼ばれます。個々の INSERT や UPDATE は `exec`(db)(statement) に渡し、変更件数は成功値の changes で調べられます。
