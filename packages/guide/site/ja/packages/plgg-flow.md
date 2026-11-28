# plgg-flow — 操作できる図を描く

plgg-flow は位置を持つノードと辺を描画します。`plgg-flow-example` は図を記述したソースと描画結果を並べた作例集です。[図のガイド](https://plgg-flow.qmu.co.jp/guide/dsl/)でノードを一つ動かし、接続線の変化を確かめられます。

## 使い方と制約

`parseSpec(source: string) → Result<Spec, string>`

plgg-flow/dsl の `parseSpec` はテキストを図の仕様に変換します。辺の両端にだけ出てくる名前も節点になります。`specFlow` で配置用の状態に変換し、`printSpec` には図と規則を渡して再びテキストにできます。名前、接続、手で固定した位置を区別しておくと編集後も図を読み直せます。

```ts
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";

const diagram = parseSpec("Reader -> Shelf");
if (diagram.__tag === "Ok")
  console.log(
    printSpec(
      specFlow(diagram.content),
      diagram.content.rules,
    ),
  );
```

## 手で置く点と自動で並べる点

工程表では全体を自動で段組みし、説明に使う一点だけ座標を固定することがあります。次の図は入力、確認、出力の順に辺を結び、確認の位置だけを指定します。再編集するなら描画結果の座標の写しよりも、規則と固定位置を含む DSL を保存する方が意図を保てます。

```ts
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";

const source = [
  "layout layered down depth",
  "Input -> Review",
  "Review -> Output",
  "node Review at 17 19",
].join("\n");
const spec = parseSpec(source);
if (spec.__tag === "Ok")
  console.log(
    specFlow(spec.content).nodes.map((n) => n.id),
  );
```
