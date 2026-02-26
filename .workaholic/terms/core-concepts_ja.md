---
title: コアコンセプト
description: plgg モノレポ全体で使用される基盤となる用語の定義
category: developer
last_updated: 2026-02-26
commit_hash: ddbb696
---

[English](core-concepts.md) | [Japanese](core-concepts_ja.md)

# コアコンセプト

## plgg

plgg はモノレポのルート package であり、プロジェクト全体の名称でもあります。package としての `plgg`（`src/plgg/` に配置）は、TypeScript 関数型プログラミングの型システムとパイプラインプリミティブライブラリを提供し、Abstracts、Atomics、Basics、Collectives、Conjunctives、Contextuals、Disjunctives、Exceptionals、Flowables、Functionals、Grammaticals の 11 のカテゴリで構成されています。プロジェクト名としての「plgg」は、`plgg`、`plgg-foundry`、`plgg-kit` の各 package と未公開の `example` package を含む `github.com/qmu/plgg` のモノレポ全体を指します。このプロジェクトは明示的に UNSTABLE とマークされており、主に内部利用を目的としています。

## plgg-foundry

plgg-foundry は `src/plgg-foundry/` に配置された AI 駆動の workflow オーケストレーション package です。名前付き `Apparatus` ユニットのコレクションである `Foundry` 設定と、自然言語による命令である `Order` を受け取り、LLM provider を使って `Alignment`（構造化された操作プラン）を生成し、登録済みの apparatus に対してそのプランを実行します。公開 API は `runFoundry(foundry)(order)` であり、内部で `blueprint` と `operate` 関数を合成します。plgg-foundry は型システムを `plgg` に、LLM provider アクセスを `plgg-kit` に依存しています。

## plgg-kit

plgg-kit は `src/plgg-kit/` に配置された LLM ベンダー抽象化 package です。`Provider` union 型（`OpenAI | Anthropic | Google`）を定義し、それぞれファクトリ関数（`openai()`、`anthropic()`、`google()`）で構築します。主なエクスポートは、provider 型に基づいて適切なベンダーアダプタへ処理を委譲する `generateObject` 関数です。plgg-kit は、完全な workflow オーケストレーションレイヤーに依存することなく LLM アクセスを独立して再利用できるよう、plgg-foundry から分離されました。

## apparatus

apparatus は `Foundry` 設定に登録された呼び出し可能な振る舞いの単位です。3 つのバリアントからなる `Box` union で表現されます。`Processor`（関数を実行し、名前付き入出力をレジスタ経由でマッピングする）、`Switcher`（真偽値を返す関数を実行し結果に基づいて分岐する）、`Packer`（egress の出力フィールドを指定する）です。Apparatus は名前付きであり、`Foundry` の `apparatuses` フィールドに収集されます。`Alignment` が実行されるとき、プラン内の各 `Operation` は apparatus 名を参照して対応するロジックを検索・実行します。

## alignment

alignment は plgg-foundry の `blueprint` 関数によって生成される構造化された操作プランです。`Order` 入力から LLM が生成した `Obj<{analysis, ingress, operations, egress}>` です。`ingress` フィールドはエントリポイントを定義し、`operations` は `Assign | Process | Switch` ノードのシーケンスであり、`egress` は名前付きレジスタ値を最終出力として収集します。alignment は、自然言語リクエストと `operate` のレジスタベース実行モデルの間の中間表現として機能します。

## order

order は `runFoundry` への入力として渡される自然言語の命令です。foundry のオーダースキーマで定義されたフィールドを持つ `Obj` として型付けされます。order は `blueprint` 関数に渡され、LLM provider に転送されて `Alignment` が生成されます。「order」という用語は plgg-foundry 内で、ユーザーの意図（order）、実行プラン（alignment）、結果を区別するために使われます。

## result

Result は `plgg` の Disjunctives カテゴリの discriminated union 型で、`Ok<T> | Err<E>` として定義されます。例外をスローすることなく成功または失敗する可能性のある計算を表します。パターンマッチング API は Flowables の `match` 関数と `ok$`・`err$` コンストラクタを使った網羅的なハンドリングを採用しています。コードベース全体で、失敗する可能性のある関数は `Result` または `PromisedResult<T, E>`（非同期バリアント）を返し、全呼び出し箇所で明示的なエラーハンドリングを強制します。

## pipe

pipe は `plgg` の Flowables カテゴリのコア同期パイプライン合成関数です。初期値と関数のシーケンスを受け取り、各関数の出力を次の関数の入力として渡します。関連するパイプラインプリミティブとして、Result を返す関数を連鎖させ `Err` で短絡する `cast`、非同期 Procedural を返す関数を連鎖させる `proc`、初期値なしのポイントフリーパイプラインを作成する `flow` があります。

## brand

brand は `plgg` の Grammaticals カテゴリの `Brand<T, B>` を使ってベース型に適用するコンパイル時の名前的型マーカーです。ブランド型は、構造的には互換性があるが意味的に異なる値の間の誤った代入を防ぎます。例えば、`Str` は通常の `string` とは区別されるブランド付き文字列です。plgg の Atomics および Basics からエクスポートされるほとんどの型はブランド付きです。
