import { none, some } from "plgg";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import {
  ModelPrices,
  PriceProvenance,
  modelPrices,
} from "plgg-token-metering/domain/model/ModelPrices";
import { countOf } from "plgg-token-metering/domain/model/TokenCount";
import { modelId } from "plgg-token-metering/domain/model/ModelId";
import { perMTok } from "plgg-token-metering/domain/model/Usd";

/**
 * The measured data, transcribed from ONE published run.
 *
 * Source: docs/research-reports/token-metering-comparison (qmu/research),
 * generated 2026-07-17T03:02:34.699Z, sample manifest tm-v1,
 * accuracy target ±5%. Published in research PR #52,
 * merged 2026-07-17.
 *
 * Every number below — the fitted overheads, the per-class
 * tokens-per-character rates, and the per-class signed error bands — is copied
 * from that run's data.json at full precision. Nothing here is estimated,
 * re-derived, rounded for presentation, or carried over from an earlier run.
 * `measured.spec.ts` re-asserts each value against the article's published
 * table, so a transcription slip fails the build rather than shipping a
 * plausible wrong constant.
 *
 * TWO OF THE FOUR FAMILIES MISS THE ±5% TARGET, and this file records that
 * rather than smoothing it over: Claude (8.54% mean / 16.24% max) and Gemini
 * (6.60% / 15.73%) are calibrated estimators because their tokenizers are
 * unpublished, and their bands say so. OpenAI and Qwen measured 0.00%.
 *
 * To refresh: re-run the research topic (`npm run research -- token-metering
 * --real` in qmu/research), then re-transcribe from the new data.json and move
 * the dates. A calibration is only as current as the tokenizer it was fitted
 * against, and a tokenizer changes on the provider's schedule, not ours.
 */

/**
 * Anthropic Claude — calibrated-estimator, measured against
 * `claude-sonnet-5`. Holdout: 8.54% mean / 16.24% max absolute
 * error — NOT within the ±5% target.
 */
const anthropicClaudeCard: ModelCard = {
  family: "anthropic-claude",
  familyName: "Anthropic Claude",
  model: modelId("claude-sonnet-5"),
  countingMethod: "calibrated-estimator",
  vocabularyNote:
    "Tokenizer unpublished for current models (the archived @anthropic-ai/tokenizer covers legacy Claude 2 only), so no exact self-count exists; the self-count is a calibrated estimator against the unbilled count_tokens endpoint.",
  source:
    "https://platform.claude.com/docs/en/build-with-claude/token-counting",
  lastVerified: "2026-07-17",
  measuredAt: "2026-07-17T03:02:34.699Z",
  samplesVersion: "tm-v1",
  report:
    "docs/research-reports/token-metering-comparison (qmu/research), run 2026-07-17T03:02:34.699Z",
  calibration: {
    overheadTokens: countOf(4),
    tokensPerChar: {
      english: 0.32392085226522954,
      japanese: 0.9790383333261218,
      code: 0.4712033012593608,
    },
    bands: {
      english: {
        minPct: -10.74,
        maxPct: 15.56,
      },
      japanese: {
        minPct: -11.11,
        maxPct: 12.88,
      },
      code: {
        minPct: -7.8,
        maxPct: 16.24,
      },
    },
    meanAbsErrorPct: 8.54,
    maxAbsErrorPct: 16.24,
    withinTargetPct: false,
  },
};

/**
 * OpenAI GPT — exact-bpe, measured against
 * `gpt-5.5`. Holdout: 0% mean / 0% max absolute
 * error — within the ±5% target.
 */
const openaiGptCard: ModelCard = {
  family: "openai-gpt",
  familyName: "OpenAI GPT",
  model: modelId("gpt-5.5"),
  countingMethod: "exact-bpe",
  vocabularyNote:
    "OpenAI publishes its encodings' vocabulary as ranked byte sequences (o200k_base, ~200k entries) plus the pre-tokenization pattern; there is no count-tokens endpoint, so the ground truth is usage.prompt_tokens from a minimal billed completion.",
  source:
    "https://developers.openai.com/api/docs/pricing",
  lastVerified: "2026-07-17",
  measuredAt: "2026-07-17T03:02:34.699Z",
  samplesVersion: "tm-v1",
  report:
    "docs/research-reports/token-metering-comparison (qmu/research), run 2026-07-17T03:02:34.699Z",
  calibration: {
    overheadTokens: countOf(6),
    tokensPerChar: {
      english: 0.19161676646706588,
      japanese: 0.8333333333333334,
      code: 0.2749003984063745,
    },
    bands: {
      english: {
        minPct: 0,
        maxPct: 0,
      },
      japanese: {
        minPct: 0,
        maxPct: 0,
      },
      code: {
        minPct: 0,
        maxPct: 0,
      },
    },
    meanAbsErrorPct: 0,
    maxAbsErrorPct: 0,
    withinTargetPct: true,
  },
};

/**
 * Google Gemini — calibrated-estimator, measured against
 * `gemini-3.1-pro-preview`. Holdout: 6.6% mean / 15.73% max absolute
 * error — NOT within the ±5% target.
 */
const googleGeminiCard: ModelCard = {
  family: "google-gemini",
  familyName: "Google Gemini",
  model: modelId("gemini-3.1-pro-preview"),
  countingMethod: "calibrated-estimator",
  vocabularyNote:
    "SentencePiece lineage; Google publishes the Gemma tokenizer model but not the current Gemini API tokenizer, so the self-count is a calibrated estimator against the unbilled countTokens endpoint.",
  source:
    "https://ai.google.dev/gemini-api/docs/tokens",
  lastVerified: "2026-07-17",
  measuredAt: "2026-07-17T03:02:34.699Z",
  samplesVersion: "tm-v1",
  report:
    "docs/research-reports/token-metering-comparison (qmu/research), run 2026-07-17T03:02:34.699Z",
  calibration: {
    overheadTokens: countOf(7),
    tokensPerChar: {
      english: 0.1782479475172736,
      japanese: 0.5019066756568975,
      code: 0.3099972358300412,
    },
    bands: {
      english: {
        minPct: -11.11,
        maxPct: 8.89,
      },
      japanese: {
        minPct: -15.73,
        maxPct: 10.96,
      },
      code: {
        minPct: -8.33,
        maxPct: 5.88,
      },
    },
    meanAbsErrorPct: 6.6,
    maxAbsErrorPct: 15.73,
    withinTargetPct: false,
  },
};

/**
 * OSS / local (Qwen2.5) — exact-bpe, measured against
 * `@cf/qwen/qwen2.5-coder-32b-instruct`. Holdout: 0% mean / 0% max absolute
 * error — within the ±5% target.
 */
const ossQwenCard: ModelCard = {
  family: "oss-qwen",
  familyName: "OSS / local (Qwen2.5)",
  model: modelId(
    "@cf/qwen/qwen2.5-coder-32b-instruct",
  ),
  countingMethod: "exact-bpe",
  vocabularyNote:
    "Open-weight models ship tokenizer.json (vocabulary + ordered merge list + pre-tokenizer pattern, Apache-2.0 for Qwen2.5), so an exact self-count exists; the ground truth is usage.prompt_tokens reported by a hosted serving stack (Cloudflare Workers AI).",
  source:
    "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct",
  lastVerified: "2026-07-17",
  measuredAt: "2026-07-17T03:02:34.699Z",
  samplesVersion: "tm-v1",
  report:
    "docs/research-reports/token-metering-comparison (qmu/research), run 2026-07-17T03:02:34.699Z",
  calibration: {
    overheadTokens: countOf(29),
    tokensPerChar: {
      english: 0.19161676646706588,
      japanese: 0.7,
      code: 0.2775330396475771,
    },
    bands: {
      english: {
        minPct: 0,
        maxPct: 0,
      },
      japanese: {
        minPct: 0,
        maxPct: 0,
      },
      code: {
        minPct: 0,
        maxPct: 0,
      },
    },
    meanAbsErrorPct: 0,
    maxAbsErrorPct: 0,
    withinTargetPct: true,
  },
};

/**
 * The four measured cards, one per provider family.
 */
export const CARDS: ReadonlyArray<ModelCard> = [
  anthropicClaudeCard,
  openaiGptCard,
  googleGeminiCard,
  ossQwenCard,
];

/**
 * The catalog these rates were read from, and when. Required on every entry:
 * a rate whose origin is unrecorded cannot be re-checked when it goes stale.
 */
const CATALOG_PROVENANCE: PriceProvenance = {
  source:
    "docs/research-reports/foundation-models (qmu/research), §7 per-model catalog table",
  retrievedAt: "2026-07-17",
  note: "The catalog publishes input and output rates only; it publishes no prompt-cache rates, so the cache buckets are none() rather than a substituted rate.",
};

/**
 * Qwen is absent from the catalog entirely, so its input rate comes from the
 * token-metering run's own family card, where it accounted probe spend.
 */
const RUN_CARD_PROVENANCE: PriceProvenance = {
  source:
    "docs/research-reports/token-metering-comparison.data.json (qmu/research), family card oss-qwen",
  retrievedAt: "2026-07-17",
  note: "Not listed in the foundation-models catalog; the input rate is the token-metering run's own family card. No output or cache rate is published for this model, so those buckets are none().",
};

const anthropicClaudePrices: ModelPrices =
  modelPrices({
    model: modelId("claude-sonnet-5"),
    inputPerMTok: perMTok(3),
    outputPerMTok: some(perMTok(15)),
    provenance: CATALOG_PROVENANCE,
  });

const openaiGptPrices: ModelPrices = modelPrices({
  model: modelId("gpt-5.5"),
  inputPerMTok: perMTok(5),
  outputPerMTok: some(perMTok(30)),
  provenance: CATALOG_PROVENANCE,
});

const googleGeminiPrices: ModelPrices =
  modelPrices({
    model: modelId("gemini-3.1-pro-preview"),
    inputPerMTok: perMTok(2),
    outputPerMTok: some(perMTok(12)),
    provenance: CATALOG_PROVENANCE,
  });

const ossQwenPrices: ModelPrices = modelPrices({
  model: modelId(
    "@cf/qwen/qwen2.5-coder-32b-instruct",
  ),
  inputPerMTok: perMTok(0.66),
  outputPerMTok: none(),
  provenance: RUN_CARD_PROVENANCE,
});

/**
 * The price table.
 *
 * Input and output rates only. No entry carries a cache rate, because no source
 * this package draws on publishes one — see `ModelPrices`. The Qwen entry
 * carries no output rate for the same reason: it is absent from the catalog
 * entirely.
 *
 * A price table is perishable. The 2026-07-17 recency repair on the source
 * registry caught a GPT-5.5 input rate that was 5× stale ($25 against a
 * published $5); the value below is the corrected $5. Re-read the source before
 * trusting any of these for billing, and treat retrievedAt as the expiry clock
 * it is.
 */
export const PRICES: ReadonlyArray<ModelPrices> =
  [
    anthropicClaudePrices,
    openaiGptPrices,
    googleGeminiPrices,
    ossQwenPrices,
  ];
