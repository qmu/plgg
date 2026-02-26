---
title: デリバリーポリシー
description: plgg monorepo の CI/CD pipeline、ビルドプロセス、デプロイ戦略、リリースプロセス
category: developer
modified_at: 2026-02-26T03:27:33+00:00
commit_hash: ddbb696
---

[English](delivery.md) | [Japanese](delivery_ja.md)

# デリバリーポリシー

本ドキュメントは plgg monorepo で実装済みのすべてのデリバリー実践を記述します。各記述は
observable なアーティファクト（workflow ファイル、shell スクリプト、package 設定）に基づいています。
根拠が見つからない領域は「not observed（未確認）」と明記します。

## CI/CD Pipeline

プロジェクトは GitHub Actions を CI/CD プラットフォームとして使用しています。
`.github/workflows/` 配下に 4 つの workflow が定義されています。

**run-tests**（`.github/workflows/run-tests.yml`）は主要な品質ゲートです。
pull request の 3 つのイベント（`review_requested`、`synchronize`、`labeled`）と、
`main` ブランチへの直接 push によってトリガーされます。workflow は Node.js 22.x を使用した
`ubuntu-latest` 上で動作し、5 つのステップを順番に実行します：`npm ci` による依存関係の
インストール、`npx tsc --noEmit` による TypeScript コンパイルチェック、`npm test` による
テストスイート、`npm run build` によるライブラリビルド、`npm run coverage` によるテスト
カバレッジ計測。この workflow は `ci-testing` ラベルを管理します。レビューリクエスト時に
自動的にラベルが追加され、以降の push はラベルが存在する場合のみスイートが実行されます。

**start-pull-request**（`.github/workflows/start-pull-request.yml`）は issue がアサインされた
ときにトリガーされます。feature branch と draft pull request を自動的に作成します。branch 名は
issue 番号と JST の現在時刻から生成されます（`i{ISSUE_NUM}-{YYYYMMDD}-{HHMM}`）。
`idea` または `epic` ラベルが付いた issue はこの自動化から除外されます。
処理前に同じ issue にリンクされたオープン pull request が存在しないことを検証します。

**prepare-release**（`.github/workflows/prepare-release.yml`）は `main` への push ごとに
トリガーされます。Ruby gem の `git-pr-release` を使用して `main` からマージ済み pull request を
集約し、`release` ブランチを対象とした単一のリリース候補 pull request を開くか更新します。
pull request 本文は ERB テンプレートの `.github/RELEASE_PR_TEMPLATE` を使用してマージ済み
pull request タイトルのチェックリストとして生成されます。マージ済み pull request には
`release-candidate` ラベルが付与されます。リリース PR タイトルのタイムゾーンは
`Asia/Tokyo` です。

**release**（`.github/workflows/release.yml`）は pull request が `release` ブランチに
マージされたときにトリガーされます。`deployment` と `publish-release-note` の 2 つのジョブを
順番に実行します。`deployment` ジョブには echo 文のプレースホルダーのみが含まれており、
実際のデプロイ対象は実装されていません。`publish-release-note` ジョブは
`{YEAR}.{MM}.week{WEEK}.release{N}` 形式の CalVer バージョン文字列を生成し
（`N` はその週のリリース連番）、`release-drafter` を呼び出して pull request ラベル
（`addition`、`modification`、`refactoring`、`fix`）でカテゴリ分けされたリリースノートを
含む GitHub Release を公開します。

## ビルドプロセス

3 つの公開パッケージ（`plgg`、`plgg-kit`、`plgg-foundry`）はいずれも同一のビルドスタックを
使用しています：Vite と `vite-plugin-dts`。各 `package.json` の `build` npm スクリプトが
`vite build` を実行し、CJS と ESM のデュアル出力（`dist/index.cjs.js` および
`dist/index.es.js`）と TypeScript 型宣言ファイル（`dist/index.d.ts`）を生成します。

`sh/build.sh` スクリプトは `src/plgg` と `src/plgg-kit` で順番に `npm run build` を実行します。
`src/plgg-foundry` と `src/example` はビルドしません。

各パッケージの `tsconfig.json` では厳格な TypeScript コンパイル設定が強制されています。
`plgg` パッケージでは `strict`、`noUnusedLocals`、`noUnusedParameters`、
`noUncheckedIndexedAccess`、`noImplicitReturns`、`noFallthroughCasesInSwitch`、
`exactOptionalPropertyTypes`、`isolatedModules` が有効です。
プロジェクトのルート CLAUDE.md は型エラーの解決策として `as`、`any`、`ts-ignore` の使用を
明示的に禁止しています。

CI pipeline（`run-tests` workflow）はローカルのビルド検証を反映しています：テスト実行前に
`npx tsc --noEmit` を実行し、その後 `npm run build` で本番アーティファクトが正常にコンパイル
されることを確認します。

`sh/check-all.sh` スクリプトはローカルのフルスイートチェックを提供します：
`test-plgg.sh`、`test-plgg-kit.sh`、`test-plgg-foundry.sh`、`tsc-example.sh`、
`build.sh` を順番に実行します。

依存関係のインストールは `sh/npm-install.sh` によって全 4 パッケージ（`src/plgg`、
`src/plgg-kit`、`src/plgg-foundry`、`src/example`）に対して順番に `npm install` を実行します。

## デプロイ戦略

`release` workflow の `deployment` ジョブには `echo "Deployment pipeline here"` のみが
含まれています。実際のデプロイ対象、アーティファクトのアップロード、コンテナレジストリへの
push、npm 公開ステップ、環境プロモーションロジックは release workflow に実装されていません。

`publish` npm スクリプト（`vite build && npm publish`）は 3 つのパッケージすべての
`package.json` に存在し、専用の `sh/publish-plgg.sh` スクリプトが `src/plgg` で
`npm run publish` を実行します。ただし、これらはいずれも GitHub Actions workflow から
呼び出されていません。npm 公開は自動化されていません。

npm 以外の環境（ステージング・本番サーバーなど）へのデプロイは観測されていません。

## リリースプロセス

リリースは 3 ブランチのプロモーションモデルに従います：
feature branch → `main` → `release`

1. `.github/ISSUE_TEMPLATE/` 配下の 5 つの構造化 issue テンプレート（Addition、Modification、
   Refactoring、Fix、Epic）のいずれかを使用して GitHub issue を作成します。
2. issue をアサインすると `start-pull-request` がトリガーされ、feature branch と、
   対象・仕様・セルフレビューチェックリスト・エビデンスセクションを含む標準化された本文
   テンプレートを持つ pull request が作成されます。
3. pull request がレビュー可能になったらレビュアーをリクエストします。これにより
   `run-tests` CI pipeline がトリガーされます（`review_requested` イベントと
   `ci-testing` ラベルを通じて）。
4. `main` へのマージ後、`prepare-release` が自動的に `release` ブランチを対象とした
   リリース候補 pull request を開くか更新します。テンプレート `.github/RELEASE_PR_TEMPLATE`
   がタイムスタンプ付きのタイトルとチェックリストを生成します。
5. リリース候補 pull request を `release` にマージすると `release` workflow がトリガーされ、
   デプロイのプレースホルダーを実行した後、CalVer バージョンタグと `release-drafter` で
   生成されたリリースノートを含む GitHub Release を公開します。

バージョン文字列は CalVer に従います：`{YEAR}.{MM}.week{WEEK}.release{N}`。
release drafter はラベルによって pull request を Addition、Modification、Refactoring、
Fix の各セクションに分類します（`release-drafter-config.yml`）。

手動の npm 公開（`sh/publish-plgg.sh`、`npm run publish`）は存在しますが、
自動化された release workflow には統合されていません。

## 観察事項

プロジェクトは issue から PR への完全自動化 workflow（`start-pull-request`）、
リリース候補の自動集約 workflow（`prepare-release` と `git-pr-release`）、
GitHub Release 公開ステップ（`release-drafter`）を備えています。CI テストゲートは
`ci-testing` ラベルに条件付きであり、レビューサイクル中にスイートを実行するタイミングを
制御できます。3 ブランチのプロモーションモデル（`feature -> main -> release`）は
workflow トリガーによって一貫して強制されています。TypeScript のコンパイル検証はローカル
（`sh/tsc-plgg.sh` と `sh/check-all.sh`）と CI（`run-tests` workflow）の両方で行われます。

重要なギャップが 1 つあります：`release` workflow の実際のデプロイステップが未実装
（プレースホルダーのみ）です。npm パッケージの公開はスクリプトとして存在しますが、
自動化されたリリース pipeline には接続されていません。

## ギャップ

- **デプロイ対象**: `.github/workflows/release.yml` の `deployment` ジョブには
  `echo "Deployment pipeline here"` のみが含まれています。自動化された pipeline に
  実際の公開またはデプロイステップは実装されていません。Not observed。
- **npm 公開の自動化**: `npm run publish` スクリプトと `sh/publish-plgg.sh` は存在しますが、
  いずれの workflow からも呼び出されていません。自動化された npm 公開は Not observed。
- **環境プロモーション**: ステージングまたは本番環境の概念、デプロイ対象ごとの環境変数、
  環境固有の設定は Not observed。
- **アーティファクト保存**: いずれの workflow にもアーティファクトのアップロードステップ
  （GitHub Actions artifacts、S3、コンテナレジストリなど）は Not observed。
- **ロールバック手順**: ロールバックメカニズムまたは手順は Not observed。
- **ブランチ保護ルール**: `main` または `release` のブランチ保護設定はリポジトリファイルから
  観測できません（GitHub 設定 UI が必要）。コードベースのアーティファクトでは Not observed。
- **変更履歴の自動化**: パッケージごとに CHANGELOG ファイルは存在しますが手動で更新されており、
  release workflow に自動化された変更履歴生成ステップは接続されていません。
