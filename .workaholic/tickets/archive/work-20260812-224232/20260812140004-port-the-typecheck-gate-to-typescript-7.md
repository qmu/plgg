---
created_at: 2026-08-12T14:00:04+09:00
author: a@qmu.jp
assignees: [a@qmu.jp]
type: refactoring
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260812140003-port-plgg-test-resolve-hook-to-typescript-7.md]
mission: typescript-7-migration
merge_policy: auto
---

# 全体型チェックゲートを TS7 に移植する

## 経路決定（2026-08-13, split-version）— ゲートは TS7 native tsc で再設計

root hoist が TS7 になるため `import ts from "typescript"` は API の無い
`lib/version.cjs` に解決される。**API ベースの移植ではなく、TS7 の native `tsc` を
プロセスとして駆動する再設計**が確定ルート（incremental API は存在しない —
`docs/typescript-7-api-gap.md`）。パッケージごとに `tsc -p <config> --noEmit` を
並列 spawn する形が第一候補（T1 実測: native の起動 0.035s、29 configs の逐次
フルランでも実用域の見込み — 必ず wall clock を測って記録する）。
`check-all.sh:45` の `node node_modules/typescript/bin/tsc` 直接呼び出しも
TS7 の bin/tsc で成立するか確認して直す。既存受入（エラー検出の実証・検査
パッケージ数の一致・2 回目の wall clock 記録）はそのまま適用。

## Overview

`scripts/typecheck.ts` はこのリポジトリで**最も TypeScript API に深く依存した
コード**であり、同時に最も重要なゲートである。全パッケージを 1 つの型グラフで
検査し、2 回目以降は差分で走る。使っている API:

`createIncrementalProgram` / `createIncrementalCompilerHost` /
`getParsedCommandLineOfConfigFile` / `formatDiagnostics` /
`formatDiagnosticsWithColorAndContext` / `sys` / `CompilerHost` /
`CompilerOptions` / `SourceFile` / `DiagnosticCategory`

`as` / `any` / `ts-ignore` を禁じるこのリポジトリにとって、型チェックゲートは
**規約を機械的に強制している当のもの**である。ここが落ちると、規約は文章に戻る。

先行スパイクが incremental 相当の API を TS7 に見つけられなかった場合、
このチケットは**ゲートの設計変更**を含むことになる。その場合は押し切らず、
何が失われるかを添えて報告する。

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — このゲートが
  規約を強制している当事者。移植で厳しさが下がってはならない。
- `workaholic:implementation` / `policies/type-driven-design.md` — 型で捕まえる
  という設計思想の実行機構。
- `workaholic:operation` / `policies/ci-cd.md` — 単一の検査コマンドに統合する。
  移植でゲートが分裂したり、一部パッケージが検査対象から外れたりしないこと。
- `workaholic:implementation` / `policies/objective-documentation.md` — 診断の
  出力形式（色付き、ファイル位置つき）は開発者がエラーを読む唯一の窓。
  劣化させない。
- **注記: このファイルは vendor-boundary ゲートの守備範囲外。**
  `scripts/vendor-boundary-analyzer.mjs` が走査するのは `packages/*/src` だけで、
  `scripts/` は含まれない。つまり 4 箇所のうちここだけ、第三者 import の境界を
  機械的に守る仕組みが無い。

- `workaholic:implementation` / `policies/directory-structure.md` — 変更は既存の
  構造の中に収める。新しいトップレベルディレクトリを作らない。

## Key Files

- `scripts/typecheck.ts` — 移植対象。
- `scripts/typecheck.spec.ts` — 既存のユニットテスト。`node --test scripts/*.spec.ts`
  で check-all から走る。
- `docs/typescript-7-api-gap.md` — 対応表。特に incremental 系の行。
- `scripts/tsconfig.json` — リポジトリツーリング自身の型設定。
- `scripts/check-all.sh` — `node "$REPO_ROOT/node_modules/typescript/bin/tsc" -p scripts/tsconfig.json`
  を直接呼ぶ箇所がある。TS7 の `bin/tsc` はネイティブバイナリを起動する
  ラッパなので、**このパスが今も有効か**を確認すること。
- 各パッケージの `tsconfig.json` — 型検査の入力。

## Implementation Steps

1. 対応表の incremental 系の行を読む。等価物が無い場合は **Step 5 に飛ぶ**。
2. `typecheck.ts` を移植する。診断の整形（色、ファイル位置）を保つ。
3. `scripts/typecheck.spec.ts` を通す。
4. `check-all.sh` の直接 `bin/tsc` 呼び出しが TS7 で動くことを確認する。
   動かなければそこも直す。
5. **incremental 相当が無い場合**: 差分実行を諦めた場合の wall clock を実測し、
   「毎回フル型チェック」が実用に耐えるかを数字で示す。耐えないなら、そこで
   止めて報告する（ゲートを遅くして誰も走らせなくなるのが最悪の結果）。

## Quality Gate

**Acceptance criteria**

- `node scripts/typecheck.ts` が**全パッケージ**を検査し clean。検査された
  パッケージ数が移行前と同じであること（出力の `N packages` を前後で比較）。
- `node scripts/typecheck.ts plgg-cms` のような**絞り込み実行**が従来どおり動く。
- 型エラーが**実際に検出できる**ことの証明: 適当なファイルに一時的に型エラーを
  入れて `typecheck.ts` が非ゼロで落ちること、そして戻すと通ることを示す。
  **緑になることだけでは、検査していないのと区別がつかない。**
- `node --test scripts/*.spec.ts` が緑。
- `./scripts/check-all.sh` が緑（exit 0）。
- 2 回目の `typecheck.ts` の wall clock が記録されている（incremental が
  効いているか、効かないならフルで何秒か）。

**Verification method**

- 上記をコマンドとして実行し、出力を Final Report に貼る。
- 「型エラーを実際に検出できる」証明は、入れたエラーと出た診断の両方を引用する。

**Gate**

- 上記すべて。特に**エラー検出の実証**と**検査パッケージ数の一致**。

`Decided:` **わざと型エラーを入れて落ちることを確認する。** 型チェックゲートの
移植で最悪なのは「常に緑を返すゲート」で、それは正常な状態と区別できない。
`as` 禁止規約の強制力がゲートに乗っている以上、ゲートが生きていることの
実証は省けない（`/drive` で開発者が上書き可）。

`Decided:` **incremental が失われた場合、遅さを数字で示してから判断する。**
「遅くなったが動く」と「遅すぎて誰も走らせない」は別で、後者ならゲートは
実質的に消える。秒数を測ってから決める（`/drive` で開発者が上書き可）。

`Decided:` **診断の出力形式は劣化させない。** 色付き・ファイル位置つきの
出力は、開発者がエラーを読む唯一の窓。プレーンな羅列に落とすなら、それは
移植ではなく機能後退（`/drive` で開発者が上書き可）。

## Considerations

- **このミッションで最も落ちる可能性が高いチケット。** incremental API は
  TS7 の設計思想（別プロセスのネイティブバイナリ）と相性が悪い可能性がある。
  ここで止まるなら、それはミッション全体の判断材料であって失敗ではない。
- **`bin/tsc` の性質が変わっている。** TS7 の `bin` は `{"tsc": "bin/tsc"}` の
  1 つだけで、これはネイティブバイナリを起動するラッパ。`node node_modules/typescript/bin/tsc`
  という**node 経由の直接呼び出し**が成立するかは要確認。
- **ゲートが遅くなると全部が遅くなる。** `check-all` の中で typecheck は
  最も重い工程（実測 39〜55 秒）なので、ここの性能はそのまま開発体験になる。

## Final Report

Development completed as planned — 経路決定どおり **API 移植ではなく TS7 native
`tsc` をプロセスとして駆動する再設計**を実装した(実装は T2 のアーカイブ
コミット `476ce098` に同梱 — split の lockfile 反転と typecheck の旧 API 破壊が
同一変更で連動するため)。

### 設計

- `scripts/typecheck.ts` から `import ts from "typescript"` を全廃。各パッケージの
  `tsc` を **そのパッケージ自身の typescript 依存から解決**(emitDts と同じ
  `createRequire(package.json).resolve("typescript") → ../bin/tsc` の経路)し、
  `node <bin/tsc> -p <tsconfig> --noEmit --pretty` を bounded pool で並列 spawn。
  27 パッケージは TS7 native、plgg-bundle / plgg-test は自身が宣言する nested TS6
  で検査される — hoist 順の変化がコンパイラを黙って差し替えることは二度と無い。
- パッケージごとの program / options 分離は維持(node-only パッケージが DOM を
  見ない)。診断は `--pretty` 強制で**色付き・ファイル位置つきのまま**
  (パイプ時に tsc が色を落とすのを防ぐ)。red パッケージはブロック単位で
  attributed 出力、summary 形式(`typecheck: N packages in Xs — …`)は不変。
- `--jobs N` を追加。runTests.ts は typecheck をプール内の 1 ジョブとして走らせる
  ため `--jobs 2` でキャップ — 無キャップでは 2 つのプールが掛け算になり
  4 コア箱で test フェーズが 30.1s → 61.0s に劣化した(実測)。キャップ後 31.8s。
- `check-all.sh:45` の `node node_modules/typescript/bin/tsc -p scripts/tsconfig.json`
  は TS7 の bin/tsc(node シム)でそのまま成立(実測 0.37s、exit 0)。変更不要。

### Quality Gate 検証結果

- `node scripts/typecheck.ts` → **29 packages**(移行前と同数)all clean ✔
- 絞り込み: `node scripts/typecheck.ts plgg-bundle` → `1 packages … all clean` ✔
- **エラー検出の実証**(両コンパイラ経路): `packages/plgg/src/Atomics/Bool.ts` と
  `packages/plgg-bundle/src/vendors/transpiler.ts` に
  `export const probe: number = "boom";` を一時挿入 →
  `src/Atomics/Bool.ts:104:14 - error TS2322: Type 'string' is not assignable to
  type 'number'.` / `src/vendors/transpiler.ts:83:14 - error TS2322: …`、
  `typecheck: 2 packages in 2.4s — FAILED in 2: plgg, plgg-bundle`、exit 1。
  復元 → `all clean`、exit 0 ✔
- `node --test scripts/*.spec.ts` → 48 tests, 48 pass, 0 fail ✔
  (settingsKey / buildInfoPath のテストは削除した実装に合わせて
  parseCheckArgs / tscBinFromMain / errorCountOf のテストに置換)
- `./scripts/check-all.sh` → exit 0 ✔
- **wall clock(incremental 喪失の実測)**: 1 回目 11.4s / 2 回目 11.4s
  (毎回フル、native の速度で吸収)。旧 TS6 API 実装: 1 回目 21.4s /
  2 回目 6.3s(incremental)。プール内ジョブとしては 16.2s(旧 15.3s)。
  **「毎回フル」でも旧コールド実行の半分であり、実用に耐えると判断** ✔

### Discovered Insights

- **Insight**: 並列プールを内蔵するゲートを別の並列ランナーのジョブとして走らせる
  と並列度が掛け算になる。typecheck 単体最速の設定(availableParallelism)と
  プール内ジョブとしての正しい設定(--jobs 2)は別物。
  **Context**: runTests.ts のジョブ数を触るときは typecheck の --jobs キャップと
  併せて考えること(スケジューリングは cost 降順で typecheck が先頭に張り付く)。
- **Insight**: TS7 の `bin/tsc` は node シムで、`node bin/tsc` 起動・
  `--noEmit --pretty` とも TS6 と同じ CLI 語彙で動く。exit code は診断ありで
  1(TS6 は 2)— 特定の非ゼロ値をどこにも assert しないこと(T1 の注意の再確認)。
  **Context**: gate スクリプトが exit code の値に依存すると TS6/TS7 で挙動が割れる。
