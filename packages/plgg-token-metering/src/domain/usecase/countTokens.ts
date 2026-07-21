import {
  Result,
  match,
  mapResult,
  pipe,
} from "plgg";
import {
  TokenCounter,
  ExactBpeCounter,
  EstimatorCounter,
  exactBpeCounter$,
  estimatorCounter$,
} from "plgg-token-metering/domain/model/TokenCounter";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import { TextClass } from "plgg-token-metering/domain/model/TextClass";
import {
  TokenEstimate,
  exactTokenCount,
  estimatedTokenCount,
} from "plgg-token-metering/domain/model/TokenEstimate";
import {
  countOf,
  tokenCountValue,
} from "plgg-token-metering/domain/model/TokenCount";
import {
  AccuracyEvidence,
  accuracyEvidence,
} from "plgg-token-metering/domain/model/Accuracy";
import {
  bandFor,
  rateFor,
} from "plgg-token-metering/domain/model/Calibration";
import { MeteringError } from "plgg-token-metering/domain/model/MeteringError";
import { countContentTokens } from "plgg-token-metering/domain/usecase/bpe";

/**
 * The text to count, and the class it belongs to.
 *
 * The class is required. Every number this package reports is conditioned on
 * it — the estimator's rate is per class and BOTH methods' error bands are per
 * class — and classifying text was not part of the measured instrument. Asking
 * the caller (who knows what it is sending) keeps an unmeasured guess out of a
 * measured number. See `TextClass`.
 */
export type CountInput = Readonly<{
  text: string;
  textClass: TextClass;
}>;

const evidenceFor = (
  card: ModelCard,
  textClass: TextClass,
): Result<AccuracyEvidence, MeteringError> =>
  accuracyEvidence({
    band: bandFor(textClass)(card.calibration),
    meanAbsErrorPct:
      card.calibration.meanAbsErrorPct,
    maxAbsErrorPct:
      card.calibration.maxAbsErrorPct,
    withinTargetPct:
      card.calibration.withinTargetPct,
    samplesVersion: card.samplesVersion,
    measuredAt: card.measuredAt,
    source: card.report,
  });

const countExact = (
  counter: ExactBpeCounter,
  input: CountInput,
): Result<TokenEstimate, MeteringError> => {
  const card = counter.content.card;
  const content = countContentTokens(
    counter.content.vocabulary,
    input.text,
  );
  const overhead = tokenCountValue(
    card.calibration.overheadTokens,
  );
  return pipe(
    evidenceFor(card, input.textClass),
    mapResult(
      (
        accuracy: AccuracyEvidence,
      ): TokenEstimate =>
        exactTokenCount({
          tokens: countOf(content + overhead),
          contentTokens: countOf(content),
          overheadTokens:
            card.calibration.overheadTokens,
          textClass: input.textClass,
          accuracy,
        }),
    ),
  );
};

const countEstimated = (
  counter: EstimatorCounter,
  input: CountInput,
): Result<TokenEstimate, MeteringError> => {
  const card = counter.content.card;
  // The fitted affine model, exactly as the article states it:
  //   predicted = round(tokensPerChar[class] × chars) + overhead
  // `chars` is UTF-16 code units (JavaScript's own string length), which is
  // what the measuring run fitted against — not codepoints and not UTF-8 bytes.
  const predicted =
    Math.round(
      rateFor(input.textClass)(card.calibration) *
        input.text.length,
    ) +
    tokenCountValue(
      card.calibration.overheadTokens,
    );
  return pipe(
    evidenceFor(card, input.textClass),
    mapResult(
      (
        accuracy: AccuracyEvidence,
      ): TokenEstimate =>
        estimatedTokenCount({
          tokens: countOf(predicted),
          textClass: input.textClass,
          accuracy,
        }),
    ),
  );
};

/**
 * Counts the input tokens a request will be billed for, without the provider's
 * tokenizer library.
 *
 * Returns a {@link TokenEstimate} — a sum type, so the caller must fold apart
 * the exact-BPE count and the calibrated estimate rather than reading a bare
 * number that means different things for different models. Every result carries
 * the {@link AccuracyEvidence} for the class it counted: the measured band, the
 * family's holdout error, whether it met the ±5% target, and the report to
 * check it against.
 *
 * Accuracy, from the measured run of 2026-07-17 (holdout half of `tm-v1`):
 *
 * | Family                | Method               | Mean  | Max    | ±5%? |
 * | --------------------- | -------------------- | ----- | ------ | ---- |
 * | OpenAI GPT            | exact self-BPE       | 0.00% | 0.00%  | yes  |
 * | OSS / local (Qwen2.5) | exact self-BPE       | 0.00% | 0.00%  | yes  |
 * | Anthropic Claude      | calibrated estimator | 8.54% | 16.24% | NO   |
 * | Google Gemini         | calibrated estimator | 6.60% | 15.73% | NO   |
 *
 * Claude and Gemini do NOT meet the target and are not claimed to: their
 * tokenizers are unpublished, so the count is an estimate with a stated band.
 * Use `tokenBounds` for the interval and price it with `projectCost`, never as
 * a billing figure. Source: docs/research-reports/token-metering-comparison.
 */
export const countTokens =
  (input: CountInput) =>
  (
    counter: TokenCounter,
  ): Result<TokenEstimate, MeteringError> =>
    match(counter)(
      [
        exactBpeCounter$(),
        (
          value: ExactBpeCounter,
        ): Result<TokenEstimate, MeteringError> =>
          countExact(value, input),
      ],
      [
        estimatorCounter$(),
        (
          value: EstimatorCounter,
        ): Result<TokenEstimate, MeteringError> =>
          countEstimated(value, input),
      ],
    );
