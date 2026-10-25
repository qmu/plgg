# qmu/plgg#171 権限回復後の統合・公開・復旧の決定

決定日: 2026-10-25。状態: 提案（この PR のレビューで採否を決める）。
基準: origin/main `bba7ca80e45171dff6243b1e3ac61b768b9d741d`。
対象 issue: <https://github.com/qmu/plgg/issues/171>。

## 採用する方針

権限回復後、CI の Node 22/24 行列を独立 PR で先に成立させる。
候補 tarball、公開済み npm、個別の振る舞い、結果インデックスは異なる証拠として残す。
公開は全条件が揃ってから開発者が行い、失敗を成功扱いするゲート緩和はしない。
この変更自体はドキュメントのみで、workflow・npm・本番の変更を行わない。

既存の [qmu/plgg#199](https://github.com/qmu/plgg/pull/199) と目的が重なるため、
本記録を統合判断の参照先にすることを提案する。#199 の内容を並行して正本にせず、
本 PR 採用後に管理者が #199 を superseded として閉じる。
#199 の「全 gate の一本化を終えてから #171」という順序は採らない。
CI 行列は独立に復旧でき、先に Node 24 の実行証拠を得る方が後続の統合判断に役立つ。
既存 PR の close・merge・公開はこの作業では行わない。

作業を割り当てる際は plgg-dev の P90 が短い `gpt-6.1-sol` を選び、Claude への集中を避ける。
これは依頼者指定の実行方針であり、本記録は P90 を再計測したものではない。

## 既存 PR との照合

2026-10-25 に GitHub API で open PR 全 56 本の一覧と変更ファイルを取得した。
`.github/workflows/` を変える PR は 0 本。#171 は open、コメントは 0 件で、
権限回復済みである証拠はない。トークンの値や権限を推測して記録しない。
下表は実装の所在と採用方針であり、merge 済み・現時点の CI green を意味しない。

| PR（すべて qmu/plgg）                                                                                                                                                                                                                                                                                                                                                                                                        | 所有する条件                                                      | 決定・依存                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [#168](https://github.com/qmu/plgg/pull/168), [#176](https://github.com/qmu/plgg/pull/176), [#181](https://github.com/qmu/plgg/pull/181), [#182](https://github.com/qmu/plgg/pull/182), [#184](https://github.com/qmu/plgg/pull/184), [#185](https://github.com/qmu/plgg/pull/185), [#187](https://github.com/qmu/plgg/pull/187), [#197](https://github.com/qmu/plgg/pull/197), [#199](https://github.com/qmu/plgg/pull/199) | 条件・未充足・統合計画の記録                                      | 歴史資料。現在の統合判断は本記録へ集約                                                      |
| [#160](https://github.com/qmu/plgg/pull/160), [#162](https://github.com/qmu/plgg/pull/162), [#163](https://github.com/qmu/plgg/pull/163), [#169](https://github.com/qmu/plgg/pull/169)                                                                                                                                                                                                                                       | Node engine 下限、TS major 保留、TS6/7 分離、診断                 | workflow 権限なしで統合可能。TS6 を使う CLI と consumer TS7 の境界を保持                    |
| [#165](https://github.com/qmu/plgg/pull/165), [#173](https://github.com/qmu/plgg/pull/173), [#179](https://github.com/qmu/plgg/pull/179), [#189](https://github.com/qmu/plgg/pull/189), [#190](https://github.com/qmu/plgg/pull/190)                                                                                                                                                                                         | bundle 版上げ、反復 build、app consumer、library 宣言生成、移動先 | 振る舞いごとの固有 fixture を保持。最終修正を含む版番号を公開前に決める                     |
| [#178](https://github.com/qmu/plgg/pull/178), [#192](https://github.com/qmu/plgg/pull/192)                                                                                                                                                                                                                                                                                                                                   | Docker Node 24、実コンテナ起動                                    | この順に統合し起動確認。CI 行列とは別条件                                                   |
| [#191](https://github.com/qmu/plgg/pull/191)                                                                                                                                                                                                                                                                                                                                                                                 | 候補 27 tarball / 34 imports の隔離 consumer                      | 候補 family の正本。明示コマンドで実行し、公開済み registry の証明には転用しない            |
| [#174](https://github.com/qmu/plgg/pull/174), [#175](https://github.com/qmu/plgg/pull/175), [#177](https://github.com/qmu/plgg/pull/177), [#180](https://github.com/qmu/plgg/pull/180)                                                                                                                                                                                                                                       | plgg transpile、live plgg / plgg-md、coverage 記録                | #174 の固有 transpile 検査を残し、#175/#177 の live 検査も保持。#180 は coverage の参考資料 |
| [#183](https://github.com/qmu/plgg/pull/183), [#186](https://github.com/qmu/plgg/pull/186), [#195](https://github.com/qmu/plgg/pull/195), [#200](https://github.com/qmu/plgg/pull/200)                                                                                                                                                                                                                                       | packed test fixture、consumer、live engine/CLI、assertion 失敗    | すべてを同一検査とみなして閉じない。候補と live、成功・失敗の対照を保持                     |
| [#188](https://github.com/qmu/plgg/pull/188), [#194](https://github.com/qmu/plgg/pull/194), [#198](https://github.com/qmu/plgg/pull/198)                                                                                                                                                                                                                                                                                     | parser、fetch engine、router の固有動作                           | #191 の import smoke のみでは代替できないため保持                                           |
| [#193](https://github.com/qmu/plgg/pull/193)                                                                                                                                                                                                                                                                                                                                                                                 | stage/pack の安全な診断                                           | 公開手順の診断として保持                                                                    |
| [#201](https://github.com/qmu/plgg/pull/201) → [#202](https://github.com/qmu/plgg/pull/202) → [#203](https://github.com/qmu/plgg/pull/203) → [#204](https://github.com/qmu/plgg/pull/204)                                                                                                                                                                                                                                    | live 3 gate の index、重複拒否、generator version、実行前検証     | 左から統合し、各 dependent PR を main に retarget/rebase。候補 family artifact と混同しない |

その他の open PR は UI・Markdown 機能・依存更新・過去の記録等であり、#171 の実装を所有しない。
`check-all.sh` や同じ wrapper の変更は、各 merge 後に rebase して固有検査を落とさず整理する。
同じ install/build を機械的に重複実行する必要はないが、固有の失敗対照は削らない。

## 権限回復後に入れる workflow 変更

1. 管理者が workflow 更新権限の復旧を確認し、最新 origin/main から専用 work ブランチを作る。
   権限が戻っていなければ #171 にブロッカーを残し、公開を進めない。
2. `run-tests.yml` の `check-all` に `fail-fast: false`、
   `matrix.node: ["22.x", "24.x"]`、`node-version: ${{ matrix.node }}` を設定する。
   checkout/setup-node は両 workflow で v4 から v5 に更新する。
   hosted runner の対応要件は実装時に確認する。
3. `deploy-guide.yml` は Node `22.x` 単一ピンと既存 concurrency を維持する。
   publish を行うジョブを行列化しない。Node 24 への deploy 移行は別判断とする。
4. install と `check-all.sh` は既存の正本を呼ぶ。権限追加や検査スキップは混ぜない。
   両行列の実行 Node、終了状態、Node 20 action 警告の消失を実 run で確認する。
   v5 の action runtime と検査対象 Node は別であり、片方だけの更新では完了しない。
5. PR と main の同じ統合結果で両行列が成功した run URL / commit を #171 に残して閉じる。
   このドキュメント PR の merge だけでは #171 を閉じない。

## 公開ゲートと証拠

以下を順に満たす。実装がまだ main にないコマンドは該当 PR 統合後に使う。

1. 統合担当が最新 main で `scripts/npm-install.sh` と `scripts/check-all.sh` を実行する。
   `scripts/tsc-plgg.sh`、`scripts/test-plgg.sh` の成功と、CI 22/24 両行列の成功を残す。
   手元の一 package の成功だけを全リポジトリの成功としない。
2. Node 24 で `scripts/tsc-plgg.sh --public-consumer` を実行し、
   #191 の `.artifacts/public-consumer.json` の版、tarball SHA-256、Node/TS、gate 内容の版を保存する。
   これは候補 family の証拠で、live npm・CJS・NodeNext 全般の認証ではない。
3. bundle/parser/router/test の固有 fixture と失敗対照を統合した `check-all.sh` で検査する。
   CLI 内部 TS6 / consumer TS7 の実解決を維持する。
4. 開発者が `PREFLIGHT=1 ./scripts/publish-npm.sh` で公開対象をレビューする。
   #165 の提案版 0.0.7 を既に公開済みと仮定せず registry と照合する。
   #160 の engine 修正対象 plgg-cms / plgg-sql / plgg-auth / plgg-db-migration は
   版上げも必要。version 不変の merge だけでは npm の engine は直らない。
5. 開発者が `./scripts/publish-npm.sh` を実行する。エージェントは公開を代行しない。
   script の stage/pack/registry install/import/bin 検証を通す。
6. 公開後、Node 24 で #175/#177/#195 の live gate と
   `node scripts/runPublicGateIndex.ts` を実行し、3 行すべて pass、exit 0 を要求する。
   3 package の index を family 全体の公開証明と呼ばない。他 package も publisher の検証を残す。
   index は実行時の registry を再解決し、tarball digest を固定しないので、
   公開直後の版照合記録も別途残す。

#195 の PR 本文は plgg-test@0.0.5 の公開 CLI 失敗を報告している。
本作業で registry を再試験していないため現在の失敗とは断定しないが、
修正版の公開と live 再検証なしに qmu/plgg#172 を完了扱いにしない。
#191 は opt-in で、#201 の index も自動 CI 接続ではない。
CI green や PREFLIGHT 単独ではこの公開ゲートを満たさない。

## この決定記録の限界

既存 PR の本文・差分と現 main を照合したもので、全 PR の合成 rebase や
workflow 権限復旧、npm 公開、live registry gate、コンテナ起動は実行していない。
PR 本文の過去の検証結果は本作業の再実行結果と区別する。
リポジトリの CLAUDE.md が参照する workaholic gateway skill はこの環境に提供されていない。
この記録は追加の実装・公開権限を与えるものではない。
