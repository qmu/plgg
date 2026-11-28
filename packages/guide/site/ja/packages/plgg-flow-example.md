# plgg-flow-example — 図を原稿から試す

図をライブラリに組み込む前に、[作例集](https://plgg-flow.qmu.co.jp/)で DSL の入力と描画結果を見比べられます。markdown と markdown-en に原稿があります。`src/examples.spec.ts` はサイドバーから作例を探し、フェンスの本文を `parseSpec` に渡して実際に節点と接続を調べます。図を追加したら `npm test` で作例として読み込まれることを確認し、`npm run build` でサイトを生成します。
