---
created_at: 2026-07-14T21:46:24+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission: modernize-plgg-bundle
---

# plggpress に一級の `dev` コマンドを追加する（利用側の手配線なしでホットリロード）

## Overview

plggpress で作った docs サイトを、利用側リポジトリで **`plggpress dev`（`npx plggpress dev`）**
一発でホットリロード配信できるようにする。現状 dev（オーサリング時のホットリロード）は
「ツールチェーンの責務」として `plgg-bundle dev` に委ねられており、利用側は次の3点を
手で用意しないと dev サーバーが動かない:

- `bundle.config.ts`（dev のポート・監視対象・allowedHosts・sourceAliases）
- `devEntry.ts`（`pressDevEntry({contentDir, configPath, base})` を default export）
- `plgg-bundle` の devDependency（`file:` リンク）

この摩擦を解消する。`plggpress dev [--contentDir docs] [--config site.config.ts]
[--port N] [--host H]` を新設し、内部で plgg-bundle の dev ループと既定値（contentDir /
config / port / allowedHosts / plggpress のソース解決）を束ねる。利用側は上記3点の手配線
なしで、`docs/*.md` や `site.config.ts` を編集するだけでブラウザに即反映される。

**確定した方針（ticket 時）**:
- スコープ: **`plggpress dev` コマンド追加**（scaffold 生成に留めない、根本解決）。
- 現行 `src/cli.ts` の「plggpress ships no `dev` command / dev is a TOOLCHAIN concern」
  という明示方針を**見直す**（下記 Considerations で設計整合を取る）。
- 承認ゲート: フルチェーン（plgg 内テスト green ＋ 新コマンドの単体テスト ＋ 実利用側
  での無配線ホットリロード実証 ＋ build/serve 非回帰）。

**動機（実地の痛み）**: `../strategy`（qmu.app 計画書）を dev 化する際、strategy 側に
`bundle.config.ts`・`devEntry.ts`・`plgg-bundle` を足し、plggpress を `../plgg` のソースに
解決させる必要があった。「dev サーバーを動かすためだけに利用側へ plggpress/plgg-bundle を
install して設定を書く」のは重い。利用側の理想は `npx plggpress dev`（その場の docs を
スキャンして配信＋ホットリロード）である。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 変更は `packages/plggpress`（と必要なら `packages/plgg-bundle`）の既存レイアウト内。
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript。`as`/`any`/`ts-ignore` 禁止（root CLAUDE.md 準拠）。
- `workaholic:implementation` / `policies/functional-programming.md` — 宣言的記述。dev 設定の生成は純関数、I/O・監視ループは境界に隔離。
- `workaholic:implementation` / `policies/type-driven-design.md` — dev コマンドのオプション（contentDir/config/port/host）を型で表し、既定値の合流を型で保証。
- `workaholic:implementation` / `policies/domain-layer-separation.md` — CLI（エントリポイント）は薄く保ち、描画は既存 `pressDevEntry`、dev ループは plgg-bundle 側に委譲。
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — plgg-bundle への依存は seam 越しに（plggpress が plgg-bundle の内部に侵食されない）。
- `workaholic:implementation` / `policies/test.md` — 新コマンドに単体テスト（plgg-test）。
- `workaholic:implementation` / `policies/command-scripts.md` — dev の起動が「利用側の1コマンド」に集約される（この機能自体がその実現）。
- `workaholic:operation` / `policies/ci-cd.md` — CI が同じコマンド（tsc/plgg-test）で検査。

## Key Files

- `packages/plggpress/src/cli.ts` - 現状 `build` のみの CLI（`runApp` 宣言）。ここに `dev` コマンドの分岐を足す。冒頭コメントの「dev はツールチェーン、plggpress は dev を持たない」方針を更新。
- `packages/plggpress/src/framework/` - `runApp`（argv パース・コマンドディスパッチ・usage・Result→exit）。`dev` コマンド登録のため拡張点を確認（`devSpec` 相当を足すか、dev 専用エントリを設ける）。
- `packages/plggpress/src/devEntry.ts` - 既存 `pressDevEntry({contentDir, configPath, base})`。dev コマンドはこれを Fetch ファクトリとして再利用（描画は build と同一パス）。
- `packages/plgg-bundle/` - dev ループ本体。`bundle.config.ts` ファイル読み込みに加え、**設定オブジェクトを受け取る programmatic な dev API**（例 `runDev(config)`）を公開し、plggpress から呼べるようにする（「Modernize plgg-bundle」ミッションと直結）。
- `packages/plggpress/README.md` - 「三つのモード」表と Usage を更新（dev が plggpress コマンドになる）。
- `packages/guide/{bundle.config.ts,devEntry.ts,package.json}` - 新 `plggpress dev` へ移行して手配線を撤去できるか（ドッグフード／非回帰の証左）。
- 参考（利用側の現状の手配線）: `../strategy/{bundle.config.ts,devEntry.ts,scripts/dev.sh,package.json}` — 本チケット完了後に撤去できる想定。

## Implementation Steps

1. **plgg-bundle に programmatic dev API を用意**: 現状 `plgg-bundle dev bundle.config.ts` はファイル読込前提。設定オブジェクト（entry factory・port・watch・allowedHosts・sourceAliases・root/outDir 等）を直接受け取り dev ループを起動する関数を公開する（型付き、副作用は境界に隔離）。既存の file 経由パスはこの API に載せ替えて非回帰を保つ。
2. **plggpress dev コマンド追加**: `src/cli.ts` に `dev` を足す。フラグ `--contentDir`(既定 `.` か `docs` を検討)、`--config`(既定 `site.config.ts`)、`--port`(既定 5173)、`--host`(allowedHosts 追加)。これらから dev 設定を純関数で組み立て、Fetch ファクトリに `pressDevEntry` を渡して plgg-bundle の dev API を起動する。
3. **plggpress のソース解決を内製化**: dev の `sourceAliases`（plggpress→ソース）を、**plggpress 自身のインストール位置**から自動解決する（利用側が `../plgg` を意識しない）。既定はテーマ非監視（利用側は docs のみ編集）＝ plggpress を dist 解決＋contentDir/config を監視。`--watch-theme` 等でファミリー共同開発時のテーマソース監視を opt-in にする設計を検討。
4. **usage/方針の更新**: `cli.ts` 冒頭コメントと `README.md` の三モード表を、dev が plggpress の一級コマンドである前提に更新（`plggpress serve`（永続本番）/ `plggpress build`（SSG）/ `plggpress dev`（ホットリロード）の三本立てに整理）。
5. **単体テスト**: dev 設定組み立て（フラグ→設定オブジェクトの純関数）と既定値合流、plggpress ソース位置解決を plgg-test で検証。dev ループ本体はスモークで最小限。
6. **ドッグフード／非回帰**: `packages/guide` を新 `plggpress dev` へ移行（`bundle.config.ts`/`devEntry.ts`/`plgg-bundle` devDep を撤去できるか）。`plggpress build`・`plgg-cms` の serve が非回帰であることを確認。
7. **利用側の実証**: `../strategy` で `bundle.config.ts`/`devEntry.ts` を外し `plggpress dev` を起動、`docs/*.md` 編集が無再ビルドで反映されることを確認（受け入れ基準）。

## Quality Gate

ticket 時に確定した客観ゲート（フルチェーン）。

**Acceptance criteria**:
- plgg の `tsc --noEmit` と `plgg-test`（対象パッケージ）が **green**。`as`/`any`/`ts-ignore` を新規に増やさない。
- `plggpress dev` の**単体テスト**が追加され、フラグ→dev 設定の合流・既定値・plggpress ソース位置解決を覆う。
- **実利用側での無配線ホットリロード実証**: `../strategy` で `bundle.config.ts`・`devEntry.ts`・`plgg-bundle` devDep を外した状態で `npx plggpress dev`（または `plggpress dev`）を起動し、`docs/*.md` 編集が**再ビルドなしで**配信に反映される。
- **非回帰**: `plggpress build`（SSG、デッドリンク検査込み）と `plgg-cms` の `serve` が従来どおり動く。`guide` が新 dev へ移行しても既存の見え方が保たれる。

**Verification method**:
- plgg ルートの検査コマンド（`scripts/` の tsc/test ランナー、例 `sh scripts/test.sh` 相当）で green を確認。
- 追加した plgg-test スペックが新コマンドのロジックを covering（テスト名で対応が追える）。
- 実証: strategy 側で手配線を外し `plggpress dev` 起動 → 一時マーカーを `docs/index.md` に追記 → 無ビルドで `curl localhost:<port>/` にマーカーが出る → 撤去。
- 非回帰: `packages/guide` で `plggpress build` 成功、`plgg-cms` serve スモーク。

**Gate**:
- 上記 Acceptance criteria がセッション内で緑（検査出力を残す）。とくに「利用側で手配線ゼロのホットリロード」が実機で示せていること。

## Considerations

- **現行方針の明示的な転換**: `src/cli.ts` は「authoring hot-reload is a TOOLCHAIN concern … plggpress ships no `dev` command」と明記している。本チケットはこれを覆すので、なぜ dev を plggpress の一級コマンドに“昇格”するのか（利用側の摩擦解消＝プロダクトの主目的）を README とコメントで説明し、設計の一貫性（三モードが同一描画パスを共有する原則）を保つこと。
- **plgg-bundle との層分離**（`anti-corruption-structure`）: dev ループの所有は plgg-bundle のまま。plggpress は「設定を組み立てて plgg-bundle の dev API を呼ぶ」薄い委譲に留め、plgg-bundle の内部型に侵食されない seam を置く。これは `modernize-plgg-bundle` ミッションの programmatic API 化と歩調を合わせる。
- **plggpress の配布形態**: plggpress は現状 npm 未公開（UNSTABLE・`file:` 専用）。「`npx plggpress dev` をどのリポでも」という理想の完全形（未公開でも動く配布）は本チケットの射程外だが、dev コマンドの設計はソース位置を自己解決し、公開時にもそのまま `npx` で動く形にしておく。
- **既定 contentDir**: 利用側は `docs/` 構成（strategy）と直下構成（guide は直下 `.md`）が混在する。`--contentDir` 既定値の選択（`.` か `docs` 自動検出か）は利用実態に合わせて決める。`.` にするとリポ直下の `.workaholic/` などを拾う既知の落とし穴（strategy で発生）に注意し、既定の除外を設けるか `docs` 前提にするかを設計で判断。
- **本番配信は別**: dev はオーサリング用。本番は引き続き `plggpress build`（SSG/CDN）か `plgg-cms` の `serve`。dev をホスティングに使わない旨を明記。
- **利用側の後片付け**: 完了後、`../strategy` の `bundle.config.ts`/`devEntry.ts`/`scripts/dev.sh`/`plgg-bundle` devDep を撤去して `plggpress dev` に一本化できる（別チケット or 本チケットの実証ステップで併せて）。
