# plgg-parser — 小さなパーサーを組み合わせる

`literal` は指定した文字列を読み、`run` は解析結果を `Result` として返します。`run` は入力の先頭で一致すれば成功できます。入力全体を検証したいときは、次のように `eof` も組み合わせます。末尾に文字を足すと `Err` になります。

```ts
import { eof, left, literal, run } from "plgg-parser";

const keyword = left(literal("book"), eof);
console.log(run(keyword, "book", undefined));
```
