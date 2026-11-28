# 用途からパッケージを選ぶ

共通の型や関数は [plgg 本体](/packages/plgg/)にあります。アプリケーションで使うパッケージは、目的に合わせて次の一覧から選んでください。

## 画面と HTTP

- [plgg-http](/packages/plgg-http/) — HTTP の応答を作る
- [plgg-server](/packages/plgg-server/) — リクエストをハンドラーに渡す
- [plgg-fetch](/packages/plgg-fetch/) — HTTP の応答を読み取る
- [plgg-router](/packages/plgg-router/) — URL から項目を読み取る
- [plgg-view](/packages/plgg-view/) — 画面を値として組み立てる
- [example](/packages/example/) — To-Do アプリを動かす

## データと認証

- [plgg-sql](/packages/plgg-sql/) — SQL とパラメーターを組み立てる
- [plgg-db-migration](/packages/plgg-db-migration/) — スキーマの変更を適用する
- [plgg-auth](/packages/plgg-auth/) — ログインを組み込む
- [plgg-cms](/packages/plgg-cms/) — コンテンツを配信・管理する

## 言語と文書

- [plgg-parser](/packages/plgg-parser/) — 小さなパーサーを組み合わせる
- [plgg-md](/packages/plgg-md/) — Markdown から本文と見出しを取り出す
- [plgg-highlight](/packages/plgg-highlight/) — コードブロックに色を付ける
- [plgg-ir-syntax](/packages/plgg-ir-syntax/) — S 式を読み書きする
- [plgg-ir-language](/packages/plgg-ir-language/) — 言語の構文に意味を与える
- [plgg-ir-manifest](/packages/plgg-ir-manifest/) — ドメインの宣言を検証する
- [plgg-ir-thesis](/packages/plgg-ir-thesis/) — 主張と関係を検証する
- [plgg-ir-thesis-proof](/packages/plgg-ir-thesis-proof/) — 論証の反例を読む
- [plgg-ir-diagram](/packages/plgg-ir-diagram/) — 図の参照と型を検証する

## モデルとツール

- [plgg-kit](/packages/plgg-kit/) — モデルに構造化出力を依頼する
- [plgg-token-metering](/packages/plgg-token-metering/) — トークン数と費用を見積もる
- [plgg-foundry](/packages/plgg-foundry/) — 依頼から操作の順序を決める
- [plgg-mcp](/packages/plgg-mcp/) — ツールを MCP で公開する
- [plgg-cli](/packages/plgg-cli/) — コマンドの引数を検証する
- [plgg-bundle](/packages/plgg-bundle/) — ライブラリをビルドする
- [plgg-test](/packages/plgg-test/) — テストを実行する

## 描画と関連サイト

- [plgg-board](/packages/plgg-board/) — 座標を画面に投影する
- [plgg-flow](/packages/plgg-flow/) — 操作できる図を描く
- [plggmatic](/packages/plggmatic/) — 画面の部品を選ぶ
- [plggpress](/packages/plggpress/) — Markdown のサイトを作る

コーディングエージェント hrns の使い方は [hrns のガイド](https://hrns.qmu.co.jp/)にあります。

## ワークスペース内の依存先

左のパッケージが実行時の依存関係として宣言しているものを右に示します。開発時だけ使うビルド・試験ツールは含みません。

| パッケージ | 直接の依存先 |
| --- | --- |
| [example](/packages/example/) | plgg, plgg-view, plgg-router, plgg-server |
| [guide](/packages/guide/) | plggpress |
| [plgg](/packages/plgg/) | — |
| [plgg-auth](/packages/plgg-auth/) | plgg, plgg-http, plgg-server, plgg-sql, plgg-db-migration |
| [plgg-board](/packages/plgg-board/) | plgg |
| [plgg-bundle](/packages/plgg-bundle/) | — |
| [plgg-cli](/packages/plgg-cli/) | plgg |
| [plgg-cms](/packages/plgg-cms/) | plgg, plgg-auth, plgg-db-migration, plgg-http, plgg-kit, plgg-mcp, plgg-md, plgg-server, plgg-sql, plgg-view, plggpress |
| [plgg-db-migration](/packages/plgg-db-migration/) | plgg, plgg-sql |
| [plgg-fetch](/packages/plgg-fetch/) | plgg, plgg-http |
| [plgg-flow](/packages/plgg-flow/) | plgg, plgg-board, plgg-view |
| [plgg-flow-example](/packages/plgg-flow-example/) | plgg, plgg-board, plgg-flow, plgg-view, plgg-ir-diagram |
| [plgg-foundry](/packages/plgg-foundry/) | plgg, plgg-kit |
| [plgg-highlight](/packages/plgg-highlight/) | plgg, plgg-md, plgg-parser, plgg-view |
| [plgg-http](/packages/plgg-http/) | plgg |
| [plgg-ir-diagram](/packages/plgg-ir-diagram/) | plgg, plgg-ir-syntax, plgg-ir-language, plgg-parser, plgg-view, plgg-flow, plgg-board, plggmatic |
| [plgg-ir-language](/packages/plgg-ir-language/) | plgg, plgg-ir-syntax |
| [plgg-ir-manifest](/packages/plgg-ir-manifest/) | plgg, plgg-ir-syntax, plgg-ir-language |
| [plgg-ir-syntax](/packages/plgg-ir-syntax/) | plgg, plgg-parser |
| [plgg-ir-thesis](/packages/plgg-ir-thesis/) | plgg, plgg-ir-syntax, plgg-ir-language |
| [plgg-ir-thesis-proof](/packages/plgg-ir-thesis-proof/) | plgg, plgg-ir-syntax, plgg-ir-language, plgg-ir-thesis |
| [plgg-kit](/packages/plgg-kit/) | plgg |
| [plgg-mcp](/packages/plgg-mcp/) | plgg |
| [plgg-md](/packages/plgg-md/) | plgg, plgg-parser, plgg-view |
| [plgg-parser](/packages/plgg-parser/) | plgg |
| [plgg-router](/packages/plgg-router/) | plgg |
| [plgg-server](/packages/plgg-server/) | plgg, plgg-http, plgg-view |
| [plgg-sql](/packages/plgg-sql/) | plgg |
| [plgg-test](/packages/plgg-test/) | plgg |
| [plgg-token-metering](/packages/plgg-token-metering/) | plgg |
| [plgg-view](/packages/plgg-view/) | plgg |
| [plggmatic](/packages/plggmatic/) | plgg, plgg-ir-language, plgg-ir-manifest, plgg-ir-syntax, plgg-view |
| [plggmatic-example](/packages/plggmatic-example/) | plgg, plgg-view, plggmatic |
| [plggpress](/packages/plggpress/) | plgg, plgg-kit, plggmatic, plgg-http, plgg-server, plgg-view, plgg-md, plgg-highlight, plgg-cli, plgg-bundle, plgg-ir-diagram |
