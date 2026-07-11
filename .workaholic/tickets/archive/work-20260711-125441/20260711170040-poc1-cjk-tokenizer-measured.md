---
created_at: 2026-07-11T17:00:40+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash: efb0b994
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 1 CJK tokenizer, measured (Intl.Segmenter vs bigram) on the real qmu.co.jp Japanese corpus + JA explainer

## Overview

**Ticket B** of the three follow-ups carried in the resumption ticket
`20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md`. PoC 1's verdict
(recorded in Ticket A) names a known cost: the from-scratch tokenizer is
English-only (`[a-z0-9]+` runs), so **CJK corpora index to nothing**. This
ticket turns that caveat into measured numbers and extends the tokenizer to
handle Japanese, then delivers a Japanese-language explanation the developer
asked for.

**The defect, precisely** (`packages/plgg-poc1-search/src/search/tokenize.ts`):
`tokenize` lowercases then matches `/[a-z0-9]+/g`. `.toLowerCase()` does not
change CJK, and `[a-z0-9]+` matches no CJK codepoint, so **every Japanese
document produces zero tokens** — the FTS index is empty for Japanese, recall
is 0. This one module is shared by index build (`buildFts.ts` →
`chunkTokens`) and query time (`fts.ts`), so extending it fixes both sides
consistently (they MUST agree or recall collapses).

**Decisions locked with the developer this session (do not relitigate):**
- **Corpus = (b) the REAL qmu.co.jp Japanese articles**, sourced from the
  sibling checkout `../qmu-co-jp/docs/*.md` (design.md, implementation.md,
  operations.md, planning.md, safety.md, development.md, policies.md,
  service.md, about.md, index.md, llm-foundation-research.md — ~111 KB of real
  published Japanese, the JA originals of the same policy content plgg's guide
  carries in English). Because `../qmu-co-jp` is **outside** the plgg repo (the
  PoC container build and the fresh-clone CI cannot read it), a representative
  sample MUST be **vendored into the package as a committed fixture** so the
  measurement is reproducible.
- **Tokenizer = (c) BOTH Intl.Segmenter AND character bigram, measured
  side-by-side** — the comparison IS the PoC's proof. Show index-size and a
  quality spot-check for each, next to the English baseline.

## Key Files

- `packages/plgg-poc1-search/src/search/tokenize.ts` — extend: keep the latin
  `[a-z0-9]+` path; add CJK-run handling in two selectable strategies
  (`Intl.Segmenter` word-granularity, and character bigram). The index and its
  query MUST use the same strategy, so the strategy is a parameter threaded
  into both `chunkTokens` (build) and `fts.ts` (query).
- `packages/plgg-poc1-search/src/indexer/buildFts.ts` — `chunkTokens` calls
  `tokenize`; thread the strategy through so a JA index can be built under each
  strategy.
- `packages/plgg-poc1-search/src/search/fts.ts` — query-time tokenization must
  use the same strategy as the index it queries.
- `packages/plgg-poc1-search/src/entrypoints/buildIndex.ts` — reference for how
  the guide corpus is read/measured (globSync + chunkMarkdown + metrics.json).
  The JA build mirrors this over the vendored JA fixture.
- `packages/plgg-poc1-search/src/view.ts` — the metrics table + canned-query
  benchmark; add a JA comparison section (baseline `[a-z0-9]+` → ~0 tokens vs
  Segmenter vs bigram: index bytes, token/postings counts, a few JA queries).
- **NEW** `packages/plgg-poc1-search/corpus-ja/` (or `fixtures/ja/`) — the
  vendored representative sample of `../qmu-co-jp/docs/*.md`.
- **NEW** `packages/plgg-poc1-search/.prettierrc.json` **and**
  `packages/plgg-poc-portal/.prettierrc.json` — the missing printWidth-50
  config every other package carries (see Considerations; deferred concern from
  Ticket A). Needed so this ticket's new code formats to house style.
- **NEW** a Japanese-language explainer doc (location per house docs
  convention, e.g. the PoC 1 README or a `docs/` note) answering "does the
  current full-text index work for Japanese?".

## Policies

- `workaholic:implementation` / `coding-standards` — from-scratch,
  vendor-neutral: `Intl.Segmenter` is a platform BUILT-IN (a global, no import,
  no npm dep) so it is allowed in production `src/search/`; bigram is trivial
  hand code. No `as`/`any`/`ts-ignore`; Option/Result; Prettier printWidth 50.
- `workaholic:implementation` / `vendor-boundary` — no new bare/`node:` imports
  in `src/search/`; corpus file reads stay in `entrypoints/` (node:fs is
  exempt there).
- `workaholic:design` — the page states honestly what works: the baseline JA
  result is "0 tokens indexed" (not hidden), the improvement is measured.

## Implementation Steps

1. **Scaffold hygiene first:** add `.prettierrc.json` (printWidth 50, matching a
   sibling package verbatim) to BOTH `plgg-poc1-search` and `plgg-poc-portal`
   so new/edited code formats correctly (this gap silently reformats files to
   width 80 otherwise — it bit Ticket A).
2. **Vendor the JA corpus:** copy a representative sample of
   `../qmu-co-jp/docs/*.md` into `packages/plgg-poc1-search/corpus-ja/`
   (strip front-matter/site-relative link noise only if it distorts the
   measurement; otherwise keep as-is for realism). Commit it — the source is
   real published qmu content; confirm at review that vendoring qmu's own JA
   articles into qmu's own PoC is acceptable (expected yes).
3. **Extend the tokenizer:** in `tokenize.ts`, keep the latin run behavior and
   add CJK-run segmentation as a selectable strategy — `"segmenter"`
   (`new Intl.Segmenter("ja", { granularity: "word" })`, keeping word segments,
   dropping pure-punctuation/space segments) and `"bigram"` (2-char sliding
   window over each CJK run). Latin and CJK runs coexist in one string, so
   split a mixed run into latin vs CJK spans and apply the right rule to each.
   Keep the single-char-drop noise rule sensible per strategy (bigram tokens
   are 2 chars by construction; segmenter may yield 1-char function words —
   decide and document).
4. **Thread the strategy** through `chunkTokens`/`buildFtsIndex` (build) and
   `fts.ts` (query) so an index built under a strategy is queried under the
   same one.
5. **Build + measure** the JA index under each strategy (mirror
   `buildIndex.ts`'s metrics: fts.json bytes, token count, postings/vocab size,
   build ms) plus the English baseline and the current-tokenizer-on-JA baseline
   (≈0). Emit a JA metrics artifact the page reads.
6. **Show it on the PoC 1 page** (`view.ts`): a JA comparison section — the
   three columns (current `[a-z0-9]+` → 0, Segmenter, bigram) with index size
   and a ~5-query JA canned set showing retrieved chunks side-by-side, so the
   developer judges quality live. This is the confidence signal.
7. **Write the Japanese explainer**: short answer up front — 現行トークナイザは
   `[a-z0-9]+` のため日本語を1トークンも索引化できず、日本語検索は機能しない;
   本チケットで Segmenter / bigram を追加し、実測で比較した結果を示す。 Include
   the measured numbers and a recommendation.

## Quality Gate

**Acceptance criteria:**
- `tokenize.ts` handles CJK under both `"segmenter"` and `"bigram"` strategies,
  latin behavior unchanged; strategy is threaded so index and query always
  agree. Unit specs: a Japanese string yields >0 tokens under each strategy and
  exactly 0 under the current latin-only rule (the regression the ticket
  removes), and a mixed JA+English string tokenizes both spans.
- A JA index builds from the vendored corpus under each strategy; the page
  shows the three-way comparison (size + JA canned queries) with real retrieved
  chunks (non-empty results for Segmenter and bigram, empty for the baseline).
- The Japanese explainer exists and states the short answer + measured numbers.
- Both PoC packages have `.prettierrc.json`; the whole diff is width-50 clean.
- `./scripts/test-plgg-poc1-search.sh` green (tsc + smoke); no
  `as`/`any`/`ts-ignore`; no new bare/`node:` import in `src/search/`.

**Verification method:**
- `./scripts/test-plgg-poc1-search.sh` green (typecheck + tokenizer/index
  smoke specs, including the JA>0 / latin-0 assertions).
- Build the PoC and view the JA comparison section live on
  `plgg-poc1.qmu.dev` / local :5184 (developer judges JA retrieval quality on
  the canned set). Do NOT tear down a preview the developer is reading to
  rebuild — schedule the container refresh.
- The vendored corpus makes the measurement reproducible without
  `../qmu-co-jp` present (container/CI-safe).

**Gate:** `test-plgg-poc1-search` green AND the developer accepts the live JA
comparison as convincing, before approval.

## Considerations

- **Reproducibility vs realism reconciled by vendoring:** the corpus is the
  REAL qmu.co.jp JA articles (developer's (b)), but committed into the package
  so the container build and fresh-clone CI don't depend on the out-of-repo
  `../qmu-co-jp` path.
- **Both strategies is the point (developer's (c)):** don't collapse to one —
  the size/quality tradeoff (Segmenter = compact, dictionary-quality,
  runtime-dictionary-dependent; bigram = larger, language-agnostic, guaranteed
  recall) is what the PoC proves. Segmenter needs a bigram fallback only if a
  target runtime lacks `Intl.Segmenter("ja")`; note the assumption.
- **Scaffold hygiene (deferred concern from Ticket A):** poc1-search AND
  poc-portal lack `.prettierrc.json`; fixing both here closes the gap for the
  whole PoC fleet (same lesson family as the npm-install.sh omission — add the
  full scaffold set at package creation).
- **Verdict linkage:** completing this upgrades Ticket A's "CJK is a known
  cost" caveat into measured numbers; consider a one-line verdict refinement in
  a follow-up if the developer wants the portal verdict to cite the result.
- **Next:** Ticket C (PoC 2 reader-side agent) follows.
