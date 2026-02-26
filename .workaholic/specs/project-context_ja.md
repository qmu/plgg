---
title: プロジェクトコンテキスト
description: plggのビジネスコンテキスト、ステークホルダーマップ、タイムライン状況、アクティブな問題、および提案されたソリューション
category: developer
modified_at: 2026-02-26T04:17:53+09:00
commit_hash: ddbb696
---

# プロジェクトコンテキスト

リーダーが参照するための plgg monorepo の戦略的分析です。すべての主張は観察可能なプロジェクト
artifact に基づいています。情報が存在しない場合は「not observed（観察されず）」と明示します。

## ビジネスドメイン

**何をするか**: plgg は TypeScript の関数型プログラミングユーティリティライブラリで、monorepo として
構成されています。3 つの published package を提供します：

- `plgg` (v0.0.25) — pipeline ユーティリティライブラリ。関数型プログラミングのプリミティブ（chain、
  Result 型、型キャスト、Dict、Vec など）を含む
- `plgg-foundry` (v0.0.1) — LLM の structured outputs を使用して、ユーザー定義の「Apparatus」から
  操作シーケンスを動的に合成する AI 駆動の workflow オーケストレーション
- `plgg-kit` (v0.0.1) — LLM ベンダー抽象化（OpenAI、Anthropic、Google）と `generateObject` ユー
  ティリティ。plgg-foundry から抽出

**市場カテゴリ**: 関数型プログラミングと AI workflow オーケストレーション向けの実験的オープンソース
TypeScript ライブラリ。

**バリュープロポジション**: pipeline 構築のための合成可能で型安全な関数型プリミティブ、および実行
グラフを手書きする必要をなくす LLM 駆動の workflow 生成。

**安定性の警告**: README.md（3行目）で「UNSTABLE — 関数型プログラミングの概念に焦点を当てた実験的
な学習成果。主に自プロジェクト向けだが公開されている」と明示。

**ソース**: `README.md` 3行目、`src/plgg/package.json`、`src/plgg-foundry/package.json`、
`src/plgg-kit/package.json`。

**信頼度**: 高

---

## ステークホルダーマップ

| ステークホルダー | 根拠 | 関心事 | 優先度 |
|---|---|---|---|
| 主メンテナー（`a@qmu.jp` / `@tamurayoshiya`） | ticket の author フィールド、PR #6 のチェックリスト（`@tamurayoshiya`）、commit author | コード品質、TypeScript の厳格性（CLAUDE.md は `as`/`any`/`ts-ignore` を禁止）、関数型の純粋性 | 高 |
| 内部プロジェクトの利用者 | README 「主に自プロジェクト向け」 | API の安定性、plgg-foundry/plgg-kit 統合の正確な動作 | 高 |
| 公開 npm 利用者 | npm に公開されたパッケージ、公開 GitHub リポジトリ | インストール体験、ドキュメント化された API サーフェス | 中 |
| Dependabot | PR #8、#9、#10 が open | 依存関係の最新化とセキュリティ | 低 |

**Not observed**: 外部コントリビューターコミュニティ、資金提供スポンサー、SLA、エンタープライズユーザー。

**信頼度**: 中（artifact から推論。明示的なステークホルダー宣言は見つからず）

---

## タイムライン状況

### 現在のバージョン

| パッケージ | バージョン | 状態 |
|---|---|---|
| `plgg` | 0.0.25 | 未リリース（CHANGELOG が Unreleased と記載） |
| `plgg-foundry` | 0.0.1 | 未リリース |
| `plgg-kit` | 0.0.1 | 未リリース |

### リリースケイデンス

観察された git tag は 1 件のみ：`2025.07.week1.release1`。単一 tag からは定期的なケイデンスパターンは
推論できません。リリースはスケジュール駆動ではなくイベント駆動と見られます。

**ソース**: `git tag --sort=-version:refname`、CHANGELOG ファイル。

### 最近のマイルストーン

- `v0.0.25` branch が main にマージ（commit `60dc186`）：`plgg-kit` package の抽出、`bind`/`env`/
  `unbox` 関数の追加、`changelog-updater` および `readme-updater` subagent を使用した commit workflow の追加。
- `drive-20260226-032733` branch（現在）：プロジェクトレベルの Claude Code 設定である
  `.claude/settings.json` をコミット（housekeeping、作業量 0.1h）。

### アクティブなリリース候補

PR #6「Release Candidate 2025-12-22 15:02:52 +0900」(https://github.com/qmu/plgg/pull/6)は
2025-07-01 から open です。状態：OPEN。auto-merge：無効。チェックリスト項目 #5（`@tamurayoshiya`）
と #7（`@dependabot`）は未完了です。

**信頼度**: 中（リリースプロセスが完全にドキュメント化されていない。単一 tag ではケイデンスの推論が限定的）

---

## アクティブな問題

### 問題 1：リリース候補 PR が停滞（深刻度：高）

PR #6 は 2025-07-01 から open（約 8 ヶ月）。`main` を対象としているが auto-merge は無効。
チェックリストに 2 件の未完了項目あり。どのパッケージの CHANGELOG にもリリース済み（Unreleased
以外）バージョンが存在しません。

**ソース**: `gh pr list`、PR #6 チェックリスト、CHANGELOG ファイル。

### 問題 2：Dependabot PR が未マージ（深刻度：中）

3 件の Dependabot PR が open：
- PR #8：`src/example` の `glob` バンプ（2025-11-20 から open）
- PR #9：`src/plgg-foundry` の `glob` バンプ（2025-12-22 から open）
- PR #10：`src/example` の `lodash` バンプ（2026-01-23 から open）

`lodash` バンプは既知のプロトタイプ汚染の脆弱性があるため潜在的なセキュリティ懸念事項です。

**ソース**: `gh pr list`。

### 問題 3：`.workaholic/specs/` ドキュメントが存在しない（深刻度：中）

write-spec skill の gather script が空の `=== SPECS ===` セクションを返しました。`stakeholder.md`、
`component.md` などのアーキテクチャ viewpoint ドキュメントが `.workaholic/specs/` に存在しません。
このコードベースで作業するリーダーには構造化された参照資料がありません。

**ソース**: gather.sh の出力 `=== SPECS ===`（空）。

### 問題 4：`src/plgg/README.md` が現在の monorepo を反映していない（深刻度：低）

`src/plgg/README.md` の Project Structure セクションに `src/plgg/` と `src/example/` しか記載されて
いません。確立されたパッケージである `plgg-kit` と `plgg-foundry` が省略されています。
root の `README.md` は正確です。

**ソース**: `src/plgg/README.md` 6-12行目 vs root `README.md` 6-13行目。

### 問題 5：`plgg-foundry` README が古い API パターンを使用（深刻度：低）

`src/plgg-foundry/README.md` の Complete Example（189行目）は `runFoundry(foundrySpec)(orderSpec)` を
呼び出し、`result.isOk()` をメソッドとして呼び出しています。しかし plgg v0.0.25 の CHANGELOG は
box constructor とパターンマッチャー（例：`ok$`/`err$`）の破壊的変更を記録しています。この例は
現在の API に対してコンパイルできない可能性があります。

**ソース**: `src/plgg-foundry/README.md` 188-199行目、`src/plgg/CHANGELOG.md` 41-42行目。

### 問題 6：`plgg-kit` README が `result.isOk()` メソッドパターンを使用（深刻度：低）

問題 5 と同様。`src/plgg-kit/README.md` 53行目は `result.isOk()` を呼び出しています。
このメソッドスタイルのパターンは現在の `plgg` Result API と一致しない可能性があります。

**ソース**: `src/plgg-kit/README.md` 53行目。

**信頼度**: 問題 1-4 は高、問題 5-6 は中（確認には TypeScript コンパイルチェックが必要）

---

## 提案されたソリューション

### 問題 1 への対応（リリース候補の停滞）

明示的なリリースポリシーを確立する：PR #6 がマージされるための条件（テスト合格、すべての
CHANGELOG Unreleased エントリの確定、dependabot PR の解決）を定義する。これをプロジェクトの
constraint として文書化し、目標日を設定する。

### 問題 2 への対応（Dependabot PR）

深刻度順に Dependabot PR をレビューしてマージする。`lodash`（PR #10）は既知の CVE があるため
最優先。`glob` バンプ（#8、#9）はリスクが低い。これらをマージすることで PR #6 チェックリスト
の #7 がアンブロックされる。

### 問題 3 への対応（Spec ドキュメントの不在）

write-spec skill を使用して `.workaholic/specs/` に 8 つの viewpoint spec ファイル
（`stakeholder.md`、`model.md`、`usecase.md`、`infrastructure.md`、`application.md`、
`component.md`、`data.md`、`feature.md`）を初期化する。コード変更ではなくドキュメントスプリント
タスクです。

### 問題 4 への対応（`src/plgg/README.md` の古さ）

`src/plgg/README.md` の Project Structure セクションを更新して、4 つのソースパッケージ（`plgg`、
`plgg-foundry`、`plgg-kit`、`example`）をすべて列挙する。作業量が少ない変更。次の commit に
含めることができます。

### 問題 5・6 への対応（API パターンの検証）

example usage に対して `sh/tsc-plgg.sh` を実行し、`result.isOk()` メソッドパターンが現在でも
コンパイルできるか確認する。コンパイルできない場合は、README のコード例を現在の `ok$`/`err$`
関数型パターンに更新する。コンパイルできる場合は、`isOk()` メソッドが互換性のために保持されて
いることをドキュメント化する。
