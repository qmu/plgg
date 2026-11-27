# ページに図を載せる

手順と一緒に図を見せるには、Markdown のコードブロックに `plgg-flow` と書きます。次の図は入力を確認してから公開するまでの流れです。初期状態は HTML に描画されるので、JavaScript を無効にしても図を読めます。

```plgg-flow
node Draft at -180 0
node Review at 0 0
node Publish at 180 0
Draft -> Review
Review -> Publish
```

同じ図を自分のページに載せるには、下のブロックをコピーしてください。ノードの座標、ラベル、線の種類は [plgg-flow の DSL ガイド](https://plgg-flow.qmu.co.jp/guide/dsl/)に例があります。

~~~~markdown
```plgg-flow
node Draft at -180 0
node Review at 0 0
node Publish at 180 0
Draft -> Review
Review -> Publish
```
~~~~

## 図を列いっぱいに広げる

原稿の先頭に次の設定を置くと、図を主役にしたシートになります。`description` に操作の説明を添え、コードブロックの開始行を `plgg-flow fill dsl tools=routes,snap` に変えてください。図が広がり、ソース編集と、線の経路・グリッドの操作ができます。ページ上で試した変更を公開するには、原稿を編集してビルドします。

```yaml
---
layout: sheet
description: Move a node to see how its connections change.
---
```

シートでは最初の `fill` 付き部品の後に書いた本文は表示されません。操作の説明や関連ページへのリンクは図の前に置いてください。

組み込みの `plgg-diagram` はポートのあるノードの図に使えます。独自のコードブロックを追加する方法は[部品を登録する](/parts/)で紹介します。
