# pipe と flow で関数をつなぐ

`pipe` は最初の値をすぐに処理します。`flow` は同じ処理を別の値にも使える関数を作ります。次の二つの式はどちらも `5` を返します。[Result](/concepts/result/) を渡したときは、`mapResult` のように Result を受け取る関数を次に置きます。

```ts
import { flow, pipe } from "plgg";

const trim = (s: string) => s.trim();
const length = (s: string) => s.length;
console.log(pipe(" Atlas ", trim, length));
console.log(flow(trim, length)(" Atlas "));
```
