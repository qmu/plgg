# qmu/plgg#171 権限回復後の統合・公開・復旧の決定

決定日: 2026-10-25（同日中に #209・#210・#211 の追加を反映して更新）。
状態: 提案（この PR のレビューで採否を決める）。
基準: origin/main `bba7ca80e45171dff6243b1e3ac61b768b9d741d`（更新時点でも変化なし）。
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

2026-10-25 に GitHub API で open PR 全 60 本の一覧と変更ファイルを再取得した。
先の採録（56 本）は #205・#207・#208 を取り落としていた
（#205 は本記録と同日 1 秒差で並行作成され、#207・#208 は本記録の採録後に作られた）。
同日中に #209・#210・#211 が新たに開かれたため、open PR 全 63 本で再照合した
（#209 は #205 の head ブランチ `work-1025-node24-ci-evidence` に積まれ、main 未着地。
#210・#211 は base main）。origin/main は依然 `bba7ca80` で変化なし。
`.github/workflows/` を変える PR は #209・#210・#211 を含めても依然 0 本。
#171 は open、コメントは 0 件で、権限回復済みである証拠はない。
トークンの値や権限を推測して記録しない。
下表は実装の所在と採用方針であり、merge 済み・現時点の CI green を意味しない。

| PR（すべて qmu/plgg）                                                                                                                                                                                                                                                                                                                                                                                                        | 所有する条件                                                      | 決定・依存                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [#168](https://github.com/qmu/plgg/pull/168), [#176](https://github.com/qmu/plgg/pull/176), [#181](https://github.com/qmu/plgg/pull/181), [#182](https://github.com/qmu/plgg/pull/182), [#184](https://github.com/qmu/plgg/pull/184), [#185](https://github.com/qmu/plgg/pull/185), [#187](https://github.com/qmu/plgg/pull/187), [#197](https://github.com/qmu/plgg/pull/197), [#199](https://github.com/qmu/plgg/pull/199) | 条件・未充足・統合計画の記録                                      | 歴史資料。現在の統合判断は本記録へ集約                                                      |
| [#160](https://github.com/qmu/plgg/pull/160), [#162](https://github.com/qmu/plgg/pull/162), [#163](https://github.com/qmu/plgg/pull/163), [#169](https://github.com/qmu/plgg/pull/169)                                                                                                                                                                                                                                       | Node engine 下限、TS major 保留、TS6/7 分離、診断                 | workflow 権限なしで統合可能。TS6 を使う CLI と consumer TS7 の境界を保持                    |
| [#165](https://github.com/qmu/plgg/pull/165), [#173](https://github.com/qmu/plgg/pull/173), [#179](https://github.com/qmu/plgg/pull/179), [#189](https://github.com/qmu/plgg/pull/189), [#190](https://github.com/qmu/plgg/pull/190), [#211](https://github.com/qmu/plgg/pull/211) | bundle 版上げ、反復 build、app consumer、library 宣言生成、移動先、2 回目起動の公開検証 | 振る舞いごとの固有 fixture を保持。最終修正を含む版番号を公開前に決める。#211 は `--help` だけだった検証を実インストール済み consumer の 2 回起動に広げ、`ERR_FS_EISDIR` を拒否する。relocate.mjs 自体は main 5b109cec で既に削除済みで、#211 はそれを再導入しない |
| [#178](https://github.com/qmu/plgg/pull/178), [#192](https://github.com/qmu/plgg/pull/192)                                                                                                                                                                                                                                                                                                                                   | Docker Node 24、実コンテナ起動                                    | この順に統合し起動確認。CI 行列とは別条件                                                   |
| [#191](https://github.com/qmu/plgg/pull/191)                                                                                                                                                                                                                                                                                                                                                                                 | 候補 27 tarball / 34 imports の隔離 consumer                      | 候補 family の正本。明示コマンドで実行し、公開済み registry の証明には転用しない            |
| [#174](https://github.com/qmu/plgg/pull/174), [#175](https://github.com/qmu/plgg/pull/175), [#177](https://github.com/qmu/plgg/pull/177), [#180](https://github.com/qmu/plgg/pull/180)                                                                                                                                                                                                                                       | plgg transpile、live plgg / plgg-md、coverage 記録                | #174 の固有 transpile 検査を残し、#175/#177 の live 検査も保持。#180 は coverage の参考資料 |
| [#183](https://github.com/qmu/plgg/pull/183), [#186](https://github.com/qmu/plgg/pull/186), [#195](https://github.com/qmu/plgg/pull/195), [#200](https://github.com/qmu/plgg/pull/200)                                                                                                                                                                                                                                       | packed test fixture、consumer、live engine/CLI、assertion 失敗    | すべてを同一検査とみなして閉じない。候補と live、成功・失敗の対照を保持                     |
| [#188](https://github.com/qmu/plgg/pull/188), [#194](https://github.com/qmu/plgg/pull/194), [#198](https://github.com/qmu/plgg/pull/198), [#210](https://github.com/qmu/plgg/pull/210) | parser、fetch engine、router、sql の固有動作                      | #191 の import smoke のみでは代替できないため保持。#210 は `plgg-sql` に専用の packed consumer ゲート（パラメータ結合、注入様式文字列、ESM/CJS、forged-brand 拒否）を追加し、同族で唯一欠けていた package を埋める |
| [#193](https://github.com/qmu/plgg/pull/193)                                                                                                                                                                                                                                                                                                                                                                                 | stage/pack の安全な診断                                           | 公開手順の診断として保持                                                                    |
| [#201](https://github.com/qmu/plgg/pull/201) → [#202](https://github.com/qmu/plgg/pull/202) → [#203](https://github.com/qmu/plgg/pull/203) → [#204](https://github.com/qmu/plgg/pull/204) → [#205](https://github.com/qmu/plgg/pull/205) → [#209](https://github.com/qmu/plgg/pull/209) | live 3 gate の index、重複拒否、generator version、実行前検証、Node24 CI 証拠の埋め込み、artifact パス境界の安全化 | 左から統合し、各 dependent PR を main に retarget/rebase。候補 family artifact と混同しない。#205 の `complete: true` は埋め込み Node24 CI 証拠と local gate 両方を要求し、#201 単体の「local gate 全 pass」を公開十分条件にしない。#209 は #205 の head ブランチに積まれ、親の未解決パス（`../`・絶対パス・NUL 等）を読み込み前に拒否する。#205 を先に main へ retarget/merge してから #209 を retarget する |
| [#207](https://github.com/qmu/plgg/pull/207)                                                                                                                                                                                                                                                                                                                                                                                 | `.artifacts/node24-ci-blocker.json` への権限拒否ブロッカー永続化  | workflow 権限なしで統合可能。記録専用で workflow・npm・本番を変更しない。#171 の未解消を機械判読できる形で残すが、ライブの権限検査ではない。権限回復後、下記「権限回復後に入れる workflow 変更」が完了したらこの artifact を退役させる |
| [#208](https://github.com/qmu/plgg/pull/208)                                                                                                                                                                                                                                                                                                                                                                                 | `node scripts/node24Workflows.ts --check\|--write` による生成・適用の単一入口 | workflow 権限なしで統合可能（workflow ファイル自体はこの PR では変更しない）。この記録の作成時点で `.github/workflows/run-tests.yml`・`deploy-guide.yml` の SHA-256 は #208 が固定した `before` ハッシュと一致しており、権限回復後はこの PR 統合後に `--write` を使う。手編集はしない |

その他の open PR は UI・Markdown 機能・依存更新・過去の記録等であり、#171 の実装を所有しない。
`check-all.sh` や同じ wrapper の変更は、各 merge 後に rebase して固有検査を落とさず整理する。
同じ install/build を機械的に重複実行する必要はないが、固有の失敗対照は削らない。

## 権限回復後に入れる workflow 変更

1. 管理者が workflow 更新権限の復旧を確認し、#207・#208 を main に統合してから
   最新 origin/main から専用 work ブランチを作る。
   権限が戻っていなければ #171 と `.artifacts/node24-ci-blocker.json` をそのまま残し、公開を進めない。
2. そのブランチで `node scripts/node24Workflows.ts --check` を実行し、
   両 workflow が `pending`（未適用）であることを確認してから `--write` を実行する。
   `run-tests.yml` の `check-all` が `fail-fast: false`・
   `matrix.node: ["22.x", "24.x"]`・`node-version: ${{ matrix.node }}` になり、
   checkout/setup-node が両 workflow で v4 から v5 に更新される。
   生成結果が #208 の固定 `after` ハッシュと一致することをスクリプトの終了コードで確認する。
   手編集はしない。ハッシュ不一致（workflow drift）で止まったら、
   #208 の pin を現在の workflow に合わせて更新するまで `--write` を使わない。
3. `deploy-guide.yml` は Node `22.x` 単一ピンと既存 concurrency を維持する
   （#208 の生成でも publish ジョブは行列化されない）。Node 24 への deploy 移行は別判断とする。
4. install と `check-all.sh` は既存の正本を呼ぶ。権限追加や検査スキップは混ぜない。
   両行列の実行 Node、終了状態、Node 20 action 警告の消失を実 run で確認する。
   v5 の action runtime と検査対象 Node は別であり、片方だけの更新では完了しない。
5. PR と main の同じ統合結果で両行列が成功した run URL / commit を #171 に残して閉じ、
   `.artifacts/node24-ci-blocker.json` を削除するコミットを同じ PR に含める
   （ブロッカーが解消したのに記録だけ残すと次の統合担当が誤読する）。
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
   #211 が追加する 2 回目起動の公開検証（`check-all.sh` 経由）も
   `PREFLIGHT=1` の対象に含め、`--help` のみの旧検証結果を 0.0.7 の公開十分条件にしない。
   #160 の engine 修正対象 plgg-cms / plgg-sql / plgg-auth / plgg-db-migration は
   版上げも必要。version 不変の merge だけでは npm の engine は直らない。
5. 開発者が `./scripts/publish-npm.sh` を実行する。エージェントは公開を代行しない。
   script の stage/pack/registry install/import/bin 検証を通す。
6. 公開後、Node 24 で #175/#177/#195 の live gate と
   `node scripts/runPublicGateIndex.ts` を実行し、3 行すべて pass、exit 0 を要求する。
   3 package の index を family 全体の公開証明と呼ばない。他 package も publisher の検証を残す。
   index は実行時の registry を再解決し、tarball digest を固定しないので、
   公開直後の版照合記録も別途残す。
   #205 統合後は local gate の pass だけでは `complete: true` にならず、
   実際の qmu/plgg Actions run URL を指す Node24 CI 証拠（または #171 への
   permission-wait の明示）を index に埋め込む必要がある。統合担当がこの証拠を
   手で確認して埋め込む。ツール自身は GitHub の結果を取得・認証しない。

#195 の PR 本文は plgg-test@0.0.5 の公開 CLI 失敗を報告している。
本作業で registry を再試験していないため現在の失敗とは断定しないが、
修正版の公開と live 再検証なしに qmu/plgg#172 を完了扱いにしない。
#191 は opt-in で、#201 の index も自動 CI 接続ではない。
CI green や PREFLIGHT 単独ではこの公開ゲートを満たさない。

## 失敗時の停止・戻し方

| 失敗の位置                             | 担当と処置                                                                                                                                                                                                            | 再開条件                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| workflow push が権限拒否               | 統合担当は push を反復せず #171 を open のまま管理者へ通知。通常コードの統合と分ける                                                                                                                                  | 管理者による権限復旧                                                            |
| PR の 22/24 行列、action 更新          | 統合担当は merge を止める。main 後の回帰なら該当 workflow 変更だけを revert PR にする（merge commit は first-parent を確認して `git revert -m 1 <merge-sha>`、squash は `git revert <sha>`）。main へ直接 push しない | 修正または revert の検証成功。24 を撤去したら #171 を再 open                    |
| 候補 gate / fixture                    | 公開を止め、失敗した package と理由を保存。原因 PR のみを戻すか修正し、依存 PR を再検証                                                                                                                               | 新しい統合 SHA の全ゲート成功。以前の成功 artifact を流用しない                 |
| index の generator 不一致・壊れた JSON | 旧 artifact を上書きせず保管。新しい出力パスで現 generator を実行する。単に version を書き換えない                                                                                                                    | 正しい generator/schema、重複なし、3 行 pass、exit 0                            |
| npm 公開の途中・公開後の不具合         | 開発者が後続 publish を止め、実際に出た版と未公開分を registry で照合。npm の同じ version は再利用せず、修正版を新しい version で公開する。必要なら開発者が影響版の deprecate / dist-tag を判断                       | 修正候補の検証、publisher 検証、live 再検証。git revert だけでは npm は戻らない |
| guide deploy 回帰                      | deploy 担当が後続 deploy を止め、最後に成功した commit を既存 Worker の単一 publish 経路で再配備する。Pages を同時に有効化しない                                                                                      | 既知の正常版の表示・配信確認。npm と guide の復旧は分ける                       |
| `node24Workflows.ts --write` がドリフトで失敗 | 統合担当は書き込みを強制せず、#208 の pin ハッシュと実際の workflow ファイルの差分を確認する。差分が意図した先行変更ならピンを更新する PR を先に出す                                                                   | 更新済み pin が現在の workflow と一致し、`--check` が `pending` を正しく報告する |

revert の前後 SHA、原因、検証結果、復旧 PR/run URL を統合担当が残す。
秘密の値・生の認証出力は保存しない。fail-fast の有効化、continue-on-error、
Node 24 の静かな削除、失敗 index の手編集で公開を通さない。

## この決定記録の限界

既存 PR の本文・差分と現 main を照合したもので、全 PR の合成 rebase や
workflow 権限復旧、npm 公開、live registry gate、コンテナ起動は実行していない。
PR 本文の過去の検証結果は本作業の再実行結果と区別する。
この更新では `sha256sum .github/workflows/run-tests.yml .github/workflows/deploy-guide.yml`
を現 main で再実測し、#208 の `scripts/node24Workflows.ts` に固定された `before` ハッシュ
（run-tests.yml: `ddcbcfe2...`、deploy-guide.yml: `e8957f06...`）とそれぞれ完全一致することを
ソースファイルを直接読んで確認した（前回更新時点から origin/main のコミットは変化なし）。
一致が崩れたら #208 のピンを更新するまで `--write` を使わない。
この更新でも npm registry への live アクセスは行っていない。
「公開ゲートと証拠」の registry 照合はすべて開発者が実行する将来の手順であり、
本記録の作成・更新作業自体は npm view 等で現在の公開版を再確認していない。
リポジトリの CLAUDE.md が参照する workaholic gateway skill はこの環境に提供されていない。
この記録は追加の実装・公開権限を与えるものではない。
