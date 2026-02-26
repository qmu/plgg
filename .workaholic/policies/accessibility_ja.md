---
title: アクセシビリティポリシー
description: plgg における国際化対応、言語カバレッジ、翻訳 workflow、およびアクセシビリティテスト実践
category: developer
modified_at: 2026-02-26T00:00:00+09:00
commit_hash: ddbb696
---

[English](accessibility.md) | [Japanese](accessibility_ja.md)

# アクセシビリティポリシー

本文書は、plgg モノレポ（パッケージ: `plgg`、`plgg-kit`、`plgg-foundry`）において観察可能な国際化対応、言語カバレッジ、翻訳 workflow、およびアクセシビリティテスト実践を記述します。すべての記述はリポジトリ内で実装・実行可能な実践のみを反映しています。コードベースに根拠のない領域は「観察されていない（not observed）」と明記します。

## 国際化

このモノレポ内のいずれのパッケージにも、国際化（i18n）フレームワークまたはローカライゼーション（l10n）ライブラリは設定されていません。plgg は UI レイヤーを持たない TypeScript の関数型プログラミングユーティリティライブラリです。各パッケージ（`plgg`、`plgg-foundry`、`plgg-kit`）はプログラム的に利用される TypeScript API を公開しており、ロケール対応のフォーマットや翻訳を必要とするユーザー向け文字列は存在しません。

`plgg-foundry` には、偶発的な言語認識パターンが 1 件存在します。LLM blueprint 生成 prompt が、診断分析フィールドに対して「Use the same language as the user request（ユーザーリクエストと同じ言語を使用すること）」と指示しています（出典: `src/plgg-foundry/src/Foundry/usecase/blueprint.ts`、92 行目）。これはアプリケーションコード内の i18n 機構ではなく、外部 LLM に渡される prompt エンジニアリングの指示です。TypeScript ソースには `Intl` API の使用、ロケール設定、またはメッセージカタログは存在しません。

## 対応言語

観察されていません。アプリケーションソースには言語コード、ロケール識別子、またはロケール固有のコンテンツは宣言されていません。このライブラリは UI コンポーネントを持たず、プログラム的な TypeScript API のみをエクスポートするため、ドキュメント化すべきユーザー向け対応言語の一覧はありません。

`.workaholic/` 内の開発者ドキュメントは、英語（主言語）と日本語（`_ja.md` サフィックスの翻訳対訳ファイル）によるバイリンガル形式で維持されています。これはアプリケーション i18n 機能ではなく、`.workaholic/constraints/project.md` のプロジェクト制約によって規定されたドキュメント慣習です。

## 翻訳 Workflow

アプリケーションコードについては観察されていません。いずれのパッケージにも、メッセージ抽出パイプライン、翻訳メモリ、またはローカライゼーション workflow（`i18next`、`react-intl`、`gettext` 等）は存在しません。

`.workaholic/` 以下の開発者ドキュメントについては、`.workaholic/constraints/project.md`（Documentation Language セクション）のプロジェクト制約により、すべての `.md` ファイルに対応する `_ja.md` 翻訳対訳ファイルが必要とされています。このコンプライアンスはポリシー慣習によって強制され、通常の PR workflow でレビューされます。翻訳ファイルの存在を確認する自動化ツールは存在しません。

## アクセシビリティテスト

観察されていません。いずれのパッケージにもアクセシビリティテストツールは設定されていません。quality context ドキュメント（`.workaholic/specs/quality-context.md`、Accessibility セクション）には明示的に次のように記録されています：「Standard: Not observed. No accessibility testing tooling is configured. Enforcement: Not observed.」

quality manager の制約ドキュメント（`.workaholic/constraints/quality.md`、Unconstrained by Design セクション）では、アクセシビリティについて「Not applicable to this library project (no UI components)」と記載されています。

いずれの `package.json` にも `axe-core`、`jest-axe`、`pa11y`、`lighthouse`、`@testing-library/jest-dom`、その他のアクセシビリティ監査依存パッケージは存在しません。CI workflow ステップでアクセシビリティスキャンは実行されていません。テストファイルには ARIA、WCAG、またはスクリーンリーダーテストのアサーションは存在しません。

## 観察事項

plgg はヘッドレスの TypeScript ユーティリティライブラリです。3 つのパッケージはいずれも HTML、レンダリング出力、またはユーザーインターフェースを生成しません。i18n、l10n、およびアクセシビリティテストツールの不在は構造的に適切です。これらの機構が適用されるべき UI サーフェスが存在しないためです。`blueprint.ts` の LLM prompt における単一の言語指示は AI prompt エンジニアリングの慣習であり、アプリケーション国際化の課題ではありません。開発者ドキュメントは `.workaholic/constraints/project.md` によって規定された英語・日本語バイリンガル慣習に従っています。

## ギャップ

以下の領域は根拠が観察されていません。ライブラリのヘッドレスな性質を踏まえると、改善が必要な欠陥ではなく、網羅性のために列挙しています。

**翻訳ファイルの自動強制**: `.workaholic/` 内のすべてのドキュメントに `_ja.md` 対訳が存在することを確認する CI チェックまたは pre-commit hook は存在しません。`.workaholic/constraints/project.md` のバイリンガル要件は自動強制のないポリシー制約です。コンプライアンスは完全に手動です。

**i18n フレームワーク**: 観察されていない。ライブラリにはユーザー向け文字列が存在しないため、該当しません。

**アクセシビリティテスト**: 観察されていない。ライブラリには UI コンポーネントが存在しないため、該当しません。
