---
created_at: 2026-08-12T14:00:01+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission: typescript-7-migration
merge_policy: auto
---

# TS7 で何が壊れるかを実測し、4 箇所の移植先 API を特定する

## Overview

移植を始める前に、**推測ではなく実測**で壊れ方を確定させる。TypeScript 7 の
`exports["."]` は `./lib/version.cjs` だけで、従来の API は
`typescript/unstable/*` に移動している。このリポジトリの利用箇所は 4 つ:

| ファイル | 使っている API |
|---|---|
| `packages/plgg-bundle/src/vendors/transpiler.ts` | `ts.transpileModule`, `ts.ModuleKind`, `ts.ScriptTarget` |
| `packages/plgg-bundle/src/vendors/exportSurface.ts` | `ts.createProgram`, `ts.TypeChecker`, `ts.Symbol`, `ts.SymbolFlags`, `ts.ModuleResolutionKind` |
| `packages/plgg-test/src/Resolve/hook.ts` | `ts.transpileModule`, `ts.ModuleKind`, `ts.ScriptTarget` |
| `scripts/typecheck.ts` | `ts.createIncrementalProgram`, `ts.createIncrementalCompilerHost`, `ts.getParsedCommandLineOfConfigFile`, `ts.formatDiagnostics`, `ts.formatDiagnosticsWithColorAndContext`, `ts.sys`, `ts.CompilerHost`, `ts.CompilerOptions`, `ts.SourceFile`, `ts.DiagnosticCategory` |
| `scripts/vendor-boundary-analyzer.mjs` | `ts.preProcessFile`（`createRequire` 経由なので `from "typescript"` の grep に写らない） |

**計画時の調査で既に分かっていること（スパイクはここから始める、ゼロからでは
ない）:**

- **`transpileModule` は 7.0.2 の `dist/` を横断検索しても出てこない。**
  `unstable/sync` の `Emitter` が持つのは `printNode(node, options)` のみ。
- **`preProcessFile` も同様に見当たらない。**
- `exportSurface.ts` の `getExportsOfModule` / `getAliasedSymbol` は
  `unstable/sync` の `Checker` に対応物がある見込み。
- **コンパイラオプションは問題ではない**: TS7 の `tsc` に 29 個の
  `tsconfig.json` を食わせると 28 個が診断ゼロで通る（唯一落ちる `plgg-cms` は
  TS 6.0.3 でも同じ理由で落ちる既存の dist 陳腐化）。
- 共有の tsconfig ベースは**存在しない**。29 個が独立した完全なコピーで、
  `extends` は 10 個の `tsconfig.build.json` が自分の兄弟を継ぐだけ。

スパイクの仕事は、これらを**確認して覆すか、確定させるか**である。

このチケットは**コードを移植しない**。壊れ方と移植先を特定し、後続 3 枚が
迷わず進める地図を作る。

## Policies

- `workaholic:planning` / `policies/verify-before-building.md` — **このチケットの
  根拠となるポリシー。**「settle できた不確実性を、検証しないまま本開発に
  持ち込む状態を防ぐ」。PoC は「答えたい問いに答える範囲に留め、**捨てられる
  ものとして書く**」。だからこのスパイクはリポジトリ外のスクラッチで行い、
  成果物はコードではなくドキュメントである。
- `workaholic:implementation` / `policies/directory-structure.md` — 成果物は
  `docs/` に置く（`docs/npm-workspaces-decision.md` の先例）。スパイクのために
  新しいトップレベルディレクトリを作らない。
- `workaholic:operation` / `policies/ci-cd.md` — 「緑になった」ではなく「何を
  検査したか」。移植の前に**何がどう落ちるか**を実測で記録する。推測で移植を
  始めると、通らなかったときに原因が API なのか自分の書き方なのか切り分けられない。
- `workaholic:implementation` / `policies/objective-documentation.md` — 記録は
  実測値で書く。「動きそう」「たぶん対応している」は成果物にしない。
- `workaholic:design` / `policies/vendor-neutrality.md` — 依存の変更は決定として
  記録する。TS7 の unstable API に乗ることは、公式に不安定と宣言された面に
  乗る決定であり、その事実を残す。
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — 4 箇所の
  うち 3 つは既に `vendors/` 配下（腐敗防止の境界の内側）にある。移植先も
  その境界を越えないことを確認する。`scripts/typecheck.ts` はリポジトリ
  ツーリングなので別枠。

## Key Files

- 上表の 4 ファイル — 変更しない。読むだけ。
- `packages/plgg-bundle/DEPENDENCY-LOG.md` — ネイティブバインディングを排除した
  経緯の記録。トレードオフ計測の前提として読む。
- `packages/plgg-bundle/src/vendors/` — 第三者 import を閉じ込める境界。
  `scripts/gate-vendor-boundary.sh` が強制している。
- `scripts/typecheck.ts` — 全パッケージを 1 つの型グラフで検査する本命ゲート。
  incremental API に依存しているので移植の難度が最も高い可能性がある。

## Implementation Steps

1. スクラッチのディレクトリ（**リポジトリ外**）に `typescript@7.0.2` を入れ、
   実際に何が import できるかを確認する。`typescript/unstable/sync`,
   `unstable/async`, `unstable/ast/*` の実際の export を列挙する。
2. 4 箇所が使っている API 名 1 つ 1 つについて、TS7 側の対応物を特定する
   （同名で存在する / 名前が変わった / 概念ごと無い、の 3 分類）。**「無い」も
   立派な結果**なので、無理に対応づけない。
3. リポジトリのコピー（スクラッチ）で `typescript` を 7 に差し替え、
   `node scripts/typecheck.ts` と `npm run build` が**実際にどう落ちるか**の
   生の出力を採る。
4. 結果を `docs/typescript-7-api-gap.md` に書く。表形式で「旧 API →
   TS7 の対応物 → 移植の難度 → 未解決の懸念」。
5. ネイティブバイナリの実測を採る: `typescript@7` を入れた `node_modules` の
   サイズ、install 時間、`tsc --version` の起動時間。比較対象として 6.0.3 の
   同じ数字も採る。

## Quality Gate

**Acceptance criteria**

- `docs/typescript-7-api-gap.md` が存在し、上表の**全 API 名**（20 個弱）に
  ついて TS7 側の対応物または「無し」が書かれている。空欄が無いこと。
- 同ドキュメントに、実際に採った `typecheck` / `build` の**生の失敗出力**が
  引用されている（要約ではなく、実際に出たメッセージ）。
- 同ドキュメントに install サイズ・install 時間・`tsc --version` 起動時間の
  6.0.3 / 7.0.2 比較が数字で載っている。
- **リポジトリの `package.json` / lockfile / ソースは 1 バイトも変わっていない**:
  `git diff --stat -- . ':!docs'` が空。
- `./scripts/check-all.sh` が緑（この時点では何も壊していないので当然通る。
  通らなければスパイクが環境を汚している）。

**Verification method**

- ドキュメントを読み、空欄が無いことを目視 + `grep -c` で確認する。
- `git diff --stat` の出力を Final Report に貼る。

**Gate**

- 上記 5 点。特に「ソースが変わっていない」は、このチケットが調査に留まった
  ことの証明なので必須。

`Decided:` **実験はリポジトリ外のスクラッチで行う。** リポジトリ内で
`npm install typescript@7` を走らせると lockfile と `node_modules` が書き換わり、
他のチケットや並行作業を汚す。スクラッチなら失敗しても捨てるだけで済む
（`/drive` で開発者が上書き可）。

`Decided:` **「対応物が無い」を無理に埋めない。** unstable API に該当機能が
無いなら、それが最も重要な発見である。似た名前の API を当てはめて「たぶん
これ」と書くと、後続チケットがその推測の上に実装を積む（`/drive` で開発者が
上書き可）。

`Decided:` **成果物は `docs/` に置く。** リポジトリの決定記録は `docs/` に
置く慣習があり（`docs/npm-workspaces-decision.md` の先例）、後続 3 枚と将来の
読者が参照する（`/drive` で開発者が上書き可）。

## Considerations

- **incremental API が最大の難所になる見込み。** `scripts/typecheck.ts` は
  `createIncrementalProgram` + `createIncrementalCompilerHost` +
  `.tsbuildinfo` に依存しており、これは「全パッケージを 1 つの型グラフで、
  2 回目以降は差分で」という設計の中核。TS7 に等価物が無い場合、ゲートの
  設計自体を見直すことになる。**そうなったらこのスパイクで止めて報告する。**
- **`transpileModule` は 2 箇所で使われている。** plgg-bundle と plgg-test で
  同じ API に依存しているので、移植方針は共通化できる可能性が高い。
- **`typescript` は 2 つの公開パッケージの runtime `dependencies`。**
  `plgg-bundle` と `plgg-test` はどちらも devDependency ではなく本番依存として
  typescript を宣言している。したがって TS7 採用は **npm 利用者が install する
  ものを変える**。plgg-bundle の `description` は「no native binding」と名乗って
  いるので、スパイクはこの矛盾を明示的な問いとして扱うこと。
- **`emitDts` の `tscBin()` はパス演算で TS7 でも偶然動く。**
  `createRequire(...).resolve("typescript")` は TS6 では `lib/typescript.js`、
  TS7 では `lib/version.cjs` に着地するが、どちらも `dirname` が `<pkg>/lib` な
  ので `"../bin/tsc"` の join は成立する。**`lib/` がパッケージ直下にある限り**
  という前提に依存していることを記録すること。
- **unstable の意味を軽く見ない。** TS7 側が今後 API を変える前提で公開している
  面なので、「移植できた」と「移植し続けられる」は別問題。ドキュメントに
  その懸念を残すこと。
