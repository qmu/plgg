---
title: Quality Context
description: plgg プロジェクトの quality dimensions、assurance processes、metrics、gaps、および feedback loops
category: developer
modified_at: 2026-02-26T04:19:52+09:00
commit_hash: ddbb696
---

# Quality Context

このドキュメントは、plgg monorepo（packages: `plgg`、`plgg-kit`、`plgg-foundry`）のプロジェクト設定およびツールから観察可能な quality framework を記録します。

## Quality Dimensions

### 型安全性 (Type Safety)

**標準**: 型エラーの解決として `as`、`any`、`ts-ignore` の使用を禁止（enforced: `CLAUDE.md`）。TypeScript strict mode がすべての package で有効になっており、以下の flags が設定されています:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `allowUnusedLabels: false`
- `allowUnreachableCode: false`
- `exactOptionalPropertyTypes: true`
- `allowJs: false`
- `isolatedModules: true`
- `erasableSyntaxOnly: true`

**証拠**: `src/plgg/tsconfig.json`、`src/plgg-foundry/tsconfig.json`、`src/plgg-kit/tsconfig.json`、`CLAUDE.md`

**Enforcement**: 自動化済み — `tsc --noEmit` は CI (`run-tests.yml` の "Run TypeScript compilation check" step) で実行され、3つすべての package の `npm run test` の最初のステップでもあります。

### コードフォーマット (Code Formatting)

**標準**: すべての package で統一された設定で Prettier が適用されています:

- `printWidth: 50`
- `semi: true`
- `singleQuote: false`
- `trailingComma: "all"`
- `bracketSameLine: false`

**証拠**: `src/plgg/.prettierrc.json`、`src/plgg-foundry/.prettierrc.json`、`src/plgg-kit/.prettierrc.json`

**Enforcement**: 標準のみ（enforcement なし）。Prettier は設定されていますが、CI や pre-commit hooks での自動フォーマットチェックは実行されません。フォーマットへの準拠は手動です。

### テスト正確性 (Test Correctness)

**標準**: すべてのテストが merge 前にパスする必要があります。`npm run test` スクリプトは `plgg` package で `tsc --noEmit && vitest --run` を実行します。

**証拠**: `src/plgg/package.json` scripts、`src/plgg-foundry/package.json` scripts、`src/plgg-kit/package.json` scripts

**Enforcement**: 自動化済み — CI workflow `run-tests.yml` は `src/plgg` で `npm test` を実行します。

**観測値**: `plgg` の 61 spec files で 338 テスト passing（2026-02-26 観測）。

**Gap**: `plgg-kit` と `plgg-foundry` のテストは CI で実行されません。`run-tests.yml` workflow では `src/plgg` のテストのみ実行されます。

### テストカバレッジ (Test Coverage)

**標準 (plgg)**: vitest v8 provider により、statements、branches、functions、lines の 90% 閾値が enforced されています。

**証拠**: `src/plgg/vite.config.ts` — `thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }`

**Enforcement**: 自動化済み — CI `run-tests.yml` の "Run tests with coverage" step が `npm run coverage` を実行します。

**観測値**: 2026-02-26 時点のカバレッジ — statements: 89.81%（FAILING）、branches: 92.24%（passing）、functions: 90.2%（passing）、lines: 89.81%（FAILING）。`Abstracts/Principals` と `Abstracts/Servables` の interface-only files が 0% カバレッジを報告しており、全体の statements と lines を閾値以下に押し下げています。

**標準 (plgg-foundry、plgg-kit)**: 閾値は設定されていません。`coverage: { all: true }` は設定されていますが、thresholds がありません。

**証拠**: `src/plgg-foundry/vite.config.ts`、`src/plgg-kit/vite.config.ts`

**Enforcement**: `plgg-foundry` と `plgg-kit` については標準のみ（enforcement なし）。カバレッジは手動で実行可能ですが、これらの package に対するカバレッジを管理する CI step も threshold も存在しません。

### ビルド整合性 (Build Integrity)

**標準**: リリース前にライブラリが `vite build` で正常にビルドされる必要があります。

**証拠**: `src/plgg/package.json` build script、`run-tests.yml` の "Build library" step

**Enforcement**: 自動化済み — CI は、main へのすべての qualifying PR および push で `src/plgg` の `npm run build` を実行します。

### コードリンティング (Code Linting)

**標準**: 観測されていません。いずれの package root にも ESLint、Biome、またはその他の linter 設定は存在しません。

**Enforcement**: 観測されていません。CI や pre-commit hooks でリンティングは実行されません。

### アクセシビリティ (Accessibility)

**標準**: 観測されていません。アクセシビリティテストのツールは設定されていません。

**Enforcement**: 観測されていません。

### セキュリティ (Security)

**標準**: 一部観測されています。`.env` と `.env.*` ファイルは gitignore されています。Claude Code は、プロジェクト外の git 操作を防ぐために `Bash(git -C:*)` を deny するよう設定されています。

**証拠**: `.gitignore`、`.claude/settings.json`

**Enforcement**: 一部 — `.env` の除外は git レベルで enforced されています。CI で依存関係の脆弱性スキャン（`npm audit` など）は実行されていません。

### ドキュメント品質 (Documentation Quality)

**標準**: 正式には観測されていません。PR template は "Specification / Test Plan" セクションと self-review チェックリストを必須とします。Issue template は各 issue タイプに対して構造化された要件を enforced します。

**証拠**: `.github/workflows/start-pull-request.yml` の PR body template、`.github/ISSUE_TEMPLATE/TMPL_01_ADDITION.yml`

**Enforcement**: PR template の手動チェックリスト。自動ドキュメントリンティングや完全性チェックはありません。

---

## Assurance Processes

### CI: Run Tests (`run-tests.yml`)

**Trigger**: PR events `review_requested`、`synchronize`（`ci-testing` label が存在する場合）、`ci-testing` による `labeled`、および main への push。

**スコープ**: `src/plgg` package のみ。

**Enforcement mechanism**: 順次実行される GitHub Actions steps — TypeScript コンパイルチェック、テスト実行、ビルド、閾値付きカバレッジ。

**注意**: `ci-testing` label はレビューがリクエストされると自動的に適用されます。つまり、CI はすべての PR push で実行されるわけではなく、`ci-testing` label が存在するかレビューがリクエストされた場合にのみ実行されます。

**証拠**: `.github/workflows/run-tests.yml`

### CI: Prepare Release (`prepare-release.yml`)

**Trigger**: main への push。

**スコープ**: リポジトリレベル — `git-pr-release` を使用して、`main` から `release` branch へのリリース候補 PR にマージ済み PR を集約します。

**Enforcement mechanism**: リリース候補チェックリストを含む自動 PR 作成。

**証拠**: `.github/workflows/prepare-release.yml`

### CI: Release (`release.yml`)

**Trigger**: `release` branch への PR クローズ（マージ）。

**スコープ**: デプロイメントパイプラインスタブと release-drafter による CalVer リリースノート生成。

**証拠**: `.github/workflows/release.yml`

### CI: Start Pull Request (`start-pull-request.yml`)

**Trigger**: GitHub Issue の assigned。

**スコープ**: リポジトリレベル — 自動的に branch と draft PR を作成し、オープンなリンク済み PR が既に存在する場合はブロックします。

**証拠**: `.github/workflows/start-pull-request.yml`

### 手動: Self-Review チェックリスト

**Trigger**: PR 作成者によるレビューリクエスト前。

**スコープ**: すべての PR。

**Enforcement mechanism**: self-review の確認と証拠添付（デモビデオまたは画像）を必要とする PR template チェックリスト。準拠は手動です。

**証拠**: `start-pull-request.yml` の PR body template

### Pre-commit Hooks

**ステータス**: 設定されていません。`.husky/` ディレクトリは存在しません。`lint-staged` の設定も観測されていません。

---

## Quality Metrics

| Metric | 値 | ソース | 検証可能 |
|---|---|---|---|
| テスト数 (plgg) | 338 tests、61 files | ローカル実行 2026-02-26 | Yes |
| Statements カバレッジ (plgg) | 89.81% | ローカル実行 2026-02-26 | Yes |
| Branch カバレッジ (plgg) | 92.24% | ローカル実行 2026-02-26 | Yes |
| Function カバレッジ (plgg) | 90.2% | ローカル実行 2026-02-26 | Yes |
| Line カバレッジ (plgg) | 89.81% | ローカル実行 2026-02-26 | Yes |
| カバレッジ閾値 (plgg) | 全次元で 90% | `src/plgg/vite.config.ts` | Yes |
| カバレッジ閾値 (plgg-foundry) | 設定なし | `src/plgg-foundry/vite.config.ts` | Yes |
| カバレッジ閾値 (plgg-kit) | 設定なし | `src/plgg-kit/vite.config.ts` | Yes |
| CI テストスコープ | plgg のみ | `run-tests.yml` | Yes |
| Pre-commit hooks | なし | Filesystem | Yes |
| Lint ツール | なし | Filesystem | Yes |

---

## Quality Gaps

### Gap 1: plgg のカバレッジ閾値が未達

**期待される標準**: statements、branches、functions、lines で 90%（`src/plgg/vite.config.ts`）

**不足している enforcement**: Statements と lines は 89.81% であり、90% 閾値を下回っています。`Abstracts/Principals` と `Abstracts/Servables` 以下の abstract interface files は 0% カバレッジを報告しており、カバレッジスコープから除外されていません。

**影響**: quality-lead、test-lead

### Gap 2: plgg-foundry と plgg-kit のカバレッジ閾値なし

**期待される標準**: plgg の 90% 標準と一致するカバレッジ閾値。

**不足している enforcement**: `src/plgg-foundry/vite.config.ts` と `src/plgg-kit/vite.config.ts` は `coverage: { all: true }` を設定していますが、`thresholds` を省略しています。これらの package のカバレッジを実行する CI step も存在しません。

**影響**: quality-lead、test-lead

### Gap 3: CI で plgg-kit と plgg-foundry のテストが実行されない

**期待される標準**: すべての package のテストが CI で実行されるべきです。

**不足している enforcement**: `run-tests.yml` は `src/plgg` での依存関係のインストールとテスト実行のみを行います。`plgg-kit` と `plgg-foundry` のテストスイートは実行されません。

**影響**: quality-lead、test-lead

### Gap 4: コードリンティングなし

**期待される標準**: 正式には述べられていませんが、型安全性は高度に制約されています。TypeScript 型チェックを超えた静的解析は存在しません。

**不足している enforcement**: いずれの package レベルにも ESLint、Biome、または同等の linter が設定されていません。CI で linter は実行されません。

**影響**: quality-lead

### Gap 5: Prettier が自動的に enforced されていない

**期待される標準**: Prettier 設定が存在し、すべての package で一貫しています。

**不足している enforcement**: CI に `prettier --check` step が存在しません。`prettier` を実行する pre-commit hook も存在しません。フォーマット準拠は完全に手動です。

**影響**: quality-lead

### Gap 6: 依存関係の脆弱性スキャンなし

**期待される標準**: 正式には文書化されていませんが、セキュリティは認識された次元です。

**不足している enforcement**: CI で `npm audit` または同等のものは実行されません。依存関係の脆弱性は体系的に検出されません。

**影響**: quality-lead

### Gap 7: CI トリガーに手動 label が必要

**期待される標準**: すべての PR push でテストが実行され、早期シグナルを提供するべきです。

**観察された動作**: `run-tests.yml` は `ci-testing` label が既に存在する場合にのみ `synchronize` events で実行されます。すべての PR push で自動的にテストは実行されません。

**影響**: quality-lead、test-lead

---

## Feedback Loops

### カバレッジ失敗が CI をブロック

**接続**: `run-tests.yml` で `npm run coverage` が非ゼロで終了すると、workflow が失敗します。branch protection が CI のパスを要求する場合、PR のマージ準備が整っているとみなされなくなります。

**証拠**: `run-tests.yml` の "Run tests with coverage" step、`src/plgg/vite.config.ts` の thresholds

**制限**: カバレッジ閾値は現在パスしていません（statements/lines で 89.81% < 90%）。branch protection が CI ステータスを enforced しない場合、この feedback loop は参考情報のみとなります。

### TSC コンパイル失敗がテスト実行をブロック

**接続**: plgg での `npm run test` は vitest の前に `tsc --noEmit` を実行します。コンパイル失敗はテスト実行を即座に停止し、型エラーに対する迅速なフィードバックを提供します。

**証拠**: `src/plgg/package.json` の test script

### レビューリクエストが CI をトリガー

**接続**: PR にレビュアーをリクエストすると `ci-testing` label が追加され、テスト workflow がトリガーされます。これにより、コードレビューが実行される前に CI が実行されることが保証されます。

**証拠**: `review_requested` での `run-tests.yml` トリガー + label 追加ロジック

### PR Template Self-Review

**接続**: PR body template には必須チェックリストが含まれています。作成者はレビューをリクエストする前に self-review の確認と証拠の添付を確認する必要があります。

**証拠**: `start-pull-request.yml` の PR body

**制限**: これはドキュメント標準であり、自動チェックではありません。チェックリストを完了せずに PR を提出することを防ぐ enforcement は存在しません。
