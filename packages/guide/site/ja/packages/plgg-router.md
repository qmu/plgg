# plgg-router — URL から項目を読み取る

`compilePattern` でパスのパターンを用意し、`matchSegments` に実際のパスを渡します。一致すると `Some` にパラメーターが入り、一致しなければ `None` が返ります。画面への反映は [plgg-view](/packages/plgg-view/) が担当します。

```ts
import { compilePattern, matchSegments } from "plgg-router";

const book = compilePattern("/books/:id");
console.log(matchSegments(book, "/books/42")); // Some({ id: "42" })
```
