# plgg-poc1-search

> PoC 1 of the plggpress confidence-collection fleet for the
> [plgg monorepo](../../README.md) — browser-side **indexed full-text search
> vs vector RAG**, measured side-by-side on the real plgg guide corpus.
> Portal: [plgg-poc-portal](../plgg-poc-portal/README.md) /
> `https://plgg-poc.qmu.dev/`.

The plggpress vision leaves one search decision open: *"browser-side vector DB
RAG only when its full scratch cost is affordable — or indexed full-text
search on the browser side."* This PoC answers it with measurements, not
opinions:

- **FTS arm (from scratch, always on):** a build-time indexer chunks the
  guide by heading path and emits a JSON inverted index; the browser ranks
  with a from-scratch BM25 (`src/search/fts.ts`). Zero dependencies.
- **Vector arm:** the same chunks are embedded at build time with a local
  MiniLM model; the browser embeds the query with the *same* model (loaded
  from the CDN at runtime — the download/init cost is a displayed metric,
  not hidden in the bundle) and ranks by cosine top-k
  (`src/search/rag.ts`, copied verbatim from plgg-cms's pure
  `similarity.ts`).

The page shows both panes for one URL-held query (`?q=…`, deep-linkable), the
measured build facts (index payload bytes, build times), and a canned-query
benchmark (10 guide questions) with per-arm latency p50/p95.

## Measured build facts (this checkout)

| | payload | build time |
| --- | --- | --- |
| corpus | 38 files, 178 chunks, ~118 KB | — |
| fts.json | ~252 KB | ~19 ms |
| embeddings.json (MiniLM, 384d fp32) | ~1.4 MB | ~11–15 s |

## 日本語対応 — CJK トークナイザの実測（Ticket B）

**短い答え：現行の全文検索は日本語では機能しません。** 共有トークナイザ
（`src/search/tokenize.ts`）は小文字化して `[a-z0-9]+`（英数字の連続）を
取り出すだけなので、日本語の文字はどれもマッチせず、**日本語の単語は 1 つも
索引化されません**。日本語だけのクエリはヒット 0、日本語混じりの文書でも
拾えるのは URL 断片（`/design` など）や英単語（`plgg`・`AI`・`null`）といった
**付随的な英字だけ**です。

これを測るため、`../qmu-co-jp/docs` の**実際の qmu.co.jp 日本語ポリシー記事**を
`corpus-ja/` に取り込み（リポジトリ外に依存せず再現できるよう同梱）、3 つの
トークナイザを並べて計測しました（`entrypoints/buildIndex.ts` → `ja-report.json`、
ページの「Japanese (CJK) tokenizer」節に表示）。

コーパス：11 ファイル / 287 チャンク（約 109 KB の日本語 Markdown）。

| トークナイザ | 索引トークン数 | 語彙数 | 索引ペイロード |
| --- | --- | --- | --- |
| 現行（latin `[a-z0-9]+`） | 2,906（＝付随英字のみ） | 385 | ~100 KB |
| `Intl.Segmenter`（word） | 21,427 | 2,561 | ~216 KB |
| bigram（2-gram） | 34,776 | 7,769 | ~359 KB |

品質（定番 5 クエリ・top-3、ページで横並び判定）：

- 「型駆動設計とエスケープハッチ」「情報セキュリティのコミットメント」など
  **純日本語クエリは現行＝ヒット 0**、Segmenter / bigram は該当節を取得。
- 「モードレスなUI設計」では現行が**誤ヒット**（全 `design.md` チャンクが共有する
  `/design/…` という英字 URL 断片にマッチし、無関係な節を返す）。Segmenter /
  bigram はいずれも正しい「モードレスなUI設計」（`design.md` の
  `modeless-design` 節）を返す。

**評価。** `Intl.Segmenter`（プラットフォーム組み込み＝依存ゼロ、
vendor-neutrality 適合）が、bigram とほぼ同等の検索品質を**約 6 割の索引サイズ**で
達成しています。bigram は言語非依存で recall が保証される代わりに索引が最大。
既定は Segmenter、`Intl.Segmenter("ja")` を持たない実行環境向けの保険として
bigram を用意する、が妥当です。索引/クエリは同じ戦略で処理される必要があるため、
戦略は `FtsIndex.cjk` に埋め込んで不一致を型で防いでいます。

## Commands

- `npm run build` — bundle the client (`build:app`), then build the index
  assets (`build:index`; order matters — the bundler's atomic publish
  replaces `dist/`). The index build downloads the MiniLM ONNX weights into
  the local HF cache on first run and needs network.
- `npm run serve` — serve page/bundle/assets on `PORT` (default 5173).
- `npm run test` — strict typecheck + the smoke specs (chunker, tokenizer,
  BM25 ranking, cosine top-k totality).

From the repo root: `scripts/serve-poc.sh poc1-search` (host port **5184** →
container 5173; tunnel route `plgg-poc1.qmu.dev`, developer-applied — see the
portal README's cloudflared snippet).

## Dependency decision — @huggingface/transformers

Per the vendor-neutrality policy (implement by default; justify, log, and
contain an external dependency):

- **Reason.** The vector arm needs an embedding model on both sides of the
  wire (build-time chunks, query-time in-browser). Hand-rolling a sentence
  embedder is exactly the "full scratch cost" the plggpress vision questions;
  this PoC buys the measurement without pre-committing production to the
  dependency. It is a `devDependency` of a **private** PoC package: build-time
  only in node, CDN-loaded at runtime in the browser, never part of a
  published artifact.
- **Assessment.** Apache-2.0, actively maintained by Hugging Face,
  de-facto standard for in-browser transformer inference (ONNX Runtime WASM
  under the hood). Confined to `src/vendors/` (anti-corruption boundary; the
  domain sees only the `Embedder` seam in `src/search/embedder.ts`).
- **Monitoring.** Version pinned in the CDN specifier and package.json;
  the PoC is sacrificial, so drift surfaces on the next rebuild, not in
  production.
- **Exit strategy.** The PoC's own metrics ARE the exit evidence: if the
  verdict is "FTS suffices", the dependency dies with the PoC; if vectors
  win, production integration re-opens the from-scratch question with the
  measured costs (model bytes, init ms, embed ms) on the table.

## Sovereignty note

The primary path is fully local: corpus, index, model, and query never leave
the visitor's browser (data-sovereignty aligned). The alternative
OpenAI-shaped network embedder (`src/vendors/networkEmbedder.ts`, mirroring
plgg-cms's `embedderConfig`) sends query text — and at build time the whole
corpus — to the provider; it activates only when `OPENAI_API_KEY` is present
at build time and is otherwise shown as the arm's honest "unavailable" state.
This build ran **without** a key: the local MiniLM space is the only
embedding space shipped.

## Status vocabulary

The verdict (which arm, plus the vector arm's from-scratch cost estimate) is
recorded on the portal's PoC 1 record
(`../plgg-poc-portal/src/pocs.ts`) after the developer judges the canned
side-by-side results in a real browser.
