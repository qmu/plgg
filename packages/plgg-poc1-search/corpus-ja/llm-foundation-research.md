---
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# LLMs Research (Japanese)

このページは [LLMs Research](/en/llm-foundation-research) と同じトピック順で、日本語の生成・翻訳済み記事を並べる。英語版と日本語版は同じ記事集合を持ち、本文構成も同じ 7 セクションに揃える。

## [対象基盤モデル（カタログ）](/llm-foundation-research/foundation-models)

対象モデルのプロバイダー、tier、価格、effort、API サーフェスをまとめた参照カタログ。性能測定ではなく、比較対象の前提を固定するための資料として扱う。

## [LLM応答速度](/llm-foundation-research/llm-speed-comparison)

持続スループット、time-to-first-token、総レイテンシを同じ測定フレームで比較する。短い対話応答と長文生成を分けて読むための速度レポートである。

## [LLM出力精度](/llm-foundation-research/llm-accuracy-comparison)

JSON スキーマ制約、長さ指示追従、情報精度を比較する。一般能力の順位ではなく、出力制約に対して候補を絞るための測定として扱う。

## [LLM API可用性](/llm-foundation-research/llm-availability)

公開ステータスページ由来のインシデント履歴と 30/90 日の導出トレンドを扱う。SLA や信頼性ランキングではなく、取得元と制約を明示した可用性の観測記録である。

## [OCR能力の比較](/llm-foundation-research/ocr-comparison)

視覚対応モデルの文字起こしと構造化抽出を、CER/WER とフィールド精度で比較する。合成文書フィクスチャの範囲内の測定として読む。

## [RAGベクトルストアベンチマーク](/llm-foundation-research/rag-benchmark)

検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約を比較する。embedding と vector store の境界を明示して扱う RAG 向けの測定である。

## [LLM完全一致ベンチマーク](/llm-foundation-research/llm-benchmark)

研究から公開までのパイプラインを再現できる小さな完全一致精度ベンチマーク。生成・翻訳・公開フローの検証用記事として扱う。
