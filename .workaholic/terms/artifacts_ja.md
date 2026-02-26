---
title: 成果物
description: ticket、spec、changelog、設定ファイルなどのプロジェクト成果物の定義
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](artifacts.md) | [Japanese](artifacts_ja.md)

# 成果物

## ticket

ticket は `.workaholic/tickets/` にある作業単位を記述した構造化 markdown ドキュメントです。各 ticket は `created_at`、`author`、`type`、`layer`、`effort`、`commit_hash`、`category` などのフィールドを持つ YAML frontmatter を持ちます。ticket はアクティブなエントリとして始まり、作業完了後に `.workaholic/tickets/archive/<branch-name>/` にアーカイブされます。ファイル名の規約は `<timestamp>-<slug>.md`（例: `20260226032724-add-claude-settings-json.md`）です。ticket は git branch とその変更の背景にある意図を結びつける主要な記録として機能します。

## spec

spec は `.workaholic/specs/` にあるプロジェクトのアーキテクチャの視点を記述した構造化参照ドキュメントです。plgg プロジェクトでは、アプリケーション動作、コンポーネント構造、機能インベントリ、ユースケース、プロジェクトコンテキストの視点を維持しています。Spec ファイルは `title`、`description`、`category`、`modified_at`、`commit_hash` フィールドを持つ frontmatter 規約に従います。各英語 spec には対応する `_ja.md` 翻訳版があり、各ディレクトリにはそのドキュメントへのリンクを持つ `README.md` と `README_ja.md` インデックスがあります。

## changelog

changelog は各公開可能な package のルート（`src/plgg/`、`src/plgg-foundry/`、`src/plgg-kit/`）に維持される `CHANGELOG.md` ファイルです。Keep a Changelog 規約に従い、`## [Unreleased]` とバージョン付きセクションを持ちます。Unreleased エントリは、package バージョンが `main` にマージされる前に日付付きリリースエントリに置き換えられなければなりません — これは `.workaholic/constraints/project.md` に文書化されたプロジェクト constraint です。現在、3 つの package すべてに Unreleased エントリがあり、リリース候補 PR #6 をブロックしています。

## settings.json

settings.json は、`.claude/` 下のリポジトリルートにコミットされたプロジェクトレベルの Claude Code 設定ファイル `.claude/settings.json` を指します。すべての貢献者に適用される共有設定が含まれており、permission deny ルール（ディレクトリ外の git 操作を防ぐ `Bash(git -C:*)` など）、環境変数の宣言（`CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`、`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`）、workaholic plugin のマーケットプレイス登録、有効化された plugin 宣言が含まれます。このファイルはバージョン管理で追跡されており、個人設定は `.claude/settings.local.json` に書き込みます（`.gitignore` に記載）。このファイルは `drive-20260226-032733` branch でハウスキーピングとしてコミットされました。

## constraint

constraint は `.workaholic/constraints/` にある、プロジェクトの決定と動作を制限する構造化ルールドキュメントです。各 constraint エントリは名前、Bounds（制約範囲）、Rationale（根拠）、Affects（影響対象）、Criterion（判定基準）、Review trigger（再検討トリガー）を持ちます。plgg プロジェクトは現在、TypeScript 型安全性（`as`/`any`/`ts-ignore` の禁止）、コンパイルとテストゲート、リリース準備状況、依存関係の通貨、package スコープの安定性、ドキュメント言語（英語プライマリと `_ja.md` 翻訳）に関する constraint を維持しています。Constraint はプロジェクトマネージャーロールが所有し、指定されたリーダーまたは開発者ロールに影響します。
