---
title: セキュリティポリシー
description: plgg monorepo の認証、認可、secrets 管理、input validation に関するセキュリティプラクティス。
category: developer
modified_at: 2026-02-26T04:50:00+09:00
commit_hash: ddbb696
---

[English](security.md) | [Japanese](security_ja.md)

# セキュリティポリシー

このポリシーは plgg monorepo における実装済みのセキュリティプラクティスを文書化します。plgg はエンドユーザー向け認証サーフェスを持たないオープンソース TypeScript ライブラリであり、library dependency として利用されます。セキュリティ上の関心事は、`plgg-kit` および `plgg-foundry` における API credential の取り扱い、`plgg` コアの型システムによる type-safe な input validation、ならびに CI と `.gitignore` によるサプライチェーン管理に集中します。以下の各記述はその enforcement mechanism を引用します。証拠が存在しない領域は「確認されていない」と明記します。

## 認証

plgg monorepo にはユーザー向け認証レイヤーは存在しません。このコードベースにおける認証とは、サードパーティ LLM ベンダー API に対してライブラリ呼び出し元を認証することを意味します。

`plgg-kit` は 2 つのモードの API key 解決戦略を実装しています。`Provider` 値が `openai({ model: "...", apiKey: "..." })` のように明示的な `apiKey` フィールドを持って構築された場合、そのキーが直接使用されます。インラインキーが存在しない場合、`generateObject` は `plgg` の `env` ユーティリティを呼び出し、`process.env` から `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、または `GEMINI_API_KEY` を読み取ります。これは `src/plgg-kit/src/LLMs/usecase/generateObject.ts`（36〜52 行）で enforcement されます。`env` 関数は型付き `Result<string, Exception>` を返し、変数が存在しないか空の場合は明示的に `Exception` で失敗します（`src/plgg/src/Functionals/env.ts` 28〜34 行）。`proc` pipeline はその失敗を `Err` として伝播させ、例外をスローしません。

API key は HTTPS のみで送信されます。3 つのベンダーアダプターはすべて `https://` URL を使用して各ベンダーエンドポイントへ POST します：`https://api.openai.com/v1/responses`（OpenAI.ts 44 行）、`https://api.anthropic.com/v1/messages`（Anthropic.ts 44 行）、`https://generativelanguage.googleapis.com/v1beta/...`（Google.ts 52 行）。キーは HTTP header（`Authorization: Bearer`、`x-api-key`、`x-goog-api-key`）で渡され、URL クエリパラメーターには含まれません。

セッション管理、token リフレッシュ、多要素認証の仕組みは存在しません。これらはユーザーセッションの概念を持たない library には適用されません。

## 認可

ロールベースまたは属性ベースのアクセス制御は存在しません。本プロジェクトはサーバー、ユーザーデータベース、権限モデルを持たない library です。LLM 操作の認可は呼び出し元が提供する API key を通じてベンダー API に完全に委譲されます。

`plgg-foundry` の operation execution engine は内部ガードを 1 つ実装しています：`maxOperationLimit`。`ctx.operationCount >= ctx.foundry.maxOperationLimit` の場合、`execute` 関数は直ちに `err(new Error("Operation limit exceeded"))` を返します（`src/plgg-foundry/src/Foundry/usecase/operate.ts` 71〜77 行）。これにより AI が生成した alignment シーケンスで無限ループが発生することを防ぎます。デフォルトの上限は `makeFoundry`（`src/plgg-foundry/src/Foundry/model/Foundry.ts` 69 行）で 10 に設定されています。

`operate.ts` の operation dispatch は opcode を登録済みの apparatus リストと照合します。`process` または `switch` 操作が `foundry.apparatuses` に存在しない opcode を参照した場合、`findProcessor` または `findSwitcher` は直ちに `Err` を返します（`src/plgg-foundry/src/Foundry/model/Foundry.ts` 86〜115 行）。これにより AI 生成 alignment が宣言済み apparatus セット外の任意のコードパスを呼び出すことを防ぎます。

GitHub Actions workflow は最小権限のスコープ設定を適用しています。`run-tests.yml` は `permissions: issues: write; pull-requests: write` を宣言し、より広いリポジトリアクセスは持ちません。`prepare-release.yml` は `permissions: id-token: write; contents: read; pull-requests: write` を宣言し、job レベルでも再宣言することで多重防御を実現しています。`start-pull-request.yml` は `permissions: id-token: write; issues: write; contents: write; pull-requests: write` を宣言し、PR 作成フローに必要なものに限定されています。

## Secrets 管理

LLM ベンダーの API key はリポジトリに保存されません。リポジトリルートの `.gitignore` は `.env` および `.env.*`（`.gitignore` 13〜15 行）を除外し、secrets を含む `.env` ファイルの誤コミットを防ぎます。`src/plgg-foundry/` および `src/plgg-kit/` の `.env.example` ファイルはそれぞれ 3 つの期待される変数名（`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`）を空値でドキュメント化し、実際のキーなしのテンプレートとして機能します。

Claude Code プロジェクトレベル設定（`settings.local.json`）は `.gitignore`（`**/.claude/settings.local.json`）でバージョン管理から除外されており、ローカルのエディタ credential や token がコミットされることを防ぎます。

ソースコードや workflow ファイルに secrets は埋め込まれていません。`release.yml` および `prepare-release.yml` の workflow は GitHub が提供する `secrets.GITHUB_TOKEN` を使用しています。これは宣言された最小権限で GitHub Actions によって自動プロビジョニングされ、ユーザー管理の secret として保存されることはありません。

Secrets の rotation ポリシー、vault 統合、secret scanning の設定はリポジトリ内で確認されていません。

## Input Validation

Input validation は `plgg` コアパッケージで型付き cast システムを用いた基盤ライブラリ機能として実装されています。すべてのドメイン型は `cast` および `forProp` コンビネーターのチェーンを適用する `as*` cast 関数をエクスポートします。cast が失敗した場合、スローされるのではなく `Err<InvalidError>` が返されます。このパターンは Atomics、Basics、Collectives、Conjunctives、Contextuals のすべてのモジュールで実装されています。

`plgg-foundry` の order 入力は LLM 呼び出し前にバリデーションされます。`src/plgg-foundry/src/Foundry/model/Order.ts` の `asOrder` は `text` フィールドを `asStr`（非空文字列制約を enforcement）で、`files` フィールドを `asReadonlyArray(asBin)` でキャストします。無効な order は `runFoundry` が `blueprint` を呼び出す前に `Err` を返す原因となります。

LLM レスポンスのバリデーションはすべての AI 呼び出しの後に実施されます。`blueprint` 関数は LLM 出力を実行前に `asAlignment` に通します（`src/plgg-foundry/src/Foundry/usecase/blueprint.ts` 430 行）。`asAlignment` はすべての alignment フィールドに対して完全な cast チェーンを適用します。不正な LLM レスポンスは `blueprint` が無効な alignment を実行するのではなく `Err` を返す原因となります。

Assign 操作の値は `operate.ts` の `toJsonString` で JSON 文字列として保存され、読み取り時に `parseJsonValue` で解析されます（`operate.ts` 115〜135 行）。`parseJsonValue` 関数は `JSON.parse` を try-catch で包み、失敗時はスローせず生の文字列を返します（`operate.ts` 126〜135 行）。これにより不正な `assign` 値が executor をクラッシュさせることを防ぎます。

`proc` pipeline は各ステップでスローされたすべての例外をキャッチし、元のエラーを `parent` として持つ `Exception` でラップします（`src/plgg/src/Flowables/proc.ts` 949〜963 行）。ユーザー提供の apparatus 関数は `tryCatch`（`src/plgg/src/Functionals/tryCatch.ts`）を通じて呼び出され、同期・非同期両方の例外をキャッチして `Err` を返します。これにより未処理の例外が pipeline の境界を超えてエスケープしないことが保証されます。

各パッケージの `tsconfig.json` の TypeScript コンパイラ設定は `strict: true`、`noUncheckedIndexedAccess: true`、`exactOptionalPropertyTypes: true`、`noImplicitReturns: true` を enforcement します。これらの設定はコンパイル時に型の混乱によるエラークラス全体を排除します。CI workflow（`run-tests.yml`）はテスト実行前の明示的なステップとして `npx tsc --noEmit` を実行し、コンパイルエラーが merge をブロックすることを保証します。

HTML や SQL コンテンツのサニタイズは実装されていません。コードベースには HTML レンダリングもデータベースレイヤーも存在しないため、これは適用されません。

## 観察事項

コードベースは一貫した「型によるセキュリティ」アプローチを示しています。すべての pipeline プリミティブが返す `Result<T, E>` 型は呼び出し元にエラーパスの明示的な処理を強制します。null の伝播やサイレントな失敗は存在しません。ブランド型システム（`Brand<T, B>`）は同じプリミティブ型の値が異なるドメインロールで混同されることを防ぎます。`tryCatch` ラッパーと `proc` の内部 catch により、サードパーティ apparatus コード（ユーザー提供の processor および switcher 関数）が未処理の例外でランタイムをクラッシュさせることができません。

3 つの LLM ベンダーアダプターは `plgg-kit` の `vendor/` サブディレクトリに完全に隔離されています。各アダプターは言語プリミティブと plgg ドメイン型のみを受け取り・返します。ベンダー SDK オブジェクトはアダプター境界を超えてエスケープしません。これはコードベースの明示的なベンダー隔離戦略です。

GitHub Actions workflow は GitHub が管理する action のバージョンを `actions/checkout@v4` などのようにピン留めし、job レベルの権限制約を一貫して適用しています。広いリポジトリアクセスを持つサードパーティ action は確認されていません。

`src/example/` の `lodash` 依存関係（PR #10、2026-01-23 以降未マージ）のバージョン 4.17.21 には既知のプロトタイプ汚染脆弱性があります。これは未公開の `example` パッケージに影響する未解決の Dependabot 報告事項です。Dependabot の PR が 3 件未マージのままです。

## ギャップ

`.gitignore` 以外に、API key が誤ってコミットされることを防ぐ自動化されたメカニズムは確認されていません（GitHub Advanced Security の secret scanning、`gitleaks`、`trufflehog` などのシークレットスキャン設定は存在しない）。

CI に依存関係の脆弱性スキャン workflow は設定されていません。Dependabot PR は作成されるものの、自動マージやトリアージは行われていません。`run-tests.yml` workflow に `npm audit` のステップは存在しません。

Content Security Policy、レート制限、リクエスト署名は実装されていません。ライブラリはアウトバウンド API 呼び出しを行い HTTP サーバーを公開しないため、これらは適用されません。

セキュリティ変更履歴のセクション、脆弱性開示ポリシー（`SECURITY.md`）、または責任ある開示の連絡先はリポジトリ内で確認されていません。

Secrets の rotation ポリシーや vault 統合は確認されていません。

CI における SBOM（Software Bill of Materials）の生成や依存関係ライセンスコンプライアンスチェックは確認されていません。
