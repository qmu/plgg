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

このリポジトリは **5 ファイル**がそのコンパイラ API に依存しており、**バンドラ・
テストランナー・全体型チェックゲート・vendor-boundary ゲートが同時に壊れる**。
dependabot PR #112 は 29 の manifest とルート lockfile を正しく書き換えているが、
**そのままマージすればビルドできなくなる**。

### 着手前に判明している最大のリスク

計画時の調査で、**移行の可否を左右する事実**が 2 つ出ている。どちらも
スパイク（T1）が最優先で確定させる。

1. **`transpileModule` が TS7 に存在しない。** 7.0.2 の `dist/` を横断検索しても
   出てこない。`unstable/sync` の `Emitter` が持つのは `printNode(node, options)`
   のみ。これは plgg-bundle と plgg-test の**両方**が使っている中核 API である。
2. **`preProcessFile` も存在せず、代替も見当たらない。** これは 5 番目の利用箇所
   `scripts/vendor-boundary-analyzer.mjs` が使っており、**check-all の最初の
   ゲート**を動かしている。しかもこのファイルは `.mjs` で
   `scripts/tsconfig.json` の `include: ["*.ts"]` から外れており、**型チェックでは
   絶対に検出できない**。「tsc が通ったから移行できた」と判断すると、壊れた
   ゲートを緑と report することになる。

`exportSurface.ts` が使う `getExportsOfModule` / `getAliasedSymbol` は
`unstable/sync` の `Checker` に対応物がある見込みで、そこは相対的に楽観できる。
つまり**壁は型検査側ではなく変換（emit）側**にある。

補足として、TS7 の `tsc` に 29 個の `tsconfig.json` を食わせた実測では、
28 個が診断ゼロで通る（唯一落ちる `plgg-cms` は TS 6.0.3 でも同じく落ちる
既存の dist 陳腐化で、TS7 起因ではない）。**コンパイラオプションの互換性は
問題ではない。**

### ゴール

このミッションのゴールは **TS7 への移行を完了させること**である（開発者判断
2026-08-12）。判断だけを成果物にはしない。ただし上の 2 点により、移行が
**技術的に成立しない可能性が実在する**。unstable API が必要な表現力を持たないと
確定した場合、それは「押し切る」対象ではなく、根拠を添えてミッションを
`carried` または `abandoned` で閉じる事由になる。その場合の終端状態も
成果物として定義してある（T5 の decline 記録）。

ネイティブバイナリは**即 NG ではなく、計るべきトレードオフ**として扱う
（開発者判断 2026-08-12）。install サイズ・CI 時間・型チェック時間を実測し、
得失を数字で残す。

### 急ぐ理由は無い、という事実

`.workaholic/constraints/project.md` の Dependency Currency は
**「security-relevant packages」「a package with a known CVE」に限定**されており、
TS 7.0.2 にも `@types/node` 26.2.0 にも CVE は無い。**30 日の時計は動いていない。**
このミッションを SLA 由来の締切で急がせないこと。「6.x に留まる」は SLA 違反では
なく、正当な終端状態である。

### 過去に同じ機構で本番 CI が壊れている

ネイティブバイナリの話は抽象的なリスクではない。
`.workaholic/tickets/archive/work-20260626-221353/20260626130000-fix-deploy-guide-rolldown-binding.md`
が記録しているとおり、**Deploy Guide は main への push のたびに落ちていた** —
`Cannot find module '@rolldown/binding-linux-x64-gnu'`。原因は npm の
optional-dependency lockfile platform skew（npm/cli#4828）で、**darwin/arm64 の
ホストで lockfile を再生成すると linux-x64 のバインディングノードが刈られる**。

条件は当時より悪い。この開発ホストは **aarch64**、CI は **ubuntu-latest
（linux-x64）**、そして workspaces 移行後は**追跡された lockfile が 1 本だけ**で、
全パッケージがそこから install される。当時の緩和策（deploy ループ内の
`rm -f package-lock.json`）は**もう存在しない**。

さらに `packages/plgg-bundle/DEPENDENCY-LOG.md` の headline policy は
`vendor-neutrality` を引いて「**脆いネイティブバインディングへの再ロックを禁じる**」
と書いている。plgg-bundle はまさにそのために作られた。

### 公開パッケージに影響する

`typescript` は **2 つの公開パッケージの runtime `dependencies`** である
（`plgg-bundle` と `plgg-test`、いずれも devDependency ではない）。したがって
`^7` に上げると、**npm の利用者に壊れたバンドラとテストランナーが配布される**。
この 2 つの manifest は残り 27 と同列に扱えない。plgg-bundle の `description` が
「zero new dependencies — reuses the project's own TypeScript, **no native binding**」
と名乗っている点とも正面から衝突する。

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

- [ ] TS7 で何がどう壊れるかが実測で特定され、5 ファイルそれぞれの移植方針が unstable API の実在するシンボルに対応づけられている (#20260812140001-map-the-typescript-7-api-gap.md)
- [ ] 5 つのコンパイラ API 利用箇所すべてが TS7 で動作し、`node scripts/typecheck.ts` と `./scripts/check-all.sh` が緑になる (#20260812140004-port-the-typecheck-gate-to-typescript-7.md)
- [ ] TS7 が 29 manifest とルート lockfile に採用され、負の対照コーパスが依然として拒否され、ネイティブバイナリのトレードオフが数字で記録され、PR #112 が始末されている (#20260812140005-adopt-typescript-7-and-record-the-tradeoff.md)

## Changelog

- 2026-08-12 — mission created — mission.md
- 2026-08-12 — ticket added — 20260812140001-map-the-typescript-7-api-gap.md
- 2026-08-12 — ticket added — 20260812140002-port-plgg-bundle-to-typescript-7.md
- 2026-08-12 — ticket added — 20260812140003-port-plgg-test-resolve-hook-to-typescript-7.md
- 2026-08-12 — ticket added — 20260812140004-port-the-typecheck-gate-to-typescript-7.md
- 2026-08-12 — ticket added — 20260812140005-adopt-typescript-7-and-record-the-tradeoff.md
- 2026-08-12 — ticket added — 20260812140006-port-the-vendor-boundary-analyzer-to-typescript-7.md
