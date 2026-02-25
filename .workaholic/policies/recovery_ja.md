---
title: Recovery Policy
description: plgg monorepo のデータ永続化メカニズム、バックアップ戦略、migration 手順、recovery 計画。
category: developer
modified_at: 2026-02-26T03:27:33+00:00
commit_hash: ddbb696
---

[English](recovery.md) | [Japanese](recovery_ja.md)

# Recovery Policy

このポリシーは、commit `ddbb696` 時点の plgg monorepo において観測可能な recovery 関連の実装をすべて記録します。plgg は、3 つの公開パッケージ（`plgg`、`plgg-foundry`、`plgg-kit`）と `example` パッケージから構成される TypeScript 関数型プログラミングライブラリです。本プロジェクトはサーバー・データベース・インフラストラクチャ層を持たないステートレスなライブラリであるため、recovery ドメインの範囲は限定的です。以下の各セクションは、codebase において実装・検証可能な内容のみを反映しています。

## Data Persistence

plgg には永続的なデータストアは存在しません。どのパッケージにも、データベース、ファイルベースのストア、キャッシュ、キュー、外部ストレージサービスは含まれていません。すべての runtime 状態はエフェメラル（一時的）です。`plgg-foundry` の `operate` 関数が使用するレジスタファイル（`Env`）は、単一の `runFoundry` 呼び出しにスコープされたメモリ内マップであり、呼び出しが返ると破棄されます（出典：`src/plgg-foundry/src/Foundry/model/`、application viewpoint `.workaholic/specs/application.md` 149 行目）。

本プロジェクトが生成する唯一の永続的な成果物は、`sh/publish-plgg.sh` および `src/plgg/package.json` の `"publish"` スクリプトを通じて `npm publish` で npm registry に公開される npm パッケージです。一度リリースされた公開パッケージバージョンは npm 上でイミュータブルです。公開バージョンの retention policy は codebase 内に宣言されていません。

環境変数（`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`）は、`plgg-kit` の `generateObject` 関数が runtime に読み込みます。これらの管理・ローテーション・永続化は本 repository のスコープ外です（出典：`src/plgg-kit/src/LLMs/usecase/generateObject.ts`）。

## Backup Strategy

repository 内にバックアップスクリプト、スナップショット設定、データエクスポート手順は存在しません。本プロジェクトの信頼できるソースは `https://github.com/qmu/plgg` でホストされている git repository 自体です。git 履歴がすべてのソース変更の事実上の記録として機能しており、追加のバックアップメカニズムは実装・設定されていません。

npm 公開パッケージは、リリース済みソース成果物のポイントインタイム記録として機能しますが、npm からの検証・復元を行う自動プロセスは存在しません。パッケージの公開は `sh/publish-plgg.sh` を通じて手動で実行されるステップです。

自動化されたデータベースダンプ、ファイルシステムスナップショット、オブジェクトストレージポリシー、クラウドバックアップ設定は repository のいかなる箇所にも観測されていません。

## Migration Procedures

codebase にはスキーマ migration、データ migration、migration ツールは存在しません。本プロジェクトには migration が必要なデータベーススキーマが存在しないためです。

パッケージ API の migration は、パッケージレベルの CHANGELOG ファイル（`src/plgg/CHANGELOG.md`、`src/plgg-foundry/CHANGELOG.md`、`src/plgg-kit/CHANGELOG.md`）によってテキストで追跡されています。破壊的変更はテキストで記載されています（例：`src/plgg/CHANGELOG.md` の v0.0.25 では box constructor とパターンマッチャーのリネームが記録されています）。これらの changelog エントリに対応する自動 migration スクリプトや codemod は存在しません。

リリースパイプラインは、PR が `release` branch にマージされたときに `release.yml` ワークフロー（`.github/workflows/release.yml`）が生成する CalVer タグ（`YYYY.MM.week{N}.release{N}`）を使用します。タグの作成は CI で自動化された唯一のバージョン管理操作です。タグや公開済み npm パッケージに対するロールバック手順は定義されていません。

## Recovery Plan

repository 内に正式な recovery 計画、runbook、RTO 目標、RPO 目標は文書化されていません。本プロジェクトは本番サービスを運用していないため、運用的な意味でのサービス復旧は適用されません。

recovery 関連として最も近いメカニズムは GitHub Actions workflow チェーンです。`main` へのプッシュ時、`prepare-release.yml`（`.github/workflows/prepare-release.yml`）が `git-pr-release` を使用してリリース候補 PR を作成します。`release` へのマージ時、`release.yml` が CalVer タグ付けと `release-drafter` によるリリースノート公開をトリガーします。いずれかの workflow が失敗した場合、自動リトライやロールバック手順は定義されておらず、手動での再実行による復旧が必要になります。

`run-tests.yml` ワークフロー（`.github/workflows/run-tests.yml`）は `src/plgg` の TypeScript コンパイル（`npx tsc --noEmit`）、vitest テスト、ビルド、カバレッジを実行します。この workflow の失敗はマージをブロックしますが、recovery アクションはトリガーされません。これは品質ゲートであり、recovery メカニズムではありません。

依存関係の脆弱性への露出が、プロジェクト制約で特定された主な recovery 関連リスクです。プロジェクト制約（`/home/ec2-user/projects/plgg/.workaholic/constraints/project.md`、Dependency Currency セクション）は、セキュリティ関連パッケージの Dependabot PR を 30 日以内にマージまたは明示的に却下することを要求しています。これはポリシー上の義務であり、自動化された修復ツールは設定されていません。

## Observations

plgg monorepo はステートレスな TypeScript ライブラリです。runtime で永続的なデータを生成せず、サーバープロセスも運用していません。意味のある「recovery」の懸念事項はすべて、ソースコードと npm 成果物の可用性に帰着し、どちらも GitHub でのホスティングと npm 公開によって暗黙的に対処されています。`release.yml` の CalVer リリースタグ付けはリリース済み状態の記録を提供します。`run-tests.yml` のテスト CI パイプラインは公開前のソース整合性を保証します。

このリードに影響する依存関係の通貨制約は具体的です。プロジェクトコンテキストのスキャン時点で Dependabot PR #10（`lodash`）が未解決であり、既知の CVE を持っています。自動修復は設定されていません。

## Gaps

以下の recovery 関連領域を分析しましたが、証拠は見つかりませんでした。各項目は省略せず「not observed（観測されず）」として明記します。

**バックアップ自動化**: Not observed。repository 内にバックアップスクリプト、スケジュールジョブ、クラウドスナップショット設定は存在しません。

**データベースまたは永続ストレージ**: Not observed。本プロジェクトにはデータベース層が存在しません。

**Migration ツール**: Not observed。migration スクリプト、codemod、スキーマ進化ツールは存在しません。

**Disaster recovery runbook**: Not observed。repository 内に runbook、インシデント対応手順、recovery プレイブックは存在しません。

**RTO / RPO 目標**: Not observed。本プロジェクトはライブラリであり、ホスト型サービスではないため、サービスレベル目標は定義されていません。

**Retention policy**: Not observed。npm パッケージ、git タグ、その他の成果物の保持期間を管理する明示的なポリシーはありません。

**ロールバック手順**: Not observed。公開済み npm パッケージバージョンや誤った git タグを元に戻すための文書化されたプロセスは存在しません。

**オンコール・エスカレーションポリシー**: Not observed。インシデント対応のエスカレーションチェーンは定義されていません。
