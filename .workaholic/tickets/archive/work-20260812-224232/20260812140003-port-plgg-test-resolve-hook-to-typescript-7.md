---
created_at: 2026-08-12T14:00:03+09:00
author: a@qmu.jp
assignees: [a@qmu.jp]
type: refactoring
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260812140002-port-plgg-bundle-to-typescript-7.md]
mission: typescript-7-migration
merge_policy: auto
---

# plgg-test の TypeScript ローダフックを TS7 に移植する

## 経路決定（2026-08-13, split-version）— このチケットは検証のみに縮小

plgg-test は `typescript` ^6.0.3 の runtime 依存を保持するため、`hook.ts` の
**移植は不要**。検証（テスト本数一致・cross-runtime ゲート）は T2 の split 実装に
畳んだ。T2 の完了時にこのチケットは「split により移植不要、検証は T2 で実施」と
記録してアーカイブする。以下は経路決定前の本文（参考）。

## Overview

`packages/plgg-test/src/Resolve/hook.ts` は `ts.transpileModule` で `.ts` の
spec ファイルを実行時に JS へ変換する Node のローダフックである。これが
壊れると**全パッケージのテストが 1 本も走らない**。

plgg-bundle 側（先行チケット `20260812140002`）が同じ `transpileModule` を
移植しているので、その方針をそのまま踏襲できる見込みが高い。だから依存順で
後ろに置いてある — 二度考える必要がない。

## Policies

- `workaholic:implementation` / `policies/anti-corruption-structure.md` —
  `Resolve/hook.ts` は Node のローダ API と TypeScript の両方に触れる境界の
  ファイル。移植後も外向きのシグネチャがドメイン語彙のままであること。
- `workaholic:implementation` / `policies/coding-standards.md` — `as` / `any` /
  `ts-ignore` 禁止。
- `workaholic:implementation` / `policies/test.md` — テストランナー自身の変更は
  「テストが通った」で証明できない（壊れたランナーは何も落とさないことがある）。
  **走ったテストの本数**を前後で比較する。
- `workaholic:operation` / `policies/ci-cd.md` — 緑であることではなく、
  何を検査したかが証拠。

- `workaholic:implementation` / `policies/directory-structure.md` — 変更は既存の
  構造の中に収める。新しいトップレベルディレクトリを作らない。

## Key Files

- `packages/plgg-test/src/Resolve/hook.ts` — 移植対象。
- `docs/typescript-7-api-gap.md` — 対応表。
- `packages/plgg-bundle/src/vendors/transpiler.ts` — 同じ API を先に移植した
  先例。書き方を揃える。
- `scripts/gate-cross-runtime.sh` — plgg-test のスケジューラが Node / Deno /
  Bun で同一に振る舞うことを強制するゲート。**ローダフックの変更はこの
  ゲートに直接効く**ので必ず通すこと。
- `scripts/runTests.ts` — 正典のテストランナー。

## Implementation Steps

1. `docs/typescript-7-api-gap.md` と、plgg-bundle 側の移植済みコードを読む。
2. `hook.ts` を同じ方針で移植する。
3. plgg-test 自身のスイートを通す。
4. `./scripts/gate-cross-runtime.sh` を通す（Deno / Bun が入っていれば
   それらでも走る。入っていなければ Node のみで、その旨が出力に出る）。
5. 全パッケージのテストを走らせ、**走った本数**を移行前と比較する。

## Quality Gate

**Acceptance criteria**

- `npm --prefix packages/plgg-test run test` が緑。
- `./scripts/gate-cross-runtime.sh` が緑。
- `./scripts/check-all.sh` の test フェーズで、**移行前と同じ本数のテストが
  走っている**こと。移行前の本数を Final Report に記録し、移行後と並べる。
  本数が減っていたら、ローダが黙って spec を落としている可能性があるので不合格。
- 新規コードに `as` / `any` / `ts-ignore` が増えていない（前チケットと同じ
  grep で確認）。
- `node scripts/typecheck.ts plgg-test` が clean。

**Verification method**

- 上記をコマンドとして実行し、出力を Final Report に貼る。
- テスト本数は `check-all` の test フェーズ出力（`N checks` と各パッケージの
  `ok`）をそのまま引用する。

**Gate**

- 上記すべて。特に**テスト本数の一致**。

`Decided:` **テスト本数の比較を必須にする。** テストランナーの移植で最も
危険なのは「壊れて何も走らないのに緑に見える」ことで、緑という結果だけでは
それを区別できない。本数が唯一の安価な証拠である（`/drive` で開発者が上書き可）。

`Decided:` **plgg-bundle 側の移植方針をそのまま踏襲する。** 同じ
`transpileModule` を 2 通りに書くと、次に TS7 の API が動いたとき直す場所が
2 箇所になる（`/drive` で開発者が上書き可）。

## Considerations

- **cross-runtime ゲートが効く。** plgg-test は Node / Deno / Bun で同一に
  振る舞う制約があり（`worker_threads` を使わない理由でもある）、ローダフックは
  その最前線。TS7 のネイティブバイナリが Deno/Bun でどう解決されるかは
  未知数なので、ゲートが落ちたら**それは重要な発見**として報告すること。
- **`--experimental-strip-types` への置き換えを安易に選ばない。** `hook.ts` は
  `transpileModule` に `verbatimModuleSyntax: false` を渡しており、その理由が
  コメントに書かれている — ネイティブの型剥がしは構文上の型と `import type` しか
  除去せず、**型と値が混ざった import**（`import { ok, Apply1 }`）はそのまま残る。
  plgg のソースは `verbatimModuleSyntax` clean ではない（29 個中 6 個しか
  このフラグを立てていない）。したがって「Node の型剥がしに寄せる」道の真の
  コストは、**残り 23 パッケージを verbatim clean にすること**である。選ぶ前に
  その規模を測ること。
- **`typescript` は plgg-test の runtime `dependencies`。** devDependency では
  ないので、`^7` にすると npm 利用者に配布される。
- **ローダフックは実行時の依存。** ビルド時だけの依存と違い、テストを走らせる
  たびに TS7 が読み込まれる。起動時間の変化があれば記録する（ミッションの
  トレードオフ計測に効く）。

## Final Report

split-version(経路決定 2026-08-13)により**移植不要**。plgg-test は
`typescript: ^6.0.3` を runtime dependencies に保持し、`Resolve/hook.ts` は
無変更のまま nested TS6(`packages/plgg-test/node_modules/typescript@6.0.3`)の
`transpileModule` を解決し続ける。検証は T2(`20260812140002`、アーカイブ済み)で
実施した:

- `npm --prefix packages/plgg-test run test` → **147 passed, 0 failed, 0 skipped**
  (移行前と同数)。
- `./scripts/gate-cross-runtime.sh` → 緑。node / deno / bun 全てで
  `cross-runtime smoke: OK — 7 passed`。
- **テスト本数の前後一致**: 29 パッケージ個別の `N passed, M failed, K skipped`
  行を移行前後で採取し diff → 完全一致(ローダが spec を黙って落としていない
  ことの証拠)。
- check-all の test フェーズ: 移行前「30 checks — all green」→ 移行後
  「30 checks — all green」。
- `node scripts/typecheck.ts plgg-test` clean(nested TS6 の tsc で検査)。

起動時間: ローダは従来どおり TS6 を読み込むため変化しないのが期待どおりで、
スイート wall clock にも有意差は観測されなかった。
