# パッケージの境界を読む

本棚の題名が正しいかを調べるのに、HTTP のリクエストも DB 接続も要りません。不在、失敗、タグ付きの値、関数の合成は plgg 本体にあります。HTTP のステータスのように、その分野で初めて意味を持つ値は専用のパッケージに置きます。たとえば plgg-server と plgg-fetch はともに plgg-http の応答を扱います。クライアントからサーバー実装を読み込む必要はありません。

図の矢印は「左が右を使う」という向きです。画面と図に関係する依存だけを抜き出しました。

```plgg-flow
node plggpress at -260 -90
node plggmatic at -40 -90
node plgg-view at 190 -90
node plgg-ir-diagram at -260 40
node plgg-flow at -40 40
node plgg-board at 190 90
plggpress -> plggmatic
plggpress -> plgg-ir-diagram
plggmatic -> plgg-view
plgg-ir-diagram -> plgg-flow
plgg-flow -> plgg-board
plgg-flow -> plgg-view
```

## ボタン、図、ページはどこで直すか

サイトをまたいでボタンの見た目を変えるなら plggmatic を直します。CLAUDE.md は共通部品をここで一度だけ作ると定めています。`1e765915` では plggpress のサイト枠もこの部品に移りました。原稿やリンクをページにまとめる処理は plggpress に残ります。図については、座標の投影は plgg-board、節点と辺の描画・操作は plgg-flow、原稿のポートや接続先の検証は plgg-ir-diagram が担います。線の引き方を変えても、原稿の言語規則を変える必要はありません。

## 新しい処理を本体に戻す前に

`.workaholic/constraints/architecture.md` には、ベンダーや AI 固有の事情を基礎型に持ち込まず、層ごとに版を上げられるようにするという理由が明記されています。実際に plgg-kit はモデルの呼び分けを、plgg-foundry は登録済みの操作の計画と実行を引き受けます。本体はどちらにも依存しません。

そこから先は現在の依存関係からの推測です。処理の説明に「ポート」「列名」「保存先」が欠かせなければ、まずそれを扱うパッケージが候補です。二つのアプリで使うという理由だけで本体に入れると、本体の利用者までその分野の型に依存します。HTTP モデルのように、利用側どうしが共有する小さなパッケージに置く手もあります。[用途別の一覧と直接の依存先](/packages/)で実際の境界を確かめられます。
