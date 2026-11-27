# 値と変換

文字列の長さを数える前に、空文字列を許すかを決めます。`asSoftStr` は空文字列も受け付けます。`asStr` は空文字列を拒み、成功時には `Str` で包みます。`mapResult` なら、検証に成功したときだけ中身を使えます。

```ts
import { asStr, mapResult, pipe } from "plgg";

import type { Str } from "plgg";

const titleLength = (input: unknown) =>
  pipe(asStr(input), mapResult((title: Str) => title.content.length));
console.log(titleLength("Atlas")); // Ok(5)
```
