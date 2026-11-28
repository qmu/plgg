# 値と変換

文字列の長さを数える前に、空文字列を許すかを決めます。`asSoftStr` は空文字列も受け付けます。`asStr` は空文字列を拒み、成功時には `Str` で包みます。`mapResult` なら、検証に成功したときだけ中身を使えます。

```ts
import { asStr, mapResult, pipe } from "plgg";

import type { Str } from "plgg";

const titleLength = (input: unknown) =>
  pipe(
    asStr(input),
    mapResult(
      (title: Str) => title.content.length,
    ),
  );
console.log(titleLength("Atlas")); // Ok(5)
```

## 既定値を入れるのは最後にする

長さを画面に出すだけなら、検証に失敗した時点で「未入力」と表示できます。ただし、数値が届いた場合も同じ表示にすると、入力元の誤りに気づけません。次の例では失敗理由を引き継ぎ、表示を作る最後の関数でだけ文章にします。

```ts
import {
  asStr,
  matchResult,
  pipe,
  type InvalidError,
  type Str,
} from "plgg";

const label = (v: unknown) =>
  pipe(
    asStr(v),
    matchResult(
      (e: InvalidError): string =>
        e.content.message,
      (s: Str): string =>
        String(s.content.length),
    ),
  );

console.log(label("Atlas"), label(42));
```
