# plgg-ir-diagram

> Part of the [plgg monorepo](../../README.md).

図をテキストで記述し、plgg IR で参照と型を検査する。plggpress の Markdown では次のフェンスが操作可能な図になる。

````markdown
```plgg-diagram
diagram orders {
  group shop "店舗" {
    node cart "カート" { out submit: Order }
  }
  node api "受注 API" { in receive: Order }
  edge checkout: cart.submit -> api.receive "注文を送る"
}
```
````

- `node` と `group` は図全体で一意の ID を持つ。表示名を省くと ID を表示する。グループは入れ子にできる。
- `cart -> api` はノード間の接続。`cart.submit -> api.receive` は出力ポートと入力ポートの接続。両端のポートを指定したときは型名を照合する。宣言より前の参照も使える。
- `edge checkout:` を省くと両端から接続 ID を生成する。同じ両端に複数の線を引くときは、それぞれに ID を付ける。
- `compileDiagram(source)` は成功時に図の ID、ノード、エッジ、正規 IR を返す。正規 IR も同じ関数で読み込める。失敗時は診断の配列を返し、各診断の `range` が原文の該当箇所を示す。

埋め込み図の「平面」「立体」で同じ図の視点を切り替える。「図のソース」で編集すると最後に検査を通った図を表示し、診断を押すとエラー箇所を選択する。変更を公開するには Markdown を編集して再ビルドする。

実際にビルドされる例は [受注フローの Markdown](../plgg-flow-example/markdown/index.md) にある。
