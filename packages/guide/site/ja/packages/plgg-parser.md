# plgg-parser — 小さなパーサーを組み合わせる

`literal` は指定した文字列を読み、`run` は解析結果を `Result` として返します。`run` は入力の先頭で一致すれば成功できます。入力全体を検証したいときは、次のように `eof` も組み合わせます。末尾に文字を足すと `Err` になります。

```ts
import {
  eof,
  left,
  literal,
  run,
} from "plgg-parser";

const keyword = left(literal("book"), eof);
console.log(run(keyword, "book", undefined));
```

## 使い方と制約

`literal(expected)(state) → Result<Parsed<SoftStr, S>, InvalidError>`

文法の一部を読む段階では後ろに文字が残ってよいので、literal の成功だけでは入力全体の妥当性は決まりません。キーワードを単独で受け付ける入口では eof を合わせます。book と bookshelf を試すと違いがわかります。

## 区切り文字を読み捨てる

左の値を残す left と右の値を残す right を組み合わせると、囲み記号付きの入力を読んで中身だけ返せます。終端も検査すれば、閉じ括弧の後に余分な文字があった場合も失敗します。

```ts
import {
  eof,
  left,
  literal,
  right,
  run,
} from "plgg-parser";

const item = left(
  right(literal("["), literal("book")),
  left(literal("]"), eof),
);
console.log(
  run(item, "[book]", undefined),
  run(item, "[book]x", undefined),
);
```
