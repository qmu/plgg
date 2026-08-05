---
created_at: 2026-08-05T03:51:33+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Changed
depends_on:
mission:
merge_policy: review
claim: work-20260805-104535
---

# 配信インスタンスの `/mcp` が空を返す — Markdown コーパスを content index に取り込む経路が存在しない

## Overview

`plgg-cms serve` の `/mcp` は MCP として**正しく動いている**。`initialize` /
`tools/list` / `tools/call` に鍵なしで応答し、`serverInfo` は
`plggpress-mcp` を名乗る。ところが 3 つのツールはいずれも空を返す:

```
$ ( cd packages/guide && node ../../packages/plgg-cms/bin/plgg-cms.mjs serve \
      --config site.config.ts --contentDir . --port 39117 --hostname 127.0.0.1 )
→ serving . on http://127.0.0.1:39117/

tools/call search_content {"query":"pipe"}  → {"content":[{"type":"text","text":"[]"}]}
tools/call list_collections {}              → []
GET /                                        → 200（ガイドは正しく描画される）
```

原因は MCP 層ではない。`contentTools` は `pressServer.ts:252` で
`openIndex(":memory:")`（同 128 行）が返した `Db` に正しく結線済みで、
`documents` / `chunks` / `chunks_fts` / `collections` のスキーマも
`contentSchema.ts` が張っている。**そこへ 1 行も書く経路が無い**のが
全てである。`rebuildIndex(db)(inputs)` は `IndexInput[]`（パース済み）を
受け取る形で、`packages/guide/**/*.md` からそれを作る関数がリポジトリの
どこにも存在しない（`IndexInput` の生産者は stakeholder 会話を投影する
`content/Stakeholder/usecase/projectFeed.ts` 一つだけ）。

### これは新しい不具合ではなく、既知の未実装

アーカイブ済みチケット 16（`20260704143016-plggpress-content-index-and-delivery-api.md`）の
Final Report が、この一点だけが積み残ったと明言している:

> populating the served index needs an async build step the current sync
> `(paths) => Web` serve seam cannot host — that live serve-lifecycle ingest
> is the one remaining integration (the adapter + package are complete and
> tested; the mount seam is ready).

同チケットの Implementation Step 8 は成果物名まで指定していた
(`ingestFromConfig.ts`: discoverPaths → parseFrontmatter + parseBlocks →
`casterOf(model)` で検証 → hash → `rebuildIndex`)、Step 9 は呼び出し口
（serve 起動時に一度だけ索引を作る、D4「derived at boot」）を指定していた。
`grep` の結果、`ingestFromConfig` は `packages/**/src` に 1 件も無い。
チケット 21（requests/comments）・24（RAG）・25（voice agent）・30
（Claude Code プラグイン書き出し）は、いずれもこの関数を**既存の拡張点として**
書かれており、同じ理由で受入が通らない状態にある。

**当時の阻害要因は既に消えている。** `pressServeWebWithAuth` は現在
`PromisedResult<(paths) => Web, Defect>` を返す**非同期**の seam で
(`server/pressServer.ts:105`)、`contentDir` と `config` を引数として既に
受け取り、128 行で `openIndex` を `await` している。ingest に必要な入力は
すべてその場に揃っている。設計をやり直す必要はない。

## Policies

- `workaholic:planning` / `policies/accessibility-first.md` — 「AI エージェント
  が製品の情報に到達できない状態を防ぐ」ことがこのチケットの存在理由そのもの。
  見出し単位の安定した参照点を残すこと（`chunkBlocks` が既に `headingPath` を
  作り、`search_content` が `heading` として返すので、Block を本物で渡せば満たす）。
  **MCP の索引はガイドが描画するのと同一のコーパスに対する第二の経路**であり、
  フォークであってはならない（乖離すると人間のページに存在しない文をエージェントが
  引用する）。
- `workaholic:planning` / `policies/ai-native-future.md` — ingest はサーバ起動の
  不可視な副作用にしない。`rebuildIndex` が返す `RebuildReport {indexed, pruned}`
  を観測可能な形で外に出すこと。
- `workaholic:implementation` / `policies/domain-layer-separation.md` — 呼び出し口
  を規定する。判断ロジックは `content/Ingest/usecase` に置き、`pressServer.ts` は
  薄い 1 行の結線に留める。**同じ関数が `cli.ts` からも spec からも同じ呼び方で
  呼べること**が分離できている証拠。`pressServeWebWithAuth` の中でしか動かない
  なら分離は失敗している。
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — コーパス
  リーダは `node:fs` に触れる。境界で囲い、ドメイン語彙に戻すこと。plggpress の
  `Page`（`{path, source}`）は他パッケージの型なので、境界で変換し plgg-cms の
  ドメイン署名に現れさせない。
- `workaholic:implementation` / `policies/functional-programming.md` — 副作用は薄い
  シェルに集め、コーパス→`IndexInput` の写像は純粋計算にする。テストはそちらに
  集中させる（>90% ブランチを素直に取れるのはこの形だけ）。
- `workaholic:implementation` / `policies/persistence.md` — `:memory:` は**現状では
  違反ではない**。`rebuildIndex` の doc comment が D4 の復元契約（DB を捨てても
  `openIndex` → `rebuildIndex` で同一の索引が再構成される）を宣言しており、索引は
  git のコーパスを真とする派生物である。逆にパス seam を足すと本物の永続化になり、
  マイグレーションと `PRAGMA foreign_keys` が一気に射程に入る。
- `workaholic:implementation` / `policies/observability.md` — このチケットを生んだ
  失敗モードそのもの。空の索引が「空の結果」としてしか現れず、外から検知できなかった。
  コーパス読み取りの失敗が黙って空の索引を配る状態にしないこと。
- `workaholic:implementation` / `policies/test.md` — >90% の 4 指標ゲート。`proc` を
  使い `isErr` ガード連鎖を避ける（到達不能な防御分岐がブランチ率を落とす）。
- `workaholic:implementation` / `policies/coding-standards.md` — 外部生成物
  （ディスク上のファイル、frontmatter、Markdown）をパースする箇所は `as` が
  最も紛れ込みやすい。`unknown` で受けて caster を通すこと。`as` / `any` /
  `ts-ignore` はリポジトリ規約で例外なく禁止。
- `workaholic:planning` / `policies/terminology.md` — 既存語彙（`IndexInput` /
  `rebuildIndex` / `Document` / `Chunk` / `collection` / `contentHash` /
  `headingPath`）を再利用する。`Article` / `Corpus` / `Ingester` のような同義語を
  新造しない。
- `workaholic:operation` / `policies/ci-cd.md` — 単体テストが緑であることは受入の
  証拠として不十分。実際に配信インスタンスに MCP で問い合わせて実ページが返る
  ことを示すこと。
- `workaholic:design` / `policies/rest-api-design.md` — MCP ツール面を RPC の場合
  として規定する。`/api`（`contentApi`）と `/mcp`（`contentTools`）は同じ
  `documents` / `chunks` を読むので、**document の表現が乖離してはならない**
  （同じフィールド名・同じ粒度・同じ型）。またツール定義は「どの資源を読むか」
  「再実行がどう扱われるか」を記録すること — 3 つとも読み取りなので再実行は安全で、
  それを明記する。

## Key Files

- `packages/plgg-cms/src/content/Ingest/usecase/indexDocument.ts` — `IndexInput`
  の定義（`collection` / `path` / `title: Option<SoftStr>` / `attributesJson` /
  `blocks: ReadonlyArray<Block>` / `contentHash` / `updatedAt` の 7 フィールド）。
  ここが新しい変換の出力契約。doc comment が「validation happened upstream」と
  明言しているとおり、ingest は再検証しない。
- `packages/plgg-cms/src/content/Ingest/usecase/rebuildIndex.ts` — `rebuildIndex(db)(inputs)`。
  逐次 short-circuit の `ingestAll` の後に `pruneMissing`（消えたページを削除）。
  冪等なので起動ごとに呼んで安全。`RebuildReport {indexed, pruned}` を返す。
- `packages/plgg-cms/src/content/Query/usecase/registerCollection.ts` — これを呼ばない
  限り `list_collections` は空のまま。`projectFeed.ts` と同じく**先に**呼ぶ。
- `packages/plgg-cms/src/content/Stakeholder/usecase/projectFeed.ts` — 唯一の既存
  `IndexInput` 生産者。ファイル配置・`proc` fold・「collection を先に登録」の順序、
  すべてこれに倣う。ただし削除を刈るため `indexDocument` ではなく `rebuildIndex` を使う。
- `packages/plgg-cms/src/server/pressServer.ts` — **呼び出し口**。128 行の
  `openIndex(":memory:")` 直後に ingest を差し込めば、`/mcp`・`/api`・`/plugin`・
  `healthWeb`・admin が同じ `contentDb` を共有しているので一度に点灯する。既に
  `matchResult` が 5 段ネストしているので、手で 6 段目を足すのではなく小さなヘルパに
  畳むこと。**このファイルは coverage 除外**なので結線分のテストは不要。
- `packages/plggpress/src/ContentModel/usecase/collectPages.ts` — 再利用したい
  コーパス走査。`collectPages(contentDir)(paths)` が `Page = {path（ルート）, source（frontmatter 込みの生テキスト）}` を返す。
  **ただし plggpress の `exports` は `"."` と `"./framework"` のみで、公開バレルは
  `collectPages` を出していない** — plgg-cms から解決できない。
- `packages/plggpress/src/index.ts` — 上記を届かせるための 1 行を足す場所。
- `packages/plgg-md` — `parseFrontmatter`（`{frontmatter, body}` に分割）、
  `foldYaml`（YamlMap → プレーンデータ、`attributesJson` の素）、
  `parseBlocks(source, rawHtml)`（唯一の `Block` 生産者）。すべて公開バレル済み。
- `packages/plgg-cms/src/domainCore/Domain/model/Fingerprint.ts` — `fingerprint(text)`
  が決定的な 16 hex FNV-1a を返す。`contentHash` にそのまま使える。
- `packages/plgg-cms/src/content/Query/usecase/indexFlow.spec.ts` — テストの先例
  （`must` ヘルパ、`:memory:` DB、`heading()`/`para()` で組む `IndexInput` factory）。
- `packages/plggpress/ROLLOUT.md` — 33 行目が `:memory:` ストアと永続 DB パスを
  「Deferred to deploy config (not code)」に分類している。**content index については
  これは誤りで、有害**（永続パスを指しても索引は空のまま — コード不在であって設定の
  問題ではない）。このチケットで直す。
- `packages/guide/site.config.ts` — 受入対象のコーパス。`models` を設定していないので
  ガイドの frontmatter は型なし。`foldYaml` の結果をそのまま直列化し、collection は
  空の fields で登録する（`projectFeed` の先例）。

## Implementation Steps

1. `packages/plggpress/src/index.ts` に `collectPages` を公開バレルから export する
   1 行を足す（`Page` 型は既に出ている）。plgg-cms は plggpress に依存しており、
   逆向きではないので依存の向きは保たれる。
2. `packages/plgg-cms/src/content/Ingest/usecase/` に**純粋な**写像を書く:
   `Page[] → Result<ReadonlyArray<IndexInput>, InvalidError>`。各ページについて
   `parseFrontmatter` で分割 → `foldYaml` + `encodeJson` で `attributesJson` →
   `parseBlocks(body, rawHtml)` で `blocks`（`rawHtml` は `config` の設定を渡す。
   ハードコードの `false` にしない — 描画経路との一致が崩れる）→ 最初の level-1
   `Heading` から `title`（無ければ `None`）→ `fingerprint(source)` で `contentHash`。
   `updatedAt` は引数で受ける（ingest に時計を持たせない — `projectFeed` の先例）。
   plggpress の `Page` はこの関数の**入口で**畳み、plgg-cms のドメイン署名に出さない。
3. その上に薄い I/O シェルを書く: `contentDir` からルートを集めて `collectPages` に
   渡し、2 の写像を適用し、`registerCollection` してから `rebuildIndex(db)(inputs)` を
   呼ぶ。エントリポイント非依存の usecase として export する（`cli.ts` からも spec
   からも同じ呼び方で呼べること — これが分離できている証拠）。
4. `pressServer.ts` の `openIndex(":memory:")` 直後に 3 を結線する。`RebuildReport`
   を起動ログに出す（`serving …` の行の近く）。**コーパス読み取りが失敗したときに
   黙って空の索引を配らない**こと — このチケットが生まれた失敗モードそのものなので、
   失敗は起動を落とすか、少なくとも明示的に叫ぶ。
5. `healthWeb` に document 件数のシグナルを足す。**空の索引が外から検知できる**
   ようにするのが目的で、これが無かったことが「失望したエージェント」経由でしか
   気づけない今の状態を作った（`implementation/observability` の business health）。
6. `packages/plggpress/ROLLOUT.md` の該当行を直す（content index は設定の遅延ではなく
   コードの不在だったと事実として書く）。
7. `packages/guide/packages/plggpress/agent-surfaces.md` に、実際に効く起動手順
   （上の `plgg-cms serve` の 1 行）と、`get_article` に渡す `collection` / `path` の
   綴りを追記する。現状どこにも起動コマンドが書かれていない。

## Quality Gate

**Acceptance criteria**

- `packages/guide` から `plgg-cms serve` を起動し、`POST /mcp` の
  `tools/call search_content {"query":"<ガイド本文に実在する語>"}` が**空でない**
  ヒットを返し、各ヒットの `path` が実在のガイドページを指し、`heading` が
  見出しのパンくずになっていること。
- 同じインスタンスで `tools/call list_collections` が**空でない**こと。
- 同じインスタンスで `tools/call get_article` に、上の検索結果が返した
  `collection` と `path` をそのまま渡して当該ページが返ること（検索と取得の
  綴りが一致していることの証明）。
- 起動ログに `RebuildReport` 相当（indexed / pruned の件数）が出ること。
- `GET /health` から索引の document 件数が読め、空の索引が外から検知できること。
- `./scripts/check-all.sh` が緑（exit 0）、かつ plgg-cms の coverage が
  4 指標すべて >90%。
- `git grep -n "as \|any\|ts-ignore"` 相当の逸脱が新規コードに無いこと
  （リポジトリ規約）。

**Verification method**

- 上記 MCP 3 コールは `curl` で直接叩く（`Authorization` ヘッダ不要 —
  `/mcp` は `mcpWeb` の無警備マウント）。実際のリクエスト/レスポンスを
  ストーリーに貼ること。緑のテストは受入の証拠として不十分（`operation/ci-cd`）。
- `./scripts/check-all.sh`、coverage は `plgg-test src --coverage`。

**Gate**

- check-all 緑 + coverage >90%、かつ上の MCP 3 コールが実データを返すこと。

`Decided:` **呼び出し口は serve 起動時にする。新しい `plgg-cms index` verb は作らない。**
`runApp` の verb はデータ駆動ではなく、`build` が固定で `serve`/`dev` が
`serveWeb`/`dev` フィールドの有無で条件登録される作りなので、verb 追加は plggpress
フレームワーク側の変更になる。チケット 16 Step 9（D4「derived at boot」）と
チケット 26（「opens the derived index at startup」）が起動時 ingest を指定しており、
受入もそれでしか満たせない。ただし **Step 3 の usecase はエントリポイント非依存に
書く**ので、後から verb を足すのは 1 行で済む（`/drive` で開発者が上書き可）。

`Decided:` **`:memory:` のまま。永続パス seam は足さない。** 索引は git のコーパスを
真とする派生物で、`rebuildIndex` の D4 復元契約がそれを保証している。パス seam を
足すと本物の永続化になり、マイグレーションと FK 強制がこのチケットの射程に入って
しまう。起動ごとの再構築を明示的・観測可能にする方が正しい（`/drive` で開発者が上書き可）。

`Decided:` **plggpress の `collectPages` を公開して再利用する。plgg-cms 側に
第二の Markdown ウォーカを書かない。** ルート→ファイルの逆写像を二重に持つことは
コードベースが明示的に警告している drift（`framework/DevServer/usecase/voiceDoc.ts`
のコメント）。plgg は自分自身が唯一の利用者なので、公開バレルを広げる破壊的変更は
許容される（`/drive` で開発者が上書き可）。

`Decided:` **テストは純粋写像に集中させる。** Step 2 の `Page[] → IndexInput[]` は
fs に触れないので >90% を素直に取れる。Step 3 の I/O シェルと Step 4 の結線は薄く保つ
（`pressServer.ts` は coverage 除外）。plgg-cms に既存の Markdown fixture ディレクトリは
無いが、純粋写像には不要（`Page` を直接組める）。狙うべき境界: 空コーパス（全 prune）、
H1 が無いページ（`title` は `None`）、`contentHash` 不変（skip）、再実行で同一索引、
frontmatter が壊れたファイル（`/drive` で開発者が上書き可）。

`Decided:` **RAG の `embedChunks` フックと requests/comments 投影は射程外。**
チケット 24 と 21 は `ingestFromConfig` を既存の拡張点として書かれたが、その拡張点は
存在しない。このチケットは索引を埋めるところまでで、埋め込みは `contentTools(db, none())`
のまま FTS5/BM25 に degrade させる（意図された graceful degradation であって欠陥ではない）。
再結線は別チケット（`/drive` で開発者が上書き可）。

## Considerations

- **取り込むのは公開ドキュメントだけ。** ingest したコーパスは admin UI が閲覧し
  `/api` が配る索引と同一のものに入る。`/mcp` は鍵なしで公開されているので、
  `contentDir` 配下の Markdown 以外を混ぜない。
- **`get_article` と `Document` の名前の不一致**は既存の矛盾（公開ツール名は
  `get_article`、内部型は `Document`）。境界の名前なので今は変えられないが、
  `planning/terminology` は「触っていない箇所でも矛盾は記録する」ことを求めている
  ので、ここに記録しておく。
- **`search_content` は本文を返さない** — `path` / `heading` / `rank` のみ。
  エージェントは続けて `get_article` を呼ぶ必要がある。受入で両方叩くのはこのため。
- **ROLLOUT.md と agent-surfaces.md は現状と食い違っている。** 後者は `/mcp` を
  「OAuth 2.1 resource server として保護されている」と書くが、実際にマウントされて
  いるのは無警備の `mcpWeb` で、`mcpWebGuarded` は spec の外から呼ばれていない。
  このチケットの射程は索引を埋めることだが、ドキュメントの是正は Step 5/6 に含めた。
- **チケット 16 が指定した配置 `packages/plggpress/src/DeliveryApi/usecase/ingestFromConfig.ts`
  は今は誤り。** SSG/CMS 分割で `plgg-cms` が `plggpress` に依存する一方向の辺が
  引かれたので、ingester は `plgg-cms` 側に置き plggpress を import する。逆向きに
  すると分割が防いだ循環が戻る。
