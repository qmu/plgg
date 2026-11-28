# Result で失敗の理由を返す

冊数を半分ずつ配るとき、割り切れない場合も戻り値で表せます。`Result<T, E>` の `T` は成功値、`E` は失敗の理由です。`mapResult` は成功値だけを変換します。最後に `matchResult` に失敗時、成功時の順で関数を渡して表示を決めます。

```ts
import { err, matchResult, ok } from "plgg";
import type { Result } from "plgg";

const half = (
  n: number,
): Result<number, string> =>
  n % 2 === 0 ? ok(n / 2) : err("odd count");

const label = matchResult(
  (reason: string) => reason,
  (n: number) => String(n),
);
console.log(label(half(3))); // odd count
```

## 失敗理由を残す場所を決める

入力の誤りは `InvalidError`、JSON への変換や復元には SerializeError や DeserializeError という型があります。どのエラーを返すかは関数ごとに確認してください。たとえば `decodeJson` の構文エラーは `InvalidError` です。エラー本体もタグ付きの値で、メッセージはその content にあります。

`mapErr` なら成功値を触らずに失敗理由だけを変換できます。利用者に文章を見せる直前までは元の型を残すと、複数項目のエラーも調べられます。成功の次にもう一度検証する場合は `chainResult` を使います。

```ts
import {
  asStr,
  chainResult,
  decodeJson,
  mapErr,
  pipe,
  type InvalidError,
} from "plgg";

const readTitle = (s: string) =>
  pipe(
    decodeJson(s),
    chainResult(asStr),
    mapErr(
      (e: InvalidError) => e.content.message,
    ),
  );

console.log(
  readTitle('"Atlas"'),
  readTitle("42"),
  readTitle("{"),
);
```

## 予想している失敗と想定外の例外

入力の桁数が足りないだけなら、メッセージを持つ invalidError を返せます。外部の処理が例外を投げたときは `tryCatch` が `Defect` に変換します。cause には元の例外について保存できる情報が入ります。利用者に見せる文と、調査用の情報をここで分けられます。

```ts
import {
  err,
  invalidError,
  ok,
  type InvalidError,
  type Result,
} from "plgg";

const shelf = (
  n: number,
): Result<number, InvalidError> =>
  Number.isInteger(n) && n > 0
    ? ok(n)
    : err(
        invalidError({
          message:
            "Expected a positive shelf number",
        }),
      );

console.log(shelf(1), shelf(0));
```
