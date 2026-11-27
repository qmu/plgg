# proc で非同期の処理をつなぐ

`proc` は各ステップの Promise を待ち、`Ok` なら中身を次に渡します。`Err` が返ると残りの処理を飛ばします。途中で起きた予期しない例外は `Defect` に包まれます。次の例では入力を空文字列に変えると、文字数を数える関数は呼ばれません。

```ts
import { asStr, proc } from "plgg";

const result = await proc(
  "Atlas",
  asStr,
  (title) => Promise.resolve(title.content.length),
);
console.log(result); // Ok(5)
```
