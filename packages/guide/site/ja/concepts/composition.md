# pipe と flow で関数をつなぐ

`pipe` は最初の値をすぐに処理します。`flow` は同じ処理を別の値にも使える関数を作ります。次の二つの式はどちらも `5` を返します。[Result](/concepts/result/) を渡したときは、`mapResult` のように `Result` を受け取る関数を次に置きます。

```ts
import { flow, pipe } from "plgg";

const trim = (s: string) => s.trim();
const length = (s: string) => s.length;
console.log(pipe(" Atlas ", trim, length));
console.log(flow(trim, length)(" Atlas "));
```

## 設定を先に渡す理由

接頭辞を足す関数なら、先に接頭辞を決めておくと、残る引数は処理中の文字列だけになります。`flow` で作った関数を複数の行に使い回せます。`pipe` は途中の `Result` を自動で開きません。次の関数が中身だけを必要とするなら `mapResult`、検証をいくつも重ねるなら `cast` を選びます。

```ts
import { flow } from "plgg";

const prefix = (label: string) => (s: string) =>
  label + s;
const caption = flow(
  (s: string) => s.trim(),
  prefix("Book: "),
);
console.log([" Atlas", "Maps "].map(caption));
```

## 処理の途中で失敗できるか

`pipe` は計算順を表すだけです。たとえば長さの計算は成功値に対する単純な変換ですが、最大長の検査は失敗できます。後者を `mapResult` に渡すと成功の箱に `Result` がもう一つ入ります。`chainResult` なら一段の `Result` として続けられます。

```ts
import {
  asStr,
  chainResult,
  pipe,
  refine,
  type Str,
} from "plgg";

const short = refine(
  (s: Str) => s.content.length <= 4,
  "Too long",
);
console.log(
  pipe(asStr("Atlas"), chainResult(short)).__tag,
);
```
