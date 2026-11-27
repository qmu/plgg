# plgg-view — 画面を値として組み立てる

`el` にはタグ名、属性、子要素を渡し、`text` で文字を置きます。`renderToString` で HTML を取り出せます。操作を受け付ける画面では、モデルから `view` を作り、メッセージを `update` に渡して次のモデルを決めます。[To-Do の実例](/packages/example/)で両方の描画方法を試せます。

```ts
import { el, renderToString, text } from "plgg-view";

console.log(renderToString(el("p", [], [text("A & B")])));
// <p>A &amp; B</p>
```
