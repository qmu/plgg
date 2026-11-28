# plgg-ir-diagram — 図の参照と型を検証する

`compileDiagram` はノード、ポート、辺をテキストから読み取ります。接続先の名前やポートの型を検査してから図のデータを返します。Markdown での使い方は [plggpress の図の埋め込み](https://plggpress.qmu.co.jp/sheets/)、操作できる図の例は [plgg-flow](https://plgg-flow.qmu.co.jp/) を参照してください。

## 使い方と制約

`compileDiagram(source: string)`

ポート名を一文字変えると、その参照位置に診断が付きます。入力側と出力側の型が違う接続や重複した節点も検出します。描画前に一度コンパイルし、成功したグラフを表示側に渡します。

```ts
import { compileDiagram } from "plgg-ir-diagram";

console.log(
  compileDiagram("diagram shelf { node book }")
    .__tag,
);
console.log(
  compileDiagram(
    "diagram shelf { node book node book }",
  ).__tag,
);
```

## 診断が指す文字列を取り出す

入力の何行目かだけでなく、どのポート名を書き間違えたかを示せます。下の図で宣言した入力ポートは receive ですが、辺は recv を指しています。診断の offset を元の文字列に適用してください。正規化した ir は空白の位置が変わるので、そのまま同じ範囲を使えません。

```ts
import { compileDiagram } from "plgg-ir-diagram";

const source =
  "diagram shop { a.send -> b.recv node a { out send: Order } node b { in receive: Order } }";
const r = compileDiagram(source);
if (r.__tag === "Err")
  console.log(
    r.content.map((d) =>
      source.slice(
        d.range.start.offset,
        d.range.end.offset,
      ),
    ),
  );
```
