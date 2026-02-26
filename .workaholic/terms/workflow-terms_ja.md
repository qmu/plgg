---
title: Workflow 用語
description: plgg プロジェクトで使用される開発 workflow とプロセス用語の定義
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](workflow-terms.md) | [Japanese](workflow-terms_ja.md)

# Workflow 用語

## drive

drive は開発作業の単位を表す名前付き git branch です。drive branch は `drive-<YYYYMMDD>-<HHMMSS>`（例: `drive-20260226-032733`）の命名規約に従い、タイムスタンプは branch 作成時刻を示します。各 drive は通常、`.workaholic/tickets/archive/<branch-name>/` にアーカイブされた 1 つ以上の ticket に対応します。drive が完了すると、その ticket はアーカイブされ、branch は `main` にマージされます。

## archive

archive は完了した ticket をアクティブな場所から `.workaholic/tickets/archive/<branch-name>/` に移動する操作を指します。アーカイブは作業が完了したことを示し、ticket をその実装 branch にリンクした履歴記録として保存します。archive ディレクトリ構造は drive の命名規約を反映しており、`.workaholic/tickets/archive/<branch-name>/` を一覧表示することで特定の branch で行われたすべての作業を簡単に追跡できます。

## blueprint

blueprint は `plgg-foundry` の関数（`src/plgg-foundry/src/Foundry/usecase/blueprint.ts`）で、`Foundry` 設定と `Order` から `Alignment` を生成します。`plgg-kit` の `generateObject` を通じて LLM provider を呼び出し、foundry の説明と apparatus 定義を使ってシステムプロンプトを構築します。生成された alignment は検証され、`PromisedResult` として返されます。blueprint は `runFoundry` の二段階実行モデル（計画から実行）における AI 計画フェーズです。

## operate

operate は `plgg-foundry` の関数（`src/plgg-foundry/src/Foundry/usecase/operate.ts`）で、`Foundry` に対して `Alignment` を実行します。`ingress` から各 `Operation` ノードを経て `egress` まで操作グラフを走査します。アドレスを `Param` 値にマッピングする `Env` レジスタファイルを維持し、実行時に apparatus 名をその実装に解決します。operate は `blueprint` がプランを生成した後に `runFoundry` で呼び出される実行フェーズです。

## release

release は package の CHANGELOG の `## [Unreleased]` エントリにバージョン番号と日付を割り当て、commit にタグを付けて npm に公開する操作です。plgg プロジェクトはスケジュールではなくイベント駆動のリリースサイクルを使用しています。リリース準備 constraint は、アクティブなリリース候補 PR（#6）が `main` にマージされる前に、3 つの package（`plgg`、`plgg-foundry`、`plgg-kit`）すべての Unreleased エントリを確定することを要求しています。リポジトリの履歴には 1 つの git タグ `2025.07.week1.release1` が存在します。

## housekeeping

housekeeping はバージョン管理の整理、依存関係の管理、設定ファイルの追跡、ドキュメント更新など、機能追加以外の作業に使用される ticket タイプ（frontmatter の `type: housekeeping`）です。`drive-20260226-032733` branch は、コード変更なしに以前追跡されていなかった `.claude/settings.json` ファイルをコミットしたため、housekeeping（effort 0.1h）として分類されています。
