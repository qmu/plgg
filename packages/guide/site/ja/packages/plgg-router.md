# plgg-router — URL から項目を読み取る

`compilePattern` でパスのパターンを用意し、`matchSegments` に実際のパスを渡します。一致すると `Some` にパラメーターが入り、一致しなければ `None` が返ります。画面への反映は [plgg-view](/packages/plgg-view/) が担当します。

```ts
import {
  compilePattern,
  matchSegments,
} from "plgg-router";

const book = compilePattern("/books/:id");
console.log(matchSegments(book, "/books/42")); // Some({ id: "42" })
```

## 使い方と制約

`matchSegments(segments, pathname) → Option<Captured>`

複数の URL を同じ規則で読むなら `compilePattern` の結果を使い回します。照合に必要なのは pathname です。照合できても id は文字列のままなので、数字だけという条件は利用側で確かめます。

## 残りのパスをまとめて読む

:id は一つの区間、*path は残りの区間をまとめて受け取ります。複数の階層を持つ資料名には後者が使えます。パーセント符号化された区間は復号されますが、壊れた符号列は元のまま残ります。パスに一致したという事実だけで、資料名が登録済みかどうかは決まりません。

```ts
import {
  compilePattern,
  matchSegments,
} from "plgg-router";

const route = compilePattern("/docs/*path");
console.log(
  matchSegments(
    route,
    "/docs/books/field%20notes",
  ),
);
```
