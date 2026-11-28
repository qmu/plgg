# match で場合分けする

`match` は値と処理の組を受け取ります。次の例では各タグに一つずつ処理を用意します。一方の行を外すと、TypeScript が未処理の場合を検出します。複数の場合を同じ扱いにするには最後に `otherwise` を置けます。

```ts
import { box, match, pattern } from "plgg";
import type { Box } from "plgg";

type Entry =
  | Box<"Title", string>
  | Box<"Count", number>;
const label = (entry: Entry): string =>
  match(entry)(
    [pattern("Title")(), (b) => b.content],
    [
      pattern("Count")(),
      (b) => String(b.content),
    ],
  );
console.log(
  label(box("Title")("Atlas")),
  label(box("Count")(2)),
);
```

## 種類が増えたときに気づく

上の `Entry` に新しいタグを加えると、label にその場合の値をどう表示するか書く必要が生じます。`otherwise` を置くと、新しい種類も既定の分岐に入ります。画面の表示や処理を種類ごとに決めたい場合は、分岐を明示して追加漏れを型検査で見つけます。

同じタグを生成側と判定側に何度も書くなら `defineVariant` にまとめます。make に渡すのは中身で、pattern のハンドラーに届くのは箱ごとの値です。

```ts
import { defineVariant, match } from "plgg";

const Copies = defineVariant("Copies")<number>();
const Missing =
  defineVariant("Missing")<string>();
type Count =
  | ReturnType<typeof Copies.make>
  | ReturnType<typeof Missing.make>;
const display = (count: Count): string =>
  match(count)(
    [Copies.pattern(), (b) => String(b.content)],
    [Missing.pattern(), (b) => b.content],
  );
console.log(
  display(Copies.make(3)),
  display(Missing.make("unknown")),
);
```

## 最後の分岐を置く場面

表示を二種類に分けるだけでよい場合は、個々の値すべてに名前を付ける必要はありません。下の例では予約可能な状態だけを選び、残りを一つの表示にまとめます。後から新しい状態を追加したら、既定の表示に入れてよいか見直してください。

```ts
import { match, otherwise } from "plgg";

const ready: "ready" = "ready";
type State = typeof ready | "lent" | "repair";
const label = (state: State): string =>
  match(state)(
    [ready, () => "Reserve"],
    [otherwise, () => "Unavailable"],
  );
console.log(label("repair"));
```
