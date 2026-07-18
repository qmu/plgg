# plgg-token-metering

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**Counts the input tokens an LLM API will bill for, without the provider's
tokenizer library, and prices them.** Byte-pair encoding is implemented here
against the vocabularies providers publish; where a provider publishes no
tokenizer, the count is a calibrated estimate that carries its measured error
band. Built on [plgg](../plgg/); its only runtime dependency is `plgg`.

Every number below comes from one real measured run, published as
`docs/research-reports/token-metering-comparison` in
[qmu/research](https://github.com/qmu/research) (run
`2026-07-17T03:02:34.699Z`, sample manifest `tm-v1`). The tests re-check this
package against that run's recorded counts, with no API key and no network.

> **UNSTABLE / EXPERIMENTAL POC.** The public surface may still change. plgg
> discipline is non-negotiable: dogfood plgg types/combinators, errors as
> values, expression-only bodies, no `as`/`any`/`@ts-ignore`.

## Accuracy — read this before using a number

The agreed target was |error| ≤ 5% against each provider's API-reported count.
**It is met for two of the four families and missed for two.** Holdout half of
`tm-v1` (15 samples: 5 english, 5 japanese, 5 code):

| Family | Self-count method | Mean abs error | Max abs error | ±5% target |
| --- | --- | --- | --- | --- |
| OpenAI GPT (`gpt-5.5`) | exact self-BPE | **0.00%** | **0.00%** | met |
| OSS / local (`@cf/qwen/qwen2.5-coder-32b-instruct`) | exact self-BPE | **0.00%** | **0.00%** | met |
| Anthropic Claude (`claude-sonnet-5`) | calibrated estimator | **8.54%** | **16.24%** | **NOT met** |
| Google Gemini (`gemini-3.1-pro-preview`) | calibrated estimator | **6.60%** | **15.73%** | **NOT met** |

Claude and Gemini miss the target because **their tokenizers are not
published**: no exact self-count exists, so the count is a statistical estimate
fitted against each provider's own (unbilled) token-counting endpoint. That is a
property of what the providers publish, not a defect this package can fix by
trying harder.

Per-class signed error bands, as measured:

| Family | english | japanese | code |
| --- | --- | --- | --- |
| Anthropic Claude | [-10.74%, +15.56%] | [-11.11%, +12.88%] | [-7.80%, +16.24%] |
| Google Gemini | [-11.11%, +8.89%] | [-15.73%, +10.96%] | [-8.33%, +5.88%] |
| OpenAI GPT | [0, 0] | [0, 0] | [0, 0] |
| OSS / local (Qwen2.5) | [0, 0] | [0, 0] | [0, 0] |

A band is the range of errors **actually observed** on a 5-row holdout per
class. It is evidence of the error seen, not a guaranteed bound on error never
seen. `tokenBounds` inverts a band into an interval and widens the endpoints
outward rather than inward.

Source for every figure above: `docs/research-reports/token-metering-comparison`
(qmu/research), §4 and §7. The same numbers are asserted against this package in
`src/domain/usecase/accuracy.spec.ts` and `src/domain/usecase/registry.spec.ts`.

### What "exact" means, precisely

For OpenAI and Qwen the **content** tokens are reproduced exactly by the BPE
implemented here, from the published vocabulary. The **total** a provider
reports also includes message-framing overhead (chat template, role headers),
which no provider documents; the measurement fitted it as a constant (6 tokens
for `gpt-5.5`, 29 for the Workers AI Qwen model). So an "exact" count is
`exactContent + fittedOverhead`, which measured 0.00% error across `tm-v1` — an
extremely good result on the measured request shape, not an identity. The fitted
overhead assumes the **single-user-message** request shape the run used; a system
prompt, multi-turn history, or tool definitions carry framing this constant does
not model.

Verified out of band during development: given the real 3.6 MB `o200k_base`
vocabulary, this package reproduces all 30 recorded content counts **and** all 30
API totals exactly. That check needs the vocabulary download, so it is not part
of the committed suite; `accuracy.spec.ts` checks the same composition against
the article's recorded content counts, and `bpe.spec.ts` checks the merge loop
against hand-built vocabularies.

## Scope

**In scope:** counting tokens, and pricing counted usage.

**Out of scope — the consumer's responsibility:**

- **Per-principal aggregation and storage.** This package holds no principal
  concept and writes nothing. `estimateCost` is a pure `usage -> money`
  function. The consuming design (a usage record per principal, its retention
  and anonymization semantics, OpenMetrics export) is described in the research
  article's implementation-policy chapter.
- **Invoice reconciliation.** Rounding, minimums, tier discounts and credits are
  not modelled. Amounts are unrounded — a single request's cost is routinely a
  fraction of a cent, so rounding here would quantize most values to zero.
- **Output-length prediction.** Output tokens cannot be counted before a run.
  `projectCost` takes the caller's own expectation and max-tokens ceiling; it
  invents no ratio.

**Only four models are covered** — one per family, exactly those the run
measured. A sibling model is **not** covered by its family's calibration: it may
use a different tokenizer and must be re-validated first. `cardFor(modelId(
"claude-opus-4-8"))` returns `UnknownModelError` on purpose.

Content classes are `english`, `japanese`, and `code`. Other content (base64
blobs, dense Unicode art, mixed prose-and-code) is **unvalidated** — the bands do
not describe it.

## Install

```sh
npm install plgg-token-metering
```

## Counting

The text's **class is a required input**. Every number this package reports is
conditioned on it (the estimator's rate is per class, and both methods' error
bands are per class), and classifying text automatically was not part of the
measured instrument. A built-in classifier would fold an unmeasured guess into a
number that carries a measured band, so the caller — which knows what it is
sending — declares it.

### Calibrated estimator (Claude, Gemini)

```ts
import { pipe, chainResult } from "plgg";
import {
  cardFor, modelId, estimatorCounter, countTokens,
  ModelCard, TokenCounter,
} from "plgg-token-metering";

const counted = pipe(
  cardFor(modelId("claude-sonnet-5")),
  chainResult((card: ModelCard) => estimatorCounter({ card })),
  chainResult((counter: TokenCounter) =>
    countTokens({ text: "…", textClass: "japanese" })(counter),
  ),
);
// counted: Result<TokenEstimate, MeteringError> — nothing throws.
```

Every step returns a `Result`, so the chain is one `pipe` and the failure is
folded once at the end. `example.ts` in this package is the same code, compiled
and runnable (`npx tsx example.ts`).

### Exact BPE (OpenAI, OSS)

The vocabulary is **supplied by the caller** — this package does no I/O and
bundles no vocabulary (see [DEPENDENCY-LOG.md](DEPENDENCY-LOG.md)). Fetch and
cache it however your app prefers, then parse it here:

```ts
import {
  parseTiktokenVocabulary, O200K_PRETOKEN_PATTERN,
  cardFor, modelId, exactBpeCounter, countTokens,
} from "plgg-token-metering";

// Your app fetches and caches this ~3.6 MB file:
//   https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken
const vocabulary = parseTiktokenVocabulary(fileText, O200K_PRETOKEN_PATTERN);
```

For an open-weight model, pass the already-decoded `tokenizer.json` to
`parseTokenizerJson`; it reads the merge list and the file's own pre-tokenizer
pattern, so the counter follows the model's published rules rather than this
package's assumptions.

### The result is a sum type, on purpose

`countTokens` returns a `TokenEstimate`, which is either an `ExactTokenCount` or
an `EstimatedTokenCount`. It is not one record with a `method` field: a caller
must fold the two apart with `match` rather than read a bare `.tokens` that means
different things for different models. Every result carries its
`AccuracyEvidence` — the class's band, the family's holdout error,
`withinTargetPct`, and the report to check it against. An accuracy claim cannot
travel without its source, because the source is in the type.

## Pricing

```ts
import { pipe, chainResult } from "plgg";
import {
  pricesFor, modelId, estimateCost, tokenUsage, countOf, ModelPrices,
} from "plgg-token-metering";

const cost = pipe(
  pricesFor(modelId("gpt-5.5")),
  chainResult((prices: ModelPrices) =>
    estimateCost(
      tokenUsage({
        inputTokens: countOf(1_200),
        outputTokens: countOf(350),
      }),
    )(prices),
  ),
);
// On Ok: input $0.006, output $0.0105, total $0.0165 — plus cacheWrite,
// cacheRead, and `prices`, the provenance of the rates used.
```

`estimateCost` keeps the breakdown because the four buckets bill at four rates
and a single total cannot be decomposed back into them.

**A missing rate is an error, never a substituted one.** A rate is required only
for a bucket that was actually used (zero tokens cost zero), but a non-zero
bucket with no published rate returns `MissingPriceError` rather than borrowing
another bucket's rate.

### Price table and its provenance

| Model | Input $/MTok | Output $/MTok | Cache | Source |
| --- | --- | --- | --- | --- |
| `claude-sonnet-5` | 3.00 | 15.00 | none | foundation-models catalog, read 2026-07-17 |
| `gpt-5.5` | 5.00 | 30.00 | none | foundation-models catalog, read 2026-07-17 |
| `gemini-3.1-pro-preview` | 2.00 | 12.00 | none | foundation-models catalog, read 2026-07-17 |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | 0.66 | **none** | none | token-metering run's own family card, read 2026-07-17 |

Two absences are real and deliberate:

- **No cache rates, for any model.** The catalog publishes input and output rates
  only. The research article records that cache writes bill *above* the base
  input rate and cache reads at a *fraction* of it, and that each provider
  publishes its own multipliers — but it carries no multipliers, so this package
  has no measured value to hold. Supply your own `ModelPrices` (with its own
  provenance) to price cache buckets; the machinery is wired and tested.
- **No Qwen output rate.** That model is absent from the catalog entirely.

**A price table is perishable.** On 2026-07-17 a recency check on the source
registry caught a GPT-5.5 input price that was **5× stale** ($25 against a
published $5); the $5 above is the corrected value. `PriceProvenance` is required
on every entry precisely so a rate can be re-checked against where it came from.

**To refresh:** re-read
`docs/research-reports/foundation-models` (§7 per-model catalog table) in
qmu/research and update `src/domain/usecase/measured.ts` with the new rates and a
new `retrievedAt`. To refresh the *calibrations*, re-run the research topic
(`npm run research -- token-metering --real`) and re-transcribe from the new
`data.json`. `registry.spec.ts` asserts the transcription against the article
fixture, so a slip fails the build.

## Pre-run projection

```ts
import { projectCost, outputBound, countOf } from "plgg-token-metering";
```

`projectCost` returns a `CostProjection` — `low`, `point`, `high` — and
deliberately offers **no single amount to read off**:

- `low`: the count band's lower bound, and zero output (the model may stop
  immediately).
- `point`: the point count, and your expected output.
- `high`: the count band's upper bound, and the request's max-tokens ceiling.

A projection is for quota admission and budget headroom. **What gets billed is
`estimateCost` over the response's reported usage**, which is exact.

## Edge cases

- **Japanese** tokenizes at several times English's per-character rate
  (Claude: 0.979 vs 0.324 tokens/char). Projecting Japanese at English rates
  underestimates it; declaring the class is the correction.
- **Output tokens** — see *Pre-run projection*. Store the post-run account; use
  the pre-run bound only for admission, never for billing.
- **Cache and tool use.** Cache buckets are modelled and priced when you supply
  rates. **Tool definitions are not a bucket**: providers serialize them into the
  prompt and bill them as ordinary input tokens, so count them as input text.
  (The article's single probe read 483 tokens for one tool definition on
  Anthropic's endpoint. That is one reading of one unspecified tool definition,
  not a general constant, so this package does not carry it.)
- **Images.** `anthropicImageContentTokens` implements Anthropic's published
  `width × height / 750`; the article's 300×300 probe read 124, and 120 content +
  4 fitted overhead reproduces it exactly. Anthropic's automatic downscale cap is
  **not modelled** (the article records no threshold), so counts for large images
  over-report. **Google and OpenAI image conversions are deliberately absent**:
  Google's documented flat 258/image contradicts the article's own probe of the
  same PNG (which read **1089**, a 4.2× disagreement the article records without
  resolving), and OpenAI's base-plus-tiles schedule is named but its constants
  are not recorded. Read those from the response usage field instead.

## Vendor neutrality

Independence from existing tokenizer libraries is this package's reason to
exist. Its runtime dependencies are `plgg` and nothing else — no `tiktoken`, no
`@anthropic-ai/tokenizer`, no SentencePiece binding, no native module. This is
mechanically checked: the monorepo's `scripts/gate-vendor-boundary.sh` fails on a
third-party import outside `vendors/`, and this package has no `vendors/`
directory at all because it does no I/O.

The four-point dependency judgment is in [DEPENDENCY-LOG.md](DEPENDENCY-LOG.md).

## Development

```sh
../../scripts/tsc-plgg-token-metering.sh    # type-check
../../scripts/test-plgg-token-metering.sh   # tests + coverage gate
```
