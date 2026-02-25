---
title: Observability Policy
description: plgg モノレポにおける logging practices、metrics collection、tracing、monitoring、alerting。
category: developer
modified_at: 2026-02-26T03:27:33+00:00
commit_hash: ddbb696
---

[English](observability.md) | [Japanese](observability_ja.md)

# Observability Policy

本ドキュメントは plgg モノレポに実装されている observability practices を記述します。リポジトリは3つの公開パッケージ（`plgg`、`plgg-foundry`、`plgg-kit`）と `example` パッケージで構成されています。すべての記述はコードベースの観察可能なアーティファクトに基づいています。証拠のない領域は「not observed」と明記します。

## Logging Practices

プロジェクトは `plgg` コアパッケージからエクスポートされる2つのパイプラインレベルの logging ユーティリティを提供しています。

`debug` は入力値に対して `console.debug` を呼び出し、値をそのまま返す pass-through 関数です。値をチェーンを中断させずに検査する必要がある関数型パイプライン内での使用を目的としています。`src/plgg/src/Functionals/debug.ts` に実装され、`src/plgg/src/Functionals/index.ts` から公開エクスポートされています。

`tap` は任意の副作用関数を受け取り、その副作用を値に適用して値をそのまま返す関数を返す高階 pass-through 関数です。`console.log` やカスタムロガー関数を副作用引数として渡すテストケースに示されているように、処理パイプライン内での logging がドキュメント化されたユースケースです。`src/plgg/src/Functionals/tap.ts` に実装され、`src/plgg/src/Functionals/index.ts` から公開エクスポートされています。

`printPlggError` は `src/plgg/src/Exceptionals/PlggError.ts` にあるフォーマットされたエラー報告関数です。ネストされた `PlggError` インスタンスのチェーンを収集し、ANSI カラーコードを使用して各エラーを `console.error` に出力します（最外層のエラーコンストラクタ名は赤、呼び出し箇所とネストされたエラー名はグレー）。この関数は、ドメインエラーチェーンをコンソールに表示するための指定されたメカニズムです。

どのパッケージにも構造化 logging フレームワーク（Winston、Pino、Bunyan など）は存在しません。ログ呼び出しは専らネイティブ `console` API（`console.debug`、`console.error`、`console.log`）に対して行われます。ネイティブ `console` API が提供するもの以外のログレベルは定義されていません。ログフォーマットミドルウェアやトランスポート設定は存在しません。

`plgg-kit` パッケージには `src/plgg-kit/TodoFoundry.ts` ファイルがあり、プロセッサの副作用関数内から `console.log` を呼び出しています。これは開発時のサンプルアーティファクトであり、本番環境の logging 規約ではありません。

`plgg-foundry` パッケージは、`dotenv` を通じて `.env` ファイルを読み込むように vitest 環境を設定しています（`src/plgg-foundry/vite.config.ts`）。これにより環境変数（潜在的な API キーを含む）がテストで利用可能になります。観察されたコードベースでは、環境変数によって影響を受ける logging 設定はありません。

## Metrics Collection

コードカバレッジメトリクスは vitest の v8 coverage provider を使用して `plgg` パッケージに対して収集されます。設定されているレポーターは `text`、`lcov`、`html` です（`src/plgg/vite.config.ts`）。設定された除外リスト（node_modules、dist、coverage、spec ファイル、index ファイル、vite config 自体）に含まれないすべてのファイルについてカバレッジが収集されます。強制適用されるしきい値は statements、branches、functions、lines の各項目で 90% です。

カバレッジメトリクスは `run-tests.yml` のワークフローステップ出力を通じて暗黙的に CI アーティファクトとして生成されます。CI ステップ「Run tests with coverage」は `npm run coverage` を実行し、いずれかのしきい値を満たさない場合にワークフローを失敗させます。

`plgg-foundry` と `plgg-kit` については、それぞれの `vite.config.ts` ファイルで `coverage: { all: true }` が設定されていますが、しきい値は設定されていません。これらのパッケージのカバレッジは手動で生成できますが、それを収集または強制適用する CI ステップは存在しません。

アプリケーションパフォーマンスメトリクス、リクエストカウンター、レイテンシーヒストグラム、またはランタイムインストルメンテーションは実装されていません。メトリクスバックエンド（Prometheus、Datadog、StatsD など）は設定されていません。

## Tracing and Monitoring

分散 tracing は実装されていません。OpenTelemetry、Jaeger、Zipkin、または同等の tracing ライブラリは、どのパッケージの依存関係やソースファイルにも存在しません。

APM エージェントは設定されていません。Sentry、New Relic、Datadog APM、または同等のランタイム monitoring 統合は存在しません。

アップタイム monitoring、合成 monitoring、またはヘルスチェックエンドポイントは観察されていません。プロジェクトはサーバーアプリケーションではなくライブラリであるため、エンドポイントレベルの monitoring の適用可能性は限られています。ライブラリコンシューマー向けのヘルスチェック設計パターンは実装されていません。

CI パイプラインの実行は、`run-tests.yml`、`prepare-release.yml`、`release.yml`、`start-pull-request.yml` の GitHub Actions ワークフロー実行を通じて観察可能です。これらのワークフローは GitHub リポジトリ UI で表示される構造化された pass/fail ステータスを生成し、プロジェクトの主要な観察可能なランタイムシグナルを構成しています。

## Alerting

CI ワークフローの失敗以外に明示的な alerting しきい値は設定されていません。`run-tests.yml` ワークフローが失敗した場合（コンパイルエラー、テスト失敗、ビルド失敗、またはカバレッジしきい値違反による）、GitHub はプラットフォームの標準通知メカニズムを通じて PR 作成者に通知します。しきい値設定、アラートルーティング、PagerDuty 統合、Slack webhook、または同等の alerting ツールは存在しません。

CI ワークフローが実質的な alerting メカニズムです：PR または `main` へのプッシュでのステップ失敗が、プロジェクトの唯一の観察可能なアラートシグナルです。

## Observations

プロジェクトの observability の姿勢は、小規模で実験的な TypeScript ライブラリとしての性質を反映しています。2つの logging ユーティリティ（`debug` と `tap`）は logging フレームワークではなく、関数型パイプラインのアクセサリーです。エラー報告関数（`printPlggError`）はドメインエラーチェーンに対して ANSI フォーマットのコンソール出力を提供しており、これがコードベースの中で最も構造化された出力形式です。

コードカバレッジが強制適用される唯一の定量的メトリクスです。`plgg` に対する CI の 90% しきい値ゲートが主要な観察可能な品質シグナルです。カバレッジレポーター（`text`、`lcov`、`html`）はローカルでアーティファクトを生成しますが、HTML および lcov レポートは CI ワークフローによってどのダッシュボードやアーティファクトストアにも公開されません。

プロジェクトは構造化ログフォーマット、ログルーティング、ライブラリ層でのレベルベースフィルタリングなしに、完全にネイティブ `console` API 呼び出しに依存しています。

## Gaps

以下の observability 領域にはコードベースの証拠がありません：

- **構造化 logging フレームワーク**: Not observed。Winston、Pino、Bunyan、または同等のものはありません。すべてのログ出力はネイティブ `console` API を使用しています。
- **ネイティブ console を超えたログレベル**: Not observed。ログレベルの抽象化（`DEBUG`、`INFO`、`WARN`、`ERROR` など）は実装されていません。
- **ログトランスポートまたは集約**: Not observed。集中型ストア（Elastic、Splunk、CloudWatch など）へのログ送信は設定されていません。
- **分散 tracing**: Not observed。tracing ライブラリまたはインストルメンテーションは存在しません。
- **APM またはランタイム monitoring**: Not observed。Sentry、Datadog、New Relic、または同等のエージェントは設定されていません。
- **メトリクスバックエンド**: Not observed。Prometheus、StatsD、またはメトリクスエンドポイントは実装されていません。
- **Alerting 統合**: Not observed。Slack webhook、PagerDuty、メールルーティング、または GitHub のネイティブ CI 失敗通知以外の alerting ルール設定は存在しません。
- **カバレッジレポートの公開**: Not observed。lcov および HTML カバレッジレポートはローカルで生成されますが、カバレッジ追跡サービス（Codecov、Coveralls など）にはアップロードされていません。
- **plgg-foundry および plgg-kit のカバレッジ強制適用**: Not observed。これらのパッケージは `coverage: { all: true }` が設定されていますが、しきい値がなく CI ステップもありません。
