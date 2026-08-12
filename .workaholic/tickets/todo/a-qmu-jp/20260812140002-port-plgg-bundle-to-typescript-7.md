---
created_at: 2026-08-12T14:00:02+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260812140001-map-the-typescript-7-api-gap.md]
mission: typescript-7-migration
merge_policy: auto
---

# plgg-bundle の 2 つのコンパイラ API 利用箇所を TS7 に移植する

## 経路決定（2026-08-13, split-version）— このチケットの範囲は変わった

**移植はしない。** plgg-bundle は `typescript` ^6.0.3 の runtime 依存を**保持**し、
`transpiler.ts` / `exportSurface.ts` は無変更のまま nested TS6 を解決する。
このチケットの新しい仕事は **split-version 構成の実装と検証**:

1. 27 manifest（plgg-bundle / plgg-test 以外）の `typescript` を `^7.0.2` に上げ、
   root lockfile を再生成する。root hoist が TS7、`packages/plgg-bundle/node_modules/typescript`
   と `packages/plgg-test/node_modules/typescript` に TS6 が nested されることを
   `npm ls typescript` で確認する。
2. TS6 側 3 消費者が split 後も動くことを検証する（旧 T3・T6 の内容をここに畳む）:
   `vendor-boundary-analyzer.mjs`（requireFromBundle → nested TS6 の
   `preProcessFile`）、plgg-test の `Resolve/hook.ts`、plgg-bundle の transpile。
   gate-vendor-boundary / gate-cross-runtime / 全テスト本数一致で示す。
3. emitDts の `tscBin()` は**対象パッケージから** typescript を解決するので、27
   パッケージの宣言生成は TS7 native tsc に切り替わる。代表 3 パッケージの
   dist/.d.ts を移行前後で比較し、差分を説明する（既存の受入どおり）。

以下の本文は経路決定前の記述であり、API 対応表・ライフサイクリの注意は
参考情報として残す。「対応表に無しなら止める」の Decided は**この決定で解消済み**。

## Overview

`packages/plgg-bundle` は 2 箇所で TypeScript のコンパイラ API を使っている。
どちらもリポジトリ全体のビルド経路にあり、壊れると全パッケージの `dist` が
出なくなる。

- `src/vendors/transpiler.ts` — `ts.transpileModule` で TS を JS に変換する。
  バンドラの中核。
- `src/vendors/exportSurface.ts` — `ts.createProgram` + `ts.TypeChecker` +
  `ts.SymbolFlags` で、モジュールの export 面を型情報から読み取る。

先行チケット `20260812140001` が作る `docs/typescript-7-api-gap.md` の対応表に
従って移植する。**対応表に「無し」と書かれた API があれば、そこで止めて報告する**
（迂回を発明しない）。

**着手前から分かっている難度（Codex 実査、2026-08-12）**: `transpileModule` は
7.0.2 に存在しない — つまり `transpiler.ts` の移植は「同名 API への差し替え」では
なく、スパイクが特定した道筋（`unstable/ast` ベースの変換、または別の結論）に
沿った**再実装**になる。`exportSurface.ts` 側は `getExportsOfModule` /
`getAliasedSymbol` が `unstable/sync` の `Checker` に実在するが、TS7 の
ライフサイクルは `API → Snapshot → Project → checker` で旧 `createProgram`
モデルと異なるため、こちらも import 差し替えでは済まない。

## Policies

- `workaholic:implementation` / `policies/anti-corruption-structure.md` — この
  2 ファイルは `vendors/` 配下、つまり第三者依存を閉じ込める境界の内側にある。
  移植後も**外向きの関数シグネチャがドメイン語彙のまま**であること。TS7 の型が
  plgg-bundle のドメイン署名に漏れ出してはならない。
- `workaholic:implementation` / `policies/coding-standards.md` — `as` / `any` /
  `ts-ignore` は禁止。unstable API の型が緩い場合でも、caster を通して narrow
  する。**型が合わないことを型の無効化で解決しない。**
- `workaholic:implementation` / `policies/functional-programming.md` — 副作用は
  薄いシェルに集める。既存の構造を保つ。
- `workaholic:operation` / `policies/ci-cd.md` — 移植の証拠は「ビルドが通った」
  ではなく「**出力が等価である**」こと。バンドラは出力物が成果なので、
  出力を比較する。

- `workaholic:implementation` / `policies/directory-structure.md` — 変更は既存の
  構造の中に収める。新しいトップレベルディレクトリを作らない。

## Key Files

- `packages/plgg-bundle/src/vendors/transpiler.ts` — 移植対象。
- `packages/plgg-bundle/src/vendors/exportSurface.ts` — 移植対象。
- `docs/typescript-7-api-gap.md` — 先行チケットの成果。移植先の対応表。
- `scripts/gate-vendor-boundary.sh` — 第三者 import が `vendors/` の外に
  出ていないことを強制するゲート。移植で import 元が変わるので、ゲートが
  新しい specifier（`typescript/unstable/*`）を許すか確認すること。
- `scripts/vendor-boundary-exemptions.txt` — 例外リスト。増やさないこと。
- `packages/plgg-bundle/src/**/*.spec.ts` — 既存のテスト。移植で挙動が
  変わらないことの一次証拠。

## Implementation Steps

1. スクラッチではなく**このリポジトリの worktree で** `typescript@7` に
   差し替える（このチケットから先は実際に移行する）。
2. `transpiler.ts` を対応表に従って移植する。
3. `exportSurface.ts` を移植する。`TypeChecker` 相当が unstable API でどう
   表現されるかは対応表を見る。
4. `gate-vendor-boundary.sh` が新しい import specifier を正しく扱うか確認し、
   必要なら**ゲート側**を直す（例外リストに逃がさない）。
5. plgg-bundle 自身のテストを通す。
6. **移行前の出力を保存しておき、移行後と比較する。** 少なくとも
   `packages/plgg/dist/index.es.js` と `index.d.ts` について、差分が
   説明可能であること（バイト一致は求めない）。

## Quality Gate

**Acceptance criteria**

- `npm --prefix packages/plgg-bundle run test` が緑。
- `./scripts/build.sh` が全 29 パッケージの `dist` を出す（1 つも失敗しない）。
- 代表 3 パッケージ（`plgg`, `plgg-view`, `plggpress`）について、移行前後の
  `dist/index.es.js` と `dist/index.d.ts` の差分が取られ、**差分が 0 か、
  差分の中身が Final Report で説明されている**。「たぶん同じ」は不可。
- `./scripts/gate-vendor-boundary.sh` が緑、かつ
  `scripts/vendor-boundary-exemptions.txt` の**行数が増えていない**。
- 新規コードに `as` / `any` / `ts-ignore` が増えていない:
  `git diff origin/main..HEAD -- '*.ts' | grep -E '^\+.*(\bas\b |: any|ts-ignore)'`
  が空。
- `node scripts/typecheck.ts plgg-bundle` が clean。

**Verification method**

- 上記をコマンドとして実行し、出力を Final Report に貼る。
- dist 比較は移行前の `dist` をコピーしておき `diff` を取る。手順も報告に書く。

**Gate**

- 上記すべて。特に**出力の等価性**と**例外リストが増えていないこと**。

`Decided:` **`.d.ts` の差分はバイト一致を求めない。** 宣言生成の整形が変わる
可能性があり、意味が同じなら受け入れる。ただし**差分が出たら中身を説明する**
義務は残す — 説明できない差分は等価性の証拠にならない（`/drive` で開発者が
上書き可）。

`Decided:` **vendor-boundary ゲートが新 specifier を弾く場合、ゲートを直す。**
例外リストに逃がすと、境界の意味が薄れる。`typescript/unstable/*` は
`typescript` と同じ第三者依存なので、ゲートが同じ扱いをするのが正しい
（`/drive` で開発者が上書き可）。

`Decided:` **対応表に「無し」がある API に当たったら止めて報告する。** 迂回を
発明すると、バンドラの中核に unstable な自作互換層が生えることになる
（`/drive` で開発者が上書き可）。

## Considerations

- **このチケットが通らないと後続 3 枚が意味を持たない。** plgg-bundle は全
  パッケージのビルド経路なので、ここが落ちると `check-all` 全体が動かない。
  依存順で最初に置いてあるのはそのため。
- **`exportSurface.ts` のほうが難度が高い見込み。** `transpileModule` は
  純粋な変換だが、`TypeChecker` は型情報の問い合わせで、unstable API の
  設計思想がそもそも違う可能性がある。
- **出力比較は移行前に採る。** 移行してから「前はどうだったか」は取り戻せない。
  手順の最初に退避を入れること。
