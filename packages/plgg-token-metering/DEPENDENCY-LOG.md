# plgg-token-metering — Dependency Decision Log

Per `workaholic:design` / `vendor-neutrality.md` (Conservative Vendor
Dependence). Independence from existing tokenizer libraries is this package's
reason to exist, so the decision below is the package's premise rather than an
incidental choice. **Outcome: zero new dependencies.** The runtime dependency
set is `plgg` — in-house, and domain vocabulary rather than a vendor.

Two distinct questions are logged: whether to take a tokenizer **library**
(no), and how to handle the vocabulary **data** those libraries would have
carried (as caller-supplied input, not a bundled asset).

---

## Decision 1: tokenizer libraries — NOT taken

Candidates: `tiktoken` (OpenAI encodings), `@anthropic-ai/tokenizer` (archived),
Hugging Face `tokenizers` / `transformers.js` (open-weight models),
SentencePiece bindings (Google lineage).

### Reason (理由)

Counting tokens needs a tokenizer. The purpose is to know what an API call will
be billed for before making it, and to attribute spend afterwards — which is the
foundation a usage-metering layer stands on.

### Assessment (点検)

Each candidate is reputable and permissively licensed (MIT / Apache-2.0), and
each is a legitimate piece of work. The problems are structural, not quality:

- **Coverage is per-provider.** `tiktoken` covers OpenAI only; HF `tokenizers`
  covers open-weight models only. Counting four families would mean adopting
  three libraries with three different models of what a tokenizer is.
- **No library covers Anthropic's current models at all.**
  `@anthropic-ai/tokenizer` is archived and covers legacy Claude 2 only, so the
  hardest family — the one where the tokenizer is unpublished — is exactly the
  one no library answers. A library-based approach cannot be completed; it can
  only be partial.
- **Native/WASM weight lands on every consumer.** `tiktoken` ships a WASM/native
  binding. This monorepo has zero third-party npm runtime dependencies and has
  already retired one native-binding dependency (vite/rolldown's darwin-only
  optional binding, which broke CI — see `plgg-bundle/DEPENDENCY-LOG.md`).
  Reintroducing that class of dependency into a library any app may import would
  repeat a failure this repo has already paid for.
- **The work being bought is small.** BPE inference against a *published* table
  is a loop of roughly 150 lines. The vendor-neutrality policy's
  implement-by-default principle applies squarely: this is not a specialized
  domain where a detail error is fatal and depth cannot be maintained in-house
  (cryptography, Unicode normalization, timezone data), nor a protocol
  compliance surface, nor a capability unreachable alone. It is a documented
  algorithm run against data the provider hands out.

### Decision and monitoring plan (決定と監視計画)

**Self-implement.** The BPE inference loop, both published vocabulary formats
(OpenAI's ranked-bytes `.tiktoken`, Hugging Face's ordered merge list), and the
pre-tokenization patterns are implemented here in plain TypeScript against the
providers' published rules.

The monitoring plan is not a mailing list — it is **the research topic's
recurring trial**. `token-metering` in qmu/research re-validates these counts
against the live provider APIs on each run, so a tokenizer change surfaces as a
holdout-error regression: the same signal a library adopter waits for a release
note to deliver, obtained directly and on our own schedule. The calibration
constants in `src/domain/usecase/measured.ts` carry the run's date, and
`registry.spec.ts` pins them to the published article.

Review triggers: a provider publishes a new encoding; a provider publishes a
tokenizer that was previously unavailable (which would move Claude or Gemini from
estimator to exact and is the outcome worth watching for); a holdout regression
appears in a trial run.

### Exit strategy (撤退戦略)

The counting interface hides the implementation. `countTokens(input)(counter)`
takes a `TokenCounter` built from a `ModelCard`; nothing in the signature names a
vocabulary format or a provider.

If a provider ships an encoding whose published rules the self-count cannot
reproduce within its band, the reference library can be adopted **behind the same
interface, for that provider only** — a new `TokenCounter` variant whose
construction wraps the library, leaving every call site and the entire domain
untouched.

- Scope of impact: `src/domain/usecase/bpe.ts` and
  `src/domain/usecase/parseVocabulary.ts` (the algorithm and the parsers), plus
  one new counter variant in `src/domain/model/TokenCounter.ts`. The pricing
  side, the value objects, and the registry are unaffected.
- Anticipated effort: person-days.
- The exit would also reintroduce the native-binding and per-provider-coverage
  costs assessed above, so it is a per-provider last resort rather than a
  wholesale retreat.

---

## Decision 2: vocabulary data — caller-supplied, NOT bundled

The vocabularies are the data the rejected libraries would have carried, so
declining the libraries does not settle where the data lives.

### Reason (理由)

An exact BPE count is impossible without the provider's vocabulary and merge
rules: `o200k_base` (~200k entries, ~3.6 MB) for OpenAI, `tokenizer.json` for
open-weight models.

### Assessment (点検)

- **License.** OpenAI publishes its encodings openly; Qwen2.5's `tokenizer.json`
  is Apache-2.0. Neither is a licensing obstacle.
- **Bundling cost.** ~3.6 MB (Qwen's file is larger) would be paid by every
  consumer of this package, including browser apps that never count OpenAI
  tokens, and would be committed into a repo that deliberately carries no
  vendored blobs.
- **Freshness.** A vocabulary is the provider's artifact and changes on the
  provider's schedule. Committed here it would go stale silently — the same
  failure mode as a stale price, and this mission has already been bitten by a
  5× stale price. Data with an owner elsewhere should be fetched from that owner.
- **Purity.** Fetching and caching means I/O, which would give this package a
  `vendors/` layer, a `node:`/`fetch` dependency, and a runtime it could no
  longer be neutral about.

### Decision and monitoring plan (決定と監視計画)

**The vocabulary is an input, never an asset of this package.** The caller loads
the bytes on its own terms (its own fetch, its own cache, its own refresh
policy); this package provides the pure parsers — `parseTiktokenVocabulary`,
`parseTokenizerJson` — and the counting loop.

Consequences, accepted and documented in the README rather than hidden:

- `countTokens` on an exact family requires a vocabulary the caller loaded.
- The committed test suite cannot run an exact count over the real vocabulary. It
  checks the merge loop against hand-built vocabularies, and checks the
  composition against the article's recorded content counts. The real-vocabulary
  check (all 30 samples reproduced exactly) is run out of band; the research
  topic's trial re-runs the equivalent against live APIs.

This also keeps the package I/O-free: no `vendors/` directory, no `node:` import,
and it runs unchanged in Node, a browser, or a Worker. The monorepo's
`gate-vendor-boundary.sh` enforces the absence mechanically, and this package
passes **unexempted**.

`parseTokenizerJson` reads the merge list **and the file's own pre-tokenizer
pattern and normalizer flag** from the file, rather than assuming them: the
pattern is part of the instrument, and counting with the wrong one miscounts even
with the right vocabulary.

### Exit strategy (撤退戦略)

If bundling ever becomes preferable (a fixed, small vocabulary; a consumer that
cannot do I/O), a vocabulary asset can be added as a separate optional package —
`plgg-token-metering-vocab-o200k` — that resolves to the same `BpeVocabulary`
value. The counting API does not change, because it already takes the vocabulary
as data. Scope: one new package; this one is untouched. Effort: person-days.

---

## What stays in-house (no vendor)

- **BPE inference** — the merge loop for both published formats
  (`src/domain/usecase/bpe.ts`).
- **Pre-tokenization patterns** — o200k_base's published pattern (with its
  case-folding contraction group expanded so the counter runs on Node 22 LTS
  rather than demanding Node 23's inline-modifier regex syntax) and GPT-2's
  (`src/domain/usecase/pretokenize.ts`).
- **Vocabulary parsers** for `.tiktoken` and `tokenizer.json`
  (`src/domain/usecase/parseVocabulary.ts`).
- **The calibrated estimator** and its fitted constants, transcribed from the
  published run (`src/domain/usecase/measured.ts`).
- **Cost decomposition** and the price table with its provenance.

## Related

- `plgg-bundle/DEPENDENCY-LOG.md` — the native-binding failure this decision
  declines to repeat.
- `.workaholic/constraints/architecture.md` — the vendor-boundary constraint and
  the gate that enforces it.
- `docs/research-reports/token-metering-comparison` (qmu/research) — the
  measurement, including its own tokenizer dependency decision, which this log
  carries into the implementation.
