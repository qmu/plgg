---
title: Feature Viewpoint (Japanese)
description: plgg モノレポの機能インベントリ、機能マトリックス、および設定オプション。
category: developer
modified_at: 2026-02-26T04:18:49+09:00
commit_hash: ddbb696
---

[English](feature.md) | [Japanese](feature_ja.md)

# Feature Viewpoint

この viewpoint は plgg モノレポのすべての観測可能な機能をカタログ化します。`plgg` の関数型型システム機能、`plgg-foundry` の AI パイプラインオーケストレーション機能、`plgg-kit` の LLM プロバイダー統合機能を扱います。具体的な使用パターンについては [Use Case Viewpoint](usecase_ja.md)、モジュール分解については [Component Viewpoint](component_ja.md) を参照してください。

## plgg — コア機能インベントリ

### 機能: 型安全なパイプライン合成

`pipe` は完全な静的型推論で最大 21 個の同期関数を合成します。各ステップは前のステップの正確な出力型を受け取ります。

`flow` はポイントフリー合成を提供します: `flow(f, g)` は `(x) => g(f(x))` に相当する関数を返します。

`cast` は `Result` を返す関数の `pipe` の変種です。失敗したブランチからのシブリングエラーを蓄積し、より豊かな診断情報を提供します。

`proc` は `Procedural` を返す関数の非同期版です。Promise と Result を自動的にアンラップし、最初の `Err` で短絡します。最大 21 ステップをサポートします。

### 機能: Option と Result モナド

`Option<T>` は null なしで値の存在または不在をエンコードします。コンストラクター: `some(v)`、`none()`。型クラスインスタンス: `optionFunctor`、`optionApply`、`optionApplicative`、`optionChain`、`optionMonad`。

`Result<T, E>` は例外なしで成功または失敗をエンコードします。コンストラクター: `ok(v)`、`err(e)`。完全な型クラスインスタンス: `resultFunctor`、`resultApply`、`resultApplicative`、`resultChain`、`resultMonad`、`resultFoldable`、`resultTraversable`。

### 機能: 型クラス階層 (HKT シミュレーション)

`Abstracts/Principals/` モジュールは、開放インターフェース拡張技術を使用した高階カインド型の TypeScript インターフェースを提供します:

- `Functor1/2/3`: `map`
- `Apply1/2/3`: `ap`
- `Pointed1/2/3`: `of`
- `Applicative1/2/3`: Apply + Pointed の組み合わせ
- `Chain1/2/3`: `chain`
- `Monad1/2/3`: Chain + Applicative の組み合わせ
- `Foldable1/2`: `foldr`、`foldl`
- `Traversable1/2`: `traverse`、`sequence`
- `Semigroup`、`Monoid`: `concat`、`empty`

### 機能: 検証付きプリミティブ型システム

すべてのプリミティブ型には検証済みキャスト関数 (`as*`) と型ガード (`is*`) が付属しています。

**Atomics**: `Num`、`BigInt`、`Bool`、`Bin`、`Time`、`SoftStr`、`Int`。
**Basics (精製数値)**: `I8`〜`I128`、`U8`〜`U128`、`Float`。
**Basics (ブランド文字列)**: `Str`、`Alphabet`、`Alphanumeric`、`CamelCase`、`PascalCase`、`KebabCase`、`SnakeCase`、`CapitalCase`。

### 機能: Box と Brand による名目型付け

`Box<TAG, CONTENT>` は名目型付けを提供します。`Brand<T, B>` はランタイムオーバーヘッドなしでコンパイル時ブランディングを提供します。`Icon` は列挙スタイルの値のためのタグのみのバリアントを提供します。

### 機能: パターンマッチング

`match` は最大 20 のケースブランチをサポートする網羅的パターンマッチング関数です。パターンは `Icon` パターン（Box タグのマッチング）、アトミックリテラルパターン、`otherwise` センチネルのいずれかです。TypeScript は呼び出しサイトで網羅性を強制します。

### 機能: 集約型

`Obj<T>` はすべての値が `Datum` である読み取り専用レコードです。`Dict<K, V>` は同質な文字列キー辞書です。`Vec<T>` は型付きイミュータブル配列です。`MutVec<T>` はミュータブル対応物です。

### 機能: エラー階層

`PlggError` はドメインエラーユニオン: `InvalidError | Exception | SerializeError`。すべてのエラーは診断コンテキストのためのオプションの `parent` と `sibling` チェーンを持ちます。`printPlggError` は ANSI カラーコードで完全なエラーチェーンを pretty-print します。

### 機能: ユーティリティ関数

| 関数 | 説明 |
|---|---|
| `bind(f)(a)` | 最初の引数の部分適用 |
| `tap(f)` | 元の値を返すサイドエフェクトの注入 |
| `find({predicate, errMessage})` | `Result` を返す安全な配列検索 |
| `filter(predicate)` | 型付き配列フィルター |
| `defined(v)` | undefined に対するガード |
| `refine(predicate, message)` | 述語ベースの精製キャスト |
| `conclude(fn)(array)` | 配列に `fn` をマップし、エラーを収集 |
| `debug(label)` | ロギングタップ（入力を変更せずに返す） |
| `env(key)` | 環境変数を読み取り、`Result<string, Error>` を返す |
| `hold(fn)` | 関数をメモ化 |
| `tryCatch(fn)` | スローする関数を `Result` でラップ |
| `forProp(key, asFn)` | `cast` チェーンのための検証済みプロパティ抽出 |
| `forOptionProp(key, asFn)` | オプションプロパティ抽出 |
| `forContent(tag, asFn)` | Box コンテンツ検証 |
| `unbox(v)` | Box コンテンツを再帰的に抽出 |

## plgg-foundry — AI パイプライン機能インベントリ

### 機能: Foundry 設定

`makeFoundry(spec)` は `Foundry` 値を作成します:

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `description` | `string` | 必須 | AI にコンテキストとして送信 |
| `apparatuses` | `Apparatus[]` | 必須 | Processor、Switcher、Packer インスタンスの配列 |
| `provider` | `Provider` | `openai("gpt-5.1")` | blueprint 生成用 LLM provider |
| `maxOperationLimit` | `number` | `10` | 中断前の最大操作数 |
| `beforeOperations` | `callback` | なし | 実行前に alignment + order で呼ばれるフック |
| `afterOperations` | `callback` | なし | 実行後に medium + order で呼ばれるフック |

### 機能: Apparatus タイプ

**Processor** (`makeProcessor(spec)`): `process` 操作中に呼び出される名前付き関数。

**Switcher** (`makeSwitcher(spec)`): `switch` 操作中に呼び出される名前付き条件。`[boolean, Dict<string, Datum>]` を返します。

**Packer**: egress 出力フィールドの型仕様。

### 機能: AI Blueprint 生成

`blueprint(foundry)(order)` は構造化されたシステムプロンプトで LLM を呼び出します。`asAlignment` で検証された後、実行されます。

### 機能: Alignment の操作タイプ

| 操作 | フィールド | 目的 |
|---|---|---|
| `ingress` | `type`、`next` | エントリポイント |
| `assign` | `type`、`name`、`address`、`value`、`next` | AI 抽出リテラルをレジスタに書き込む |
| `process` | `type`、`name`、`action`、`input[]`、`output[]`、`next` | Processor を呼び出し、レジスタをマッピング |
| `switch` | `type`、`name`、`action`、`input[]`、`nextWhenTrue`、`nextWhenFalse`、`outputWhenTrue[]`、`outputWhenFalse[]` | Switcher を呼び出し、ブランチ |
| `egress` | `type`、`result[]` | 名前付きレジスタ出力を収集 |

### 機能: 操作安全制限

`maxOperationLimit`（デフォルト 10）は循環的なアライメントでの無限ループを防ぎます。

## plgg-kit — LLM 統合機能インベントリ

### 機能: マルチプロバイダーサポート

| プロバイダー | タグ | コンストラクター | 環境変数 |
|---|---|---|---|
| OpenAI | `"OpenAI"` | `openai(model)` | `OPENAI_API_KEY` |
| Anthropic | `"Anthropic"` | `anthropic(model)` | `ANTHROPIC_API_KEY` |
| Google | `"Google"` | `google(model)` | `GEMINI_API_KEY` |

### 機能: 構造化オブジェクト生成

`generateObject({provider, systemPrompt, userPrompt, schema})` は設定された LLM にプロンプトを送信し、提供された JSON スキーマに一致する構造化オブジェクトを返します。

## TypeScript 設定機能

すべてのパッケージは同一の厳格な TypeScript 設定を共有します:

- `"strict": true` — 完全な strict モード。
- `"noUnusedLocals": true`、`"noUnusedParameters": true` — デッドコードなし。
- `"noUncheckedIndexedAccess": true` — インデックスアクセスは `T | undefined` を返す。
- `"exactOptionalPropertyTypes": true` — オプションプロパティは明示的に `undefined` にできない。
- `"erasableSyntaxOnly": true` — ランタイム効果を持つ `enum` や `namespace` は禁止。
- `as`、`any`、`@ts-ignore` はプロジェクトルール (CLAUDE.md) で禁止されています。

## 前提条件

- **[Explicit]** `maxOperationLimit` はデフォルト 10、`provider` はデフォルト `openai("gpt-5.1")` として `src/plgg-foundry/src/Foundry/model/Foundry.ts` でハードコードされています。
- **[Explicit]** 3 つのサポートされた LLM ベンダーはベンダーディレクトリ一覧で確認されています。
- **[Explicit]** TypeScript 設定フラグは各パッケージの `tsconfig.json` から直接読み取られています。
