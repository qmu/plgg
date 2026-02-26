---
manager: quality-manager
last_updated: 2026-02-26T04:19:52+09:00
---

# Quality

quality manager の領域は、plgg monorepo のすべての package（`plgg`、`plgg-kit`、`plgg-foundry`）にわたる型の正確性、テストカバレッジ、フォーマットの一貫性、および CI enforcement に及びます。

## 型エスケープの禁止 (Type Escape Prohibition)

**Bounds**: すべての package のいずれの TypeScript ソースファイルにおいても、型エラーの解決として `as`、`any`、または `@ts-ignore` を使用することを禁止します。

**Rationale**: これらのエスケープハッチは、プロジェクトの主要な正確性保証である厳格な TypeScript コンパイラ設定をバイパスします。一度許可されると、ライブラリ設計全体が依存する型安全性の不変条件が侵食されます。

**影響対象**: TypeScript ソースファイルを変更するすべての leader agents（quality-lead、すべての実装 leader）。

**Criterion**: `git grep -n 'as any\|@ts-ignore\| as .*[A-Z]' src/` がプロジェクトソースディレクトリに結果を返さず、`tsc --noEmit` が 0 で終了する場合に準拠。両条件が満たされている場合に準拠とします。

**Review trigger**: TypeScript のメジャーバージョンがより安全な代替手段を導入した場合に再検討してください（例: `satisfies` 演算子は既に存在します。将来の構文は例外を追加する前に評価してください）。

---

## TypeScript Strict Mode

**Bounds**: すべての package は `src/plgg/tsconfig.json` で定義された完全な strict コンパイラフラグセットを維持する必要があります。このセットのいずれのフラグも削除または `false` に設定することはできません。セットには以下が含まれます: `strict`、`noUnusedLocals`、`noUnusedParameters`、`noUncheckedIndexedAccess`、`noImplicitReturns`、`noFallthroughCasesInSwitch`、`exactOptionalPropertyTypes`、`allowUnreachableCode: false`、`allowUnusedLabels: false`、`allowJs: false`、`isolatedModules`、`erasableSyntaxOnly`。

**Rationale**: package 間で一貫した strict mode を維持することで、暗黙的な型変換なしに `plgg`、`plgg-kit`、`plgg-foundry` 間で型がポータブルになります。一方の package で緩和されたフラグを許可すると、境界の不一致が生じます。

**影響対象**: quality-lead、`tsconfig.json` ファイルを変更するすべての leader。

**Criterion**: `diff src/plgg/tsconfig.json src/plgg-foundry/tsconfig.json` および `diff src/plgg/tsconfig.json src/plgg-kit/tsconfig.json` が `compilerOptions` フラグに差異を示さない場合に準拠（`paths`、`rootDir`、`outDir` などのパス固有フィールドは除外）。

**Review trigger**: TypeScript が `strict` の一部となる新しいフラグをリリースした場合、またはプロジェクトが採用した場合に再検討してください。

---

## テストカバレッジ閾値 (Test Coverage Thresholds)

**Bounds**: すべての package（`plgg`、`plgg-foundry`、`plgg-kit`）は、statements、branches、functions、lines について最低 90% の vitest coverage thresholds を設定する必要があります。`plgg` package はすでに `src/plgg/vite.config.ts` でこれを enforced しています。`plgg-foundry` と `plgg-kit` は現在未拘束です。

**Rationale**: サテライト package（`plgg-kit`、`plgg-foundry`）での拘束されていないカバレッジは、非対称な品質基準を生み出します。これらの package への変更は、自動シグナルなしに後退する可能性があります。

**影響対象**: quality-lead、test-lead。

**Criterion**: `src/plgg-foundry/vite.config.ts` と `src/plgg-kit/vite.config.ts` がそれぞれ `statements`、`branches`、`functions`、`lines` のすべてが少なくとも 90 に設定された `thresholds` ブロックを含み、各 package で `npm run coverage` が 0 で終了する場合に準拠。

**Review trigger**: `plgg` の `Abstracts/Principals` と `Abstracts/Servables` カバレッジ除外の問題が解決された後に再検討してください。90% が適切な下限であるか、引き上げるべきかを検討してください。

---

## カバレッジスコープ除外 (Coverage Scope Exclusions)

**Bounds**: 実行可能なステートメントを含まない abstract interface-only files（例: `plgg` の `Abstracts/Principals/*.ts`、`Abstracts/Servables/*.ts`）は、`vite.config.ts` の coverage `exclude` 配列にリストされる必要があります。閾値への準拠評価においてカウントされてはなりません。

**Rationale**: Interface-only TypeScript files は実行可能なコードがないため、定義上 0% カバレッジを生成します。それらを含めると、カバレッジレポートが `plgg` の閾値（statements と lines が 90% 閾値に対して 89.81%）で失敗する原因となり、これはテスト品質についての誤ったシグナルです。

**影響対象**: quality-lead、test-lead。

**Criterion**: `src/plgg` で `npm run coverage` が 0 で終了し、かつレポートで 0% カバレッジを示すすべてのファイルが、型レベルのコンストラクタのみ（インターフェース、型エイリアス、実装のない抽象宣言）を含むファイルである場合に準拠。

**Review trigger**: 新しい abstract-only モジュールがいずれかの package に追加されるたびに再検討し、除外リストが完全であることを確認してください。

---

## CI テストスコープ (CI Test Scope)

**Bounds**: CI workflow `run-tests.yml` は、テストスイートを持つすべての package のテストを実行する必要があります。現在、CI でテストされているのは `src/plgg` のみです。`src/plgg-kit` と `src/plgg-foundry` は未拘束 — それらのテストは CI で実行されません。

**Rationale**: `plgg-kit` または `plgg-foundry` への変更は、CI シグナルなしに独自のテストスイートを壊す可能性があります。これらの package の CI カバレッジがないということは、後退がローカルでのみ検出されることを意味します。

**影響対象**: quality-lead、test-lead。

**Criterion**: `.github/workflows/run-tests.yml` が `src/plgg`、`src/plgg-kit`、`src/plgg-foundry` のそれぞれに対して依存関係のインストールと `npm test` の実行を行うステップを含む場合に準拠。

**Review trigger**: `plgg-foundry` のテストスイートが外部サービス（例: LLM APIs）に依存するようになった場合に再検討してください。モックで実行するか CI でスキップするかを決定してください。

---

## フォーマット Enforcement (Formatting Enforcement)

**Bounds**: Prettier 設定（`printWidth: 50`、`semi: true`、`singleQuote: false`、`trailingComma: "all"`、`bracketSameLine: false`）はすべての package で一貫しており、diverge してはなりません。自動 enforcement のメカニズムは現在未拘束 — CI チェックや pre-commit hook でフォーマットを enforced するものはありません。

**Rationale**: Prettier は 3 つの `.prettierrc.json` ファイルで一貫して設定されていますが、自動的にチェックされることはありません。フォーマットのドリフトはサイレントに発生します。

**影響対象**: quality-lead。

**Criterion**: 以下のいずれかが true の場合に準拠: (a) `prettier --check` がすべての package ソースディレクトリで CI で実行され 0 で終了する、または (b) pre-commit hook がステージングされたファイルに `prettier --write` を実行する。現在: 準拠していません（自動チェックは存在しません）。

**Review trigger**: pre-commit hook フレームワーク（例: husky + lint-staged）がプロジェクトに導入された場合、または CI フォーマットチェックが追加された場合に再検討してください。

---

## 設計による未拘束 (Unconstrained by Design)

以下の領域は分析され、現時点では意図的に未拘束として文書化されています:

- **コードリンティング (ESLint/Biome)**: linter は設定されていません。TypeScript strict mode が主要な静的解析レイヤーとして機能します。linter の追加は拘束されていません — チームは独自に導入できます。
- **依存関係の脆弱性スキャン**: CI で `npm audit` は実行されません。未拘束 — チームは CI workflow に追加できます。
- **アクセシビリティ**: このライブラリプロジェクトには適用されません（UI コンポーネントなし）。
- **パフォーマンスバジェット**: 観測されていません。バンドルサイズは CI で測定されていません。バンドルサイズのターゲットに関する決定が行われるまで未拘束です。
- **ドキュメント完全性**: PR template チェックリストは手動です。自動ドキュメントリンティングはありません。未拘束です。
- **すべての PR push での CI トリガー**: `ci-testing` label 要件により、すべての PR push で CI が実行されるわけではありません。これは未拘束 — 現在のモデルは意図的（レビューゲート CI）ですが、正式な constraint として決定されていません。
