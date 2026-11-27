# Result で失敗の理由を返す

冊数を半分ずつ配るとき、割り切れない場合も戻り値で表せます。`Result<T, E>` の `T` は成功値、`E` は失敗の理由です。`mapResult` は成功値だけを変換します。最後に `matchResult` に失敗時、成功時の順で関数を渡して表示を決めます。

```ts
import { err, matchResult, ok } from "plgg";
import type { Result } from "plgg";

const half = (n: number): Result<number, string> =>
  n % 2 === 0 ? ok(n / 2) : err("odd count");

const label = matchResult(
  (reason: string) => reason,
  (n: number) => String(n),
);
console.log(label(half(3))); // odd count
```
