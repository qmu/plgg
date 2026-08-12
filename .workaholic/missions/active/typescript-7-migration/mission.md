---
type: Mission
title: TypeScript 7 migration
slug: typescript-7-migration
status: active
merge_policy: auto
created_at: 2026-08-12T13:59:30+09:00
author: a@qmu.jp
assignees: [a@qmu.jp]
assignee:
predicted_hours:
actual_hours:
tickets: []
stories: []
gate_type:
gate_target:
gate_assert:
---

# TypeScript 7 migration

## Goal

このリポジトリの中心的な主張は「エスケープハッチを禁じ、コンパイラに落とし穴を
検出させる」ことである。したがって **TypeScript は普通の依存ではなく、保証の土台**
であり、そのメジャー更新は普通のバンプではない。

TypeScript 7 は 6.x の後継バージョンではなく **Go による再実装**で、2 つの点で
別物になっている。

1. **配布形態** — `typescript@7.0.2` は 20 個のプラットフォーム別ネイティブ
   バイナリ（`@typescript/typescript-linux-x64` ほか）を optional dependency として
   同梱する。このリポジトリは過去に rolldown の darwin 限定バインディングで CI を
   壊しており、vite を落とす作業自体が「そのクラスの依存を排除するためにあった」と
   `packages/plgg-bundle/DEPENDENCY-LOG.md` に記録されている。
2. **API** — `exports["."]` が `./lib/version.cjs` だけになり、従来の JS コンパイラ
   API は `typescript/unstable/*` 配下（`unstable/sync`, `unstable/async`,
   `unstable/ast/*`）に移動した。名前のとおり公式に unstable と宣言されている。

このリポジトリは 4 ファイルがそのコンパイラ API に依存しており、**バンドラ・
テストランナー・全体型チェックゲートが同時に壊れる**。dependabot PR #112 は
29 の manifest とルート lockfile を正しく書き換えているが、**そのままマージすれば
ビルドできなくなる**。

このミッションのゴールは **TS7 への移行を完了させること**である。判断だけを
成果物にはしない。ただし移行の途中で unstable API が必要な表現力を持たないと
分かった場合、それは「押し切る」対象ではなく、根拠を添えてミッションを
`carried` または `abandoned` で閉じる事由になる。

ネイティブバイナリは**即 NG ではなく、計るべきトレードオフ**として扱う
（開発者判断 2026-08-12）。install サイズ・CI 時間・型チェック時間を実測し、
得失を数字で残す。

## Experience

移行が完了した状態は、外から次のように観察できる。

- `packages/*/package.json` 29 本と ルート lockfile が `typescript` 7 系を指し、
  `npm ls typescript` が 7.x を返す。
- `node scripts/typecheck.ts` が全パッケージを clean で通す。**エラーを
  `as` / `any` / `ts-ignore` で黙らせた箇所が 1 つも無い**（差分の機械的検査で示す）。
- `./scripts/check-all.sh` が緑（exit 0）。すなわち plgg-bundle が全パッケージの
  dist と `.d.ts` を出し、plgg-test が全スイートを走らせ、全ゲートが通る。
- `plgg-bundle` が出力する `dist/*.es.js` / `*.cjs.js` / `*.d.ts` が、移行前後で
  **意味的に等価**であることが示されている（バイト一致を求めない代わりに、
  何がどう変わったかを説明できる）。
- ネイティブバイナリのトレードオフが数字で記録されている — `node_modules` の
  サイズ、install 時間、`typecheck` の wall clock、CI の実測値の前後比較。
- dependabot PR #112 が**閉じているか、このミッションの成果に置き換わっている**。

移行が完了しない場合に観察できる状態も同じくらい重要である。unstable API で
表現できないものが特定され、それが何で、なぜかが記録され、`carried` の
後継ミッションか、6.x に留まる判断として残っている。

## Acceptance

- [ ] TS7 で何がどう壊れるかが実測で特定され、4 ファイルそれぞれの移植方針が unstable API の実在するシンボルに対応づけられている (#20260812140001-map-the-typescript-7-api-gap.md)
- [ ] 4 つのコンパイラ API 利用箇所すべてが TS7 で動作し、`node scripts/typecheck.ts` と `./scripts/check-all.sh` が緑になる (#20260812140004-port-the-typecheck-gate-to-typescript-7.md)
- [ ] TS7 が 29 manifest とルート lockfile に採用され、ネイティブバイナリのトレードオフが数字で記録され、PR #112 が始末されている (#20260812140005-adopt-typescript-7-and-record-the-tradeoff.md)

## Changelog

- 2026-08-12 — mission created — mission.md
- 2026-08-12 — ticket added — 20260812140001-map-the-typescript-7-api-gap.md
- 2026-08-12 — ticket added — 20260812140002-port-plgg-bundle-to-typescript-7.md
- 2026-08-12 — ticket added — 20260812140003-port-plgg-test-resolve-hook-to-typescript-7.md
- 2026-08-12 — ticket added — 20260812140004-port-the-typecheck-gate-to-typescript-7.md
- 2026-08-12 — ticket added — 20260812140005-adopt-typescript-7-and-record-the-tradeoff.md
