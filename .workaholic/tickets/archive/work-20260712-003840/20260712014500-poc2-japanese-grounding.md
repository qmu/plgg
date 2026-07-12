---
created_at: 2026-07-12T01:45:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash: 322ed264
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 2 — Japanese grounding (segmenter-indexed qmu.co.jp corpus, language-routed retrieval)

## Overview

Live acceptance of PoC 2 surfaced the gap immediately: the developer's first
real question was Japanese (「ドキュメンテーションについての方針を教えて
ください」), and the latin-only-tokenized English guide index retrieved zero
chunks, so the agent honestly refused. The refusal path worked; the reader
need is Japanese. Add a second, Japanese-capable index and route retrieval by
the question's script, so the PoC's grounding judgment can be made in
Japanese too.

Everything hard here is already proven: PoC 1's Ticket B vendored the REAL
qmu.co.jp Japanese policy corpus (`packages/plgg-poc1-search/corpus-ja/`,
11 files — includes the documentation policy) and measured that
`Intl.Segmenter` indexing gives dictionary-quality Japanese retrieval at ~60%
of bigram's payload with zero dependencies. `FtsIndex.cjk` already carries
the strategy so query tokenization can never mismatch the index.

## Implementation Steps

1. `buildIndex.ts`: also chunk `../plgg-poc1-search/corpus-ja/*.md` (same
   relative-reuse seam) and write `dist/index/ja-fts.json` built with
   `"segmenter"`.
2. `serve.ts`: serve `/index/ja-fts.json`.
3. `app.ts`: `Ready` gains `jaFts: Option<FtsIndex>` (absent file degrades to
   EN-only, never a failed load — the PoC 1 contract). Retrieval routes by
   script: a question containing CJK characters searches the JA index when
   present, else the guide index. Each `Exchange` records which corpus
   grounded it so the view can label and link it.
4. Citations: JA chunks link to `https://qmu.co.jp/<file-stem>` (the corpus
   is vendored from qmu.co.jp's articles); EN chunks keep
   `https://plgg.qmu.co.jp/…`.
5. `answer.ts` SYSTEM prompt: answer in the language of the question.
6. `canned.ts`: append 3 Japanese questions grounded in the policy corpus
   (rephrase PoC 1's measured JA queries as natural questions).
7. Specs: CJK routing, JA citation link base, degraded EN-only state.

## Quality Gate

- `scripts/test-plgg-poc2-agent.sh` green (typecheck + offline smoke, no
  network).
- Japanese canned questions retrieve real policy chunks and render cited
  answers side-by-side at `plgg-poc2.qmu.dev`; the developer judges them
  live (the mission's confidence-signal bar, now bilingual).
- EN behavior unchanged; missing `ja-fts.json` degrades to EN-only.
- No `as`/`any`/`ts-ignore`; Prettier printWidth 50; key-safety unchanged
  (retrieval stays browser-local for both corpora).

## Considerations

- Cross-language retrieval (JA question over EN corpus) is out of scope —
  BM25 cannot bridge languages; the JA corpus answers JA questions.
- `corpus-ja` stays vendored in plgg-poc1-search (single source); poc2 reads
  it through the same relative seam as the FTS modules.
