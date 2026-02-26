---
title: Quality Policy
description: plgg monorepo のリンティング、フォーマット、コードレビュー、品質メトリクス、および型安全性の実践
category: developer
modified_at: 2026-02-26T00:00:00+09:00
commit_hash: ddbb696
---

[English](quality.md) | [Japanese](quality_ja.md)

# Quality Policy

このドキュメントは、plgg monorepo（packages: `plgg`、`plgg-kit`、`plgg-foundry`）に
おけるすべての実装済み品質実践を記述します。すべての記述は、リポジトリ内で実装され
実行可能な実践のみを反映しています。コードベースに証拠がない領域は「not observed」
と記載されています。

## リンティングとフォーマット (Linting and Formatting)

いずれの package にも JavaScript または TypeScript の linter（ESLint、Biome、または
同等品）は設定されていません。静的解析の役割は、strict mode で動作する TypeScript
コンパイラによってすべて果たされています。`src/plgg/`、`src/plgg-kit/`、
`src/plgg-foundry/` のいずれにも linter 設定ファイルは存在しません。

Prettier は各 package のルートにある `.prettierrc.json` ファイルを介して、3 つの
package すべてで同一に設定されています。共有設定では以下が強制されます:
`printWidth: 50`、`semi: true`、`singleQuote: false`、`trailingComma: "all"`、
`bracketSameLine: false`（出典: `src/plgg/.prettierrc.json`、
`src/plgg-kit/.prettierrc.json`、`src/plgg-foundry/.prettierrc.json`）。
CI や pre-commit hook では自動フォーマッターチェックは実行されていません。
フォーマットの準拠は規約のみで強制されています。

## コードレビュー (Code Review)

pull request は、GitHub issue が割り当てられたときに `start-pull-request` workflow
（`.github/workflows/start-pull-request.yml`）によって自動的に作成されます。
この workflow は、4 つの必須セクション（Target（リンクされた issue）、
Specification / Test Plan、Additional Instructions、レビュー前チェックリスト）を
含む PR body template を生成します。チェックリストでは、作成者がレビューを
リクエストする前に自己レビュー（機密情報、タイポ、無関係な変更、デバッグコードがない
こと）を確認し、証拠（デモ動画または画像）を添付することが必要です。

レビュアーをリクエストすると 2 つのアクションがトリガーされます: `ci-testing` label
が PR に自動的に追加され（`.github/workflows/run-tests.yml`）、CI テストスイートが
起動します。この結合により、人間によるレビューが始まる前にテストが実行されることが
保証されます。PR ブランチへのその後の push は、`ci-testing` label が存在する場合
のみ CI を再実行し、ドラフトや作業中の push での冗長な実行を防ぎます。

PR body template と自己レビューチェックリストはドキュメント標準としてのみ強制
されます。チェックリストが不完全な PR の提出を防ぐ自動メカニズムはありません。

## 品質メトリクス (Quality Metrics)

`plgg` package は、statements、branches、functions、lines の 4 つの次元すべてで
90% のカバレッジ閾値を強制しています。これらの閾値は `src/plgg/vite.config.ts` の
vitest `test.coverage.thresholds` ブロックに設定されており、v8 プロバイダーを使用
しています。カバレッジ出力形式は `text`、`lcov`、`html` です。閾値チェックは、
`run-tests` workflow のステップ「Run tests with coverage」（`src/plgg` での
`npm run coverage`）として CI で実行されます。

`plgg-foundry` と `plgg-kit` packages は、それぞれの `vite.config.ts` ファイルで
`coverage: { all: true }` を設定していますが、`thresholds` ブロックを定義していません。
これらの packages のカバレッジを実行する CI ステップはありません。それらのカバレッジ
出力はゲートされていません。

いずれの package にも、循環的複雑度の制限、重複検出、またはバンドルサイズバジェットは
設定されていません。

## 型安全性 (Type Safety)

TypeScript strict mode は、各 package の `tsconfig.json` で定義された同一の
`compilerOptions` セットにより、3 つの package すべてで有効になっています。有効な
フラグは次のとおりです: `strict`、`noUnusedLocals`、`noUnusedParameters`、
`noUncheckedIndexedAccess`、`noImplicitReturns`、`noFallthroughCasesInSwitch`、
`allowUnusedLabels: false`、`allowUnreachableCode: false`、
`exactOptionalPropertyTypes`、`skipLibCheck`、`isolatedModules`、
`allowJs: false`、`erasableSyntaxOnly`（出典: `src/plgg/tsconfig.json`、
`src/plgg-foundry/tsconfig.json`、`src/plgg-kit/tsconfig.json`）。

ルートの `CLAUDE.md` は、最高優先ルールとして、`as`、`any`、`@ts-ignore` が
いかなる状況においても型エラーの解決策として厳しく禁止されていることを宣言しています。
この禁止は、`.workaholic/constraints/quality.md` に記録されたプロジェクトレベルの
constraint です。

型チェックは 2 か所で強制されています。第一に、3 つの package すべての `npm run test`
は vitest を呼び出す前に `tsc --noEmit` を実行します（出典: 各 `package.json` の
`scripts.test`）。コンパイルの失敗はテスト実行を即座に停止させます。第二に、CI の
`run-tests` workflow（`.github/workflows/run-tests.yml`）は、テストステップの前に
`src/plgg` で専用のステップ「Run TypeScript compilation check」
（`npx tsc --noEmit`）を実行します。ローカルのシェルスクリプト `sh/tsc-plgg.sh`、
`sh/tsc-plgg-foundry.sh`、`sh/tsc-plgg-kit.sh` はローカル使用のための
package 固有のコンパイルゲートを提供します。

## Observations

品質スタックは主に TypeScript の strict コンパイラを正確性レイヤーとして依存しています。
monorepo は同一の最大 strict `tsconfig.json` を 3 つの package すべてに適用しており、
プロジェクトの最高位のルールは型エスケープハッチの禁止です。カバレッジ閾値はコアの
`plgg` package の CI によって強制されています。CI パイプラインは、`plgg` の逐次
ステップとして型チェック、テスト、カバレッジ、ビルド検証を統合しています。PR workflow
はレビューリクエストを CI トリガーと結合し、人間によるレビューの前にテストが実行される
ことを保証しています。Prettier はすべての package で均一に設定されており、作成者が
手動で適用する際のフォーマットの一貫性を提供します。

品質マネージャーの constraint ドキュメント（`.workaholic/constraints/quality.md`）は、
どの領域が constrained でどの領域が意図的に unconstrained であるかを明示的に文書化して
います。`plgg-foundry` と `plgg-kit` のカバレッジ閾値ギャップ、それらの package の
CI テストの欠如、および自動 Prettier enforcement の欠如は、定義されたコンプライアンス
基準を持つ open constraint として記録されています。

## Gaps

**linting なし**: いずれの package にも ESLint、Biome、または同等の linter は設定
されていません。TypeScript strict mode が唯一の静的解析メカニズムです。Not observed。

**Prettier が自動的に強制されていない**: 同一設定の `.prettierrc.json` ファイルが
3 つ存在していますが、CI で `prettier --check` ステップは実行されず、ステージング
ファイルに Prettier を適用する pre-commit hook もありません。フォーマットの準拠は
手動です。自動 enforcement として Not observed。

**plgg-foundry と plgg-kit のカバレッジ閾値が欠如**: 両 package は `coverage: { all: true }`
を設定していますが、`vite.config.ts` ファイルに `thresholds` ブロックを定義していません。
どちらの package にも自動カバレッジゲートは存在しません。Not observed。

**CI テストスコープが plgg に限定**: `run-tests.yml` workflow は `src/plgg` のみで
依存関係をインストールし、テストを実行します。`src/plgg-kit` と `src/plgg-foundry` の
テストは CI で実行されません。それらの packages については Not observed。

**依存関係の脆弱性スキャンなし**: いずれの CI workflow でも `npm audit` または同等の
ものは実行されません。依存関係の脆弱性は自動的に検出されません。Not observed。

**複雑度または重複の閾値なし**: いずれの package にも循環的複雑度の制限、コード重複の
閾値、または同様のメトリクスは設定されていません。Not observed。

**pre-commit hook なし**: `.husky/` ディレクトリまたは `lint-staged` 設定は存在
しません。すべてのマージ前チェックは CI で実行されるか手動です。Not observed。
