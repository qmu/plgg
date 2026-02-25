---
title: ファイル規約
description: plgg プロジェクトで使用されるファイル命名パターン、ディレクトリ規約、フォーマットルールの定義
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](file-conventions.md) | [Japanese](file-conventions_ja.md)

# ファイル規約

## frontmatter

frontmatter は markdown ドキュメントの先頭に `---` で区切られた YAML ブロックです。`.workaholic/` ドキュメントでは、`title`、`description`、`category`、`last_updated`（または `modified_at`）、`commit_hash` などのメタデータを格納します。ticket の frontmatter には `created_at`、`author`、`type`、`layer`、`effort`、`category` が含まれます。翻訳ドキュメントでも frontmatter のキーは英語のまま保持し、値のみ翻訳します。`commit_hash` フィールドはドキュメントが最後に変更された時点の短い git ハッシュに更新されます。

## 翻訳版ファイル

翻訳版ファイルは `.workaholic/` 内の英語プライマリドキュメントに対応する `_ja.md` バージョンです。`.workaholic/` で作成または更新されるすべての `.md` ファイルに対して、対応する `_ja.md` ファイルが存在しなければなりません。これは `.workaholic/constraints/project.md` のドキュメント言語 constraint によって強制されます。インデックスファイル（`README.md`）も `README_ja.md` の対応ファイルが必要であり、各言語のインデックスは同じ言語のドキュメントにリンクする必要があります（例: `README.md` は `core-concepts.md` にリンクし、`README_ja.md` は `core-concepts_ja.md` にリンクする）。

## kebab-case

kebab-case は `.workaholic/` 内のすべてのファイルとディレクトリに必要な命名スタイルです。ファイルとディレクトリ名は小文字とハイフンで単語を区切ります（例: `core-concepts.md`、`project-context.md`、`drive-20260226-032733`）。この規約は ticket ファイル名（`<timestamp>-<slug>.md`）、spec ファイル名、constraint ファイル名、terms ファイル名に適用されます。ソースコードは別の規約に従います。package カテゴリディレクトリは PascalCase（`Atomics`、`Disjunctives`）を使用し、関数名は lowerCamelCase を使用します。

## settings.local.json

settings.local.json は `.claude/settings.local.json` にある個人用 Claude Code 設定オーバーライドファイルです。バージョン管理にコミットされて貢献者間で共有される `.claude/settings.json` とは異なり、`settings.local.json` は `.gitignore`（30 行目）でリポジトリから除外されています。他の貢献者と共有すべきでない個人的な API キーやローカルツールパスなど、開発者固有のオーバーライドを目的としています。

## workaholic ディレクトリ

`.workaholic/` ディレクトリは workaholic ツールによって管理されるすべての構造化プロジェクトドキュメントのルートです。`constraints/`、`guides/`、`specs/`、`terms/`、`tickets/` のサブディレクトリを含みます。このディレクトリ内のすべてのドキュメントは英語をプライマリ言語として記述され、作成または更新されるすべてのファイルに `_ja.md` 翻訳版が必要です。workaholic plugin（`core@workaholic`）は `.claude/settings.json` に設定されており、これらのドキュメントの作成・維持に使用される skill（write-spec、write-terms、translate など）を提供します。

## モノレポレイアウト

plgg モノレポはすべての公開可能な package を `src/` 下にフラット構造で配置しています: `src/plgg/`、`src/plgg-foundry/`、`src/plgg-kit/`、`src/example/` です。各 package には独自の `tsconfig.json`、`vite.config.ts`、`package.json`、`CHANGELOG.md` があります。TypeScript パスエイリアスは各 package の `tsconfig.json` に `paths` として宣言されており、package 名を `./src/*` ディレクトリにマッピングすることで、開発中のクロスパッケージインポートを正しく解決します。ルートの `sh/` ディレクトリには、すべての package に対して動作する共有シェルスクリプト（`sh/tsc-plgg.sh`、`sh/test-plgg.sh`）が含まれています。
