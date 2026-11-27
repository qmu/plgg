# cast で入力の項目を検証する

入力を `unknown` として受け、`asObj` でオブジェクトを確認してから `forProp` で各項目を検証します。成功時には `title` が空でない文字列を包む `Str` になり、`copies` は `Num` になります。`title` を `""`、`copies` を `"2"` に変えると、両方の失敗が `InvalidError` の `content.sibling` に入ります。

```ts
import { asNum, asObj, asStr, cast, forProp } from "plgg";

const readBook = (input: unknown) =>
  cast(input, asObj, forProp("title", asStr), forProp("copies", asNum));

console.log(readBook({ title: "Field notes", copies: 2 }));
```
