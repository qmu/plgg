# Node 24 / TypeScript 7 — #155〜#158 を閉じた後も残る互換性条件

2026-10-24 時点、`main` (bba7ca80) と、下記の未マージ PR を読んだ上での整理。
コードは変更していない — 分類と実装順の設計のみ。

## 読んだもの

- Issue: [#155](https://github.com/qmu/plgg/issues/155)（plgg-bundle npm 版、2 回目起動で EISDIR）、
  [#156](https://github.com/qmu/plgg/issues/156)（同、利用側の TypeScript 7 を掴んで transpile できない）、
  [#157](https://github.com/qmu/plgg/issues/157)（plgg-view の描画バッチ・lazy）、
  [#158](https://github.com/qmu/plgg/issues/158)（plgg-view の SVG 要素・raw の作り直し）
- PR（オープン）: [#160](https://github.com/qmu/plgg/pull/160)（node:sqlite 4 パッケージの engines.node floor）、
  [#162](https://github.com/qmu/plgg/pull/162)（dependabot に typescript major の ignore）、
  [#163](https://github.com/qmu/plgg/pull/163)（TS6/7 split-version invariant の gate）、
  [#165](https://github.com/qmu/plgg/pull/165)（plgg-bundle 0.0.6→0.0.7、npm consumer gate、Fixes #156）
- PR（マージ済み、TypeScript 7 移行本体）: #114〜#118、および dependabot の素の major bump #112（#117 に supersede され close）
- `.workaholic/missions/archive/typescript-7-migration/mission.md` と、そこから分岐した 2 件の
  deferred concern（`.workaholic/feedbacks/20260813043753-*.md` 2 本）
- `docs/typescript-7-api-gap.md`（API ギャップの実測、split-version 採用の根拠）
- CI: `.github/workflows/run-tests.yml`、`.github/workflows/deploy-guide.yml`、`scripts/check-all.sh`
- `main` 上の現物: 30 manifest の `typescript` 欄、3 パッケージの `engines` 欄、`.github/dependabot.yml`

## #155〜#158 が閉じた後の状態

| Issue | 閉じる手段 | 閉じた後に Node 24 / TypeScript 7 の互換性に残るもの |
| --- | --- | --- |
| #155 (EISDIR) | PR #165 の 0.0.6→0.0.7 publish（`bin/relocate.mjs` 自体は 5b109cec で既に `main` から削除済み。npm の `0.0.6` tarball だけが未 publish のまま古い） | 「公開した」と「版を上げて publish した」が同じ意味になる保証が無い（下記 F） |
| #156 (TS7 を掴む) | 同上。self-bundled dist が根治しており、0.0.7 で初めて npm に届く | plgg-bundle 用の回帰ゲートは #165 で付くが、同形の `typescript` ランタイム依存を持つ `plgg-test` には同じゲートが無い（下記 C） |
| #157 (描画バッチ/lazy) | plgg-view 側の別実装待ち | **Node 24 / TypeScript 7 の互換性条件とは無関係**（下記参照） |
| #158 (SVG raw) | 同上 | 同上、無関係 |

**#157・#158 は分類の対象外。** どちらも plgg-view の描画性能・DOM 構造の issue で、
`typescript` のバージョン、`engines.node`、CI の Node バージョンのいずれにも触れない。
閉じても split-version invariant・Node floor・CI 行列のどれも変化しない。

**#155・#156 は PR #165 がマージされ、かつ人が `./scripts/publish-npm.sh` を実行して初めて
corpd から見て解決する。** PR 本文が明記する通り、`npm publish` は
`.workaholic/deployments/npm.md` の方針でエージェントが代行してはならない developer-driven な
手順であり、マージだけでは閉じない。

## 残る互換性条件（分類）

### A. CI は Node 24 を一度も実行しない

`run-tests.yml`・`deploy-guide.yml` はどちらも `node-version: "22.x"` に固定。開発ホストは
v24.13.1、`@types/node` は `^26.x`（#116 以降）なのに、「Node 24 で動く」という主張を
一度も検証していない。PR #160 と #162 がどちらも独立にこれを follow-up として名指しし、
どちらも同じ理由で着手できなかった: 書いた `fail-fast: false` の `["22.x", "24.x"]` 行列
パッチを push しようとして `refusing to allow a GitHub App to create or update workflow
.github/workflows/run-tests.yml` で拒否された（`corpd-6fad92[bot]` の token に
`workflows` 権限が無い）。PR #160 の CI run はさらに `actions/checkout@v4` /
`actions/setup-node@v4` が Node 20 ランタイム対象だとして強制的に Node 24 で動かされている
という deprecation 警告も出している。
**#155〜#158 のどれを閉じても、この行は変わらない。** 必要なのは `workflows` 権限を持つ
token か人の手での 1 ファイル変更であり、エージェントの作業手順の問題ではない。

### B. split-version invariant の強制は「版番号」止まりで「API の有無」まで見ていない

PR #163 の `gate-typescript-split.sh` は全 manifest を grep して
「`dependencies.typescript` は `^6.x`、`devDependencies.typescript` は `^7.x`」を機械的に
確認する。これは #162（dependabot の major ignore）と対になって、**版がずれること**は
防ぐ。しかし split-version が存在する理由そのもの —
`transpileModule`/`preProcessFile` が TS7 の安定版に存在しない — は、どの gate も検査
しない。`docs/typescript-7-api-gap.md` の「Final outcome」に書かれている
「The pin is re-evaluated at every TS 7.x minor」は feedback ファイル
(`20260813043753-scanner-route-for-dropping-ts6-entirely.md`) に記録された**人間が
思い出して行う**作業であり、どの gate にも、どの CI にも接続されていない。将来 TS7 の
あるマイナーが file-level transpile API を追加しても、逆に TS6 のパッチが
`transpileModule` を削っても、`gate-typescript-split.sh` は気づかない。

### C. npm consumer 向けの回帰ゲートが `plgg-bundle` だけで `plgg-test` には無い

PR #165 の `gate-bundle-npm-consumer.sh` は #156 とまったく同じ事故
（consumer の TypeScript 7 が nested TypeScript 6 より先に解決される）を
`plgg-bundle` について再現・固定する。ところが `packages/plgg-test/package.json` は
`dependencies.typescript: "^6.0.3"` を持ち、`src/Resolve/hook.ts` で
`transpileModule` を使う — **形も原因もまったく同じ構造**を持つ 2 番目の
runtime 依存パッケージである。`plgg-test` を `npm i -D plgg plgg-test` して
`typescript@7` を自分の devDependency に持つ利用者が同じ nested-resolution 事故に
当たる経路は、#165 のどの gate にも塞がれていない。

### D. `engines.node` の gate は `node:sqlite` だけに特化しており一般化されていない

PR #160 の `gate-node-support.sh` は「`node:sqlite` を import するパッケージは
`engines.node >= 22.13` を宣言する」という 1 本の規則だけを検査する。これは
現時点で正しい（唯一の Node バージョン依存 API が `node:sqlite` だから）。しかし
将来別のパッケージが別の Node バージョン限定 API（例: Node 24 固有の機能）を使い始めた
場合、それを検出する一般的な「`engines.node` は実際に使っている API の要求と一致する」
gate は存在しない。現状は issue 化されていない潜在的ギャップ。

### E. `.workaholic/specs/infrastructure.md` が現状と矛盾した記述を残している

229 行目: 「No `.nvmrc`, `.node-version`, or `engines` field in any `package.json`」
——これは `main` の時点で既に誤り（`plgg-auth`・`plgg-db-migration`・`plgg-test` が
`engines` を持つ）で、PR #160 がマージされればさらに 4 パッケージ分誤りが増える。
291 行目の「monorepo does not use npm workspaces」も workspaces 採用（2026-08-01）後の
記述としてすでに誤り。PR #162・#163 はどちらも「見つけたが自分の PR の範囲外」として
明示的に素通りしている。将来このドキュメントを根拠に Node floor や依存構成を判断する
エージェントが誤った前提を持つリスクが残る。

### F. "fix がマージされた" と "npm に届いた" が同じ意味にならない

#155・#156 の根本には、`main` 上のソース修正（5b109cec、2026-07-19）と npm への
publish（まだ無い）の間に 3 か月のギャップがあったという事実がある——
`package.json` の版を上げる commit が存在しなかったため、`npm publish` が
そもそも実行不可能だった（同じ版番号は再 publish できない）。PR #165 は
この回を 0.0.7 への bump で閉じるが、**この種のギャップを構造的に防ぐ仕組み
（例: 公開パッケージの `src/` が変わったら版番号も変わっていることを検査する gate）
は無い。** 次に `plgg-bundle` か `plgg-test` のソースが直っても版が上がらなければ、
同じ形の issue が再発する。

## 実装順と受入条件

優先度は「corpd が今ブロックされている実被害」→「次の TS7.x / dependabot 走行で
再発する既知の事故」→「まだ issue 化されていない構造的ギャップ」の順。
ファイルの重複は無く（#160/#163/#165 はいずれも `scripts/check-all.sh` の別々の行に
1 行追加するだけで、相互に diff コンテキストが重ならない）、4 PR の merge 順そのものに
コンフリクト上の制約は無い。

1. **PR #165 を merge → 人が `PREFLIGHT=1 ./scripts/publish-npm.sh` → `./scripts/publish-npm.sh`
   を実行。**
   受入条件: npm registry の `plgg-bundle` が `0.0.7` を返す。`gate-bundle-npm-consumer.sh`
   が CI で green。corpd 側が別名 `tsgo` 回避と relocate 前の symlink 削除という
   一時しのぎ（#155・#156 の本文に記載）を外せる。
2. **PR #163 を merge。**
   受入条件: `check-all.sh` に `gate-typescript-split.sh` が組み込まれ、`main` で green。
   `typescript` を runtime dependency に持つパッケージが `^6.x` 以外、devDependency に
   持つパッケージが `^7.x` 以外になった瞬間に CI が落ちる。
3. **PR #162 を merge。**
   受入条件: `.github/dependabot.yml` に `typescript` の
   `update-types: ["version-update:semver-major"]` ignore が入り、次の `typescript` major
   release で dependabot が #112 のような全 29 manifest 一括 PR を**再度開かない**
   （実際に起きるまで確認できないので、次回の TypeScript major リリース時に確認する
   フォローアップ項目として残す）。
4. **PR #160 を merge。**
   受入条件: `plgg-cms`・`plgg-sql`・`plgg-auth`・`plgg-db-migration` の
   `engines.node` が `>=22.13`、`gate-node-support.sh` が CI で green、4 パッケージの
   README が同じ floor を書いている。
5. **Node 24 を CI 行列に追加する変更を、`workflows` 権限を持つ人間（または別 token）が
   push する。**
   受入条件: `run-tests.yml` の `check-all` ジョブが `["22.x", "24.x"]`（`fail-fast: false`）
   の行列で走り、両方 green。同じ機会に `actions/checkout@v4`・`actions/setup-node@v4` を
   `@v5` に上げ、deprecation 警告が消える。`deploy-guide.yml` は publish 系ワークフローの
   ため単一ピンのまま残す（#162 がすでにその判断を記録している）。
6. **`plgg-test` 用の npm-consumer 回帰ゲートを、`gate-bundle-npm-consumer.sh` と同じ形で
   新設する（新しい PR、未着手）。**
   受入条件: 新しい `scripts/gate-test-npm-consumer.sh` が、`typescript@7` を
   devDependency に持つ scratch consumer に `plgg`/`plgg-test` を pack して入れ、
   `plgg-test` の bin を実際に走らせて `transpileModule` 経路が自分の nested
   `typescript@6` を掴むことを確認する。`check-all.sh` に `build.sh` の後ろで登録。
7. **`.workaholic/specs/infrastructure.md` の engines / workspaces に関する記述を
   現状に合わせて更新する（小さな単独 PR、どの既存 PR とも衝突しない）。**
   受入条件: 229 行目付近が `engines` の実在を正しく記述し、workspaces 採用を反映する。
8. **split-version の再評価義務を、人が覚えておく feedback ファイルから、見える形の
   トリガーに変える。**
   受入条件: 最低限、`packages/plgg-bundle/DEPENDENCY-LOG.md` と
   `packages/plgg-test` 側の同等の記録に「次の `typescript` 7.x minor リリースで
   `transpileModule`/`preProcessFile` の有無を再確認する」という、dependabot の
   `typescript` PR（6.x パッチ bump のたびに来る）をトリガーにした手動チェック手順が
   明記されていること。完全自動化は対象外（リリースノートを読む判断が要るため）。
9. **(優先度低、未 issue 化) `engines.node` floor の一般化。**
   受入条件は次に `node:sqlite` 以外の Node バージョン依存 API が使われた時点で検討する
   ——現時点では issue を切るに値する実害が無いため、着手条件のみ記録する。

## 公開パッケージ観点のまとめ

`typescript` を runtime `dependencies` に持つのは `plgg-bundle` と `plgg-test` の
2 つだけ、という事実は #160〜#165 のどの PR でも揺らいでいない。この設計文書が
扱うべき「残る条件」はこの事実の**上**に積まれている——2 パッケージという数が
増えない限り、C・D・F の解決コストは今後も線形で、爆発的には増えない。

## 追記: 起票・PR 化の進捗と、実装順の改訂（2026-10-24）

本文の作成後に、条件の多くが issue / PR になった。重複して PR を立てないため、
条件と既存の追跡先を対応させ、実装順を更新する。公開済み版（npm の `latest`）は、
この追記の作成環境では registry に到達できず再確認していない。#165 の本文が示す
`plgg-bundle@0.0.6` が最新、という前提のまま、publish 後に確認する項目として残す。

### 条件と追跡先

| 条件 | 追跡先 | 状態 |
| --- | --- | --- |
| A. CI が Node 24 を走らせない | [#171](https://github.com/qmu/plgg/issues/171)（workflows 権限待ち）。迂回として [#175](https://github.com/qmu/plgg/pull/175)（gate が Node 24 を自前取得し、公開 `plgg` を consumer の TS7 で transpile） | #175 は matrix 行の代替ではない。`run-tests.yml` 自体は 22.x のまま |
| B. gate が API の有無を見ない | 未起票 | 本文のまま |
| C. `plgg-test` の npm-consumer gate | [#172](https://github.com/qmu/plgg/issues/172) | 起票済み、PR 未着手 |
| D. `engines.node` gate の一般化 | 未起票（優先度低） | 本文のまま |
| E. `infrastructure.md` の矛盾 | 未起票 | 本文のまま |
| F. fix が版 bump 無しで npm に届かない | 未起票 | 本文のまま |
| G.（新）Docker イメージが `node:22-slim` | [#170](https://github.com/qmu/plgg/issues/170)（`workloads/guide`・`workloads/development`） | 本文の A〜F が見ていない面 |
| H.（新）#155 の再発防止 gate | [#173](https://github.com/qmu/plgg/pull/173)（`gate-bundle-repeat-build.sh`） | open。`relocate.mjs` は既に無いので、連続 build が通ることを固定する |
| I.（新）tarball を consumer の TS7 で transpile | [#174](https://github.com/qmu/plgg/pull/174)（ローカル pack）、[#175](https://github.com/qmu/plgg/pull/175)（公開 registry の版 + Node 24） | 重複ではなく検査対象が異なる（#174 = 手元の dist、#175 = 公開済み版） |
| J.（新）gate 失敗時に解決先 tsc が見えない | [#169](https://github.com/qmu/plgg/pull/169) | open。#156 型の事故の診断性のみで、判定は増えない |

### 実装順の改訂

本文の 6 は #172 に置き換わった（新規 PR は #172 を Fixes する形で立てる）。
5 は #171 と #175 に分かれた。改訂後の順序:

1. #165 を merge → 人が publish（本文 1 のまま）。#174・#175 の gate は publish 後に
   初めて `plgg-bundle` の修正を含む公開版に対して意味を持つ（#175 は registry の
   `plgg` 最新版を取るため publish 前でも走るが、`plgg-bundle` の修正は検証しない）。
2. #163 → #162 → #160（本文 2〜4）。
3. #169・#173・#174・#175 を merge。#173〜#175 は `scripts/check-all.sh` に行を足すため、
   先に merge したものの後は rebase が要る（#175 は #165 との非衝突のみ確認済みで、
   #173・#174 との衝突は未確認）。
4. #172 を実装（`gate-test-npm-consumer.sh`、#165 の gate と同形）。
5. #171: `workflows` 権限を持つ人が matrix 行を入れる。入れた時点で #175 の Node 24
   自前取得は冗長になるので、その時に外すか判断する。
6. #170: Dockerfile の `node:22-slim` を、Node 24 を主張する範囲に合わせて見直す。
   CI の matrix と同じ判断（22 を残すか）に従属させる。
7. E（`infrastructure.md`）、B・F の gate または記録、D（本文 7〜9）。

未解決の判断は 1 点: 22.x を支持下限として残すか。#160 の floor（`>=22.13`）は
残す前提で書かれており、#170・#171 の結論はこれに依存する。
