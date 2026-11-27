# plgg-flow ガイド

図の元になる文章に、箱の名前と箱どうしの接続を書きます。下の図で中央の箱を動かしてみてください。矢印の両端は、移動した箱についてきます。

```plgg-flow
node 書く at -260 0 label "Markdown を書く"
node 描く at 0 0 label "ビルドで描く"
node 動かす at 260 0 label "ページで動かす"
書く -> 描く
描く -> 動かす "読み込み後"
```

自分で図を書くには、[DSL の構文](./guide/dsl.md)でノードと接続を一つずつ追加してください。位置を自動で決めたいときは[自動配置](./samples/layered.md)、数値や時間を表したいときは[グラフの選び方](./guide/charts.md)から始められます。

[図の実例](./guide/gallery.md)では、同じノードと接続で奥行き、入れ子、入力の合計を表します。図を自分の Markdown ページに載せる手順は [plggpress のガイド](https://plggpress.qmu.co.jp/sheets/)で読めます。

図から別の資料へ進むときも、このページを左に残して読めます。ライブラリの使い方は [plgg](https://plgg.qmu.co.jp/)、アプリの画面定義は [plggmatic](https://plggmatic.qmu.co.jp/)、コーディングエージェントの操作は [hrns](https://hrns.qmu.co.jp/) のガイドにあります。
