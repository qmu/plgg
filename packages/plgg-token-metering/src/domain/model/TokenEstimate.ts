import { defineVariant, match } from "plgg";
import {
  TokenCount,
  countOf,
  tokenCountValue,
} from "plgg-token-metering/domain/model/TokenCount";
import { TextClass } from "plgg-token-metering/domain/model/TextClass";
import {
  AccuracyEvidence,
  ErrorBand,
} from "plgg-token-metering/domain/model/Accuracy";

/**
 * A token count produced from a published vocabulary: the content tokens are
 * reproduced exactly by the self-implemented BPE, and the message-framing
 * overhead is a fitted constant added on top.
 *
 * `tokens` is therefore still a PREDICTION of what the provider will report —
 * exact content plus fitted overhead — which measured 0.00% error on every
 * holdout class of `tm-v1`. It is not an identity.
 */
const Exact = defineVariant("ExactTokenCount")<{
  tokens: TokenCount;
  contentTokens: TokenCount;
  overheadTokens: TokenCount;
  textClass: TextClass;
  accuracy: AccuracyEvidence;
}>();

export type ExactTokenCount = ReturnType<
  typeof Exact.make
>;

/**
 * Constructs an {@link ExactTokenCount}.
 */
export const exactTokenCount = (content: {
  tokens: TokenCount;
  contentTokens: TokenCount;
  overheadTokens: TokenCount;
  textClass: TextClass;
  accuracy: AccuracyEvidence;
}): ExactTokenCount => Exact.make(content);

/**
 * A token count produced by a calibrated estimator, because the provider does
 * not publish its tokenizer. `tokens` is a point drawn from a per-class
 * characters-per-token rate; the truth lies somewhere in the band that
 * `accuracy` carries, and `tokenBounds` turns that band into an interval.
 *
 * Anthropic Claude and Google Gemini land here, and NEITHER meets the ±5%
 * target (8.54% / 6.60% mean, 16.24% / 15.73% max). Treating one of these as a
 * billing figure is a misuse the type is shaped to prevent.
 */
const Estimated = defineVariant(
  "EstimatedTokenCount",
)<{
  tokens: TokenCount;
  textClass: TextClass;
  accuracy: AccuracyEvidence;
}>();

export type EstimatedTokenCount = ReturnType<
  typeof Estimated.make
>;

/**
 * Constructs an {@link EstimatedTokenCount}.
 */
export const estimatedTokenCount = (content: {
  tokens: TokenCount;
  textClass: TextClass;
  accuracy: AccuracyEvidence;
}): EstimatedTokenCount =>
  Estimated.make(content);

/**
 * The result of counting: either an exact-BPE count or a calibrated estimate.
 *
 * A sum type rather than one record with a `method` field, because the caller
 * must not be able to read `.tokens` without having been made to notice which
 * of the two it holds. Folding with `match` over
 * {@link exactTokenCount$} / {@link estimatedTokenCount$} is the only way in.
 */
export type TokenEstimate =
  ExactTokenCount | EstimatedTokenCount;

/**
 * Pattern matcher for the {@link ExactTokenCount} variant.
 */
export const exactTokenCount$ = Exact.pattern;

/**
 * Pattern matcher for the {@link EstimatedTokenCount} variant.
 */
export const estimatedTokenCount$ =
  Estimated.pattern;

/**
 * Type guard for the {@link ExactTokenCount} variant.
 */
export const isExactTokenCount = (
  estimate: TokenEstimate,
): estimate is ExactTokenCount =>
  Exact.is(estimate);

/**
 * Type guard for the {@link EstimatedTokenCount} variant.
 */
export const isEstimatedTokenCount = (
  estimate: TokenEstimate,
): estimate is EstimatedTokenCount =>
  Estimated.is(estimate);

/**
 * The point count either variant carries.
 */
export const estimateTokens = (
  estimate: TokenEstimate,
): TokenCount =>
  match(estimate)(
    [
      exactTokenCount$(),
      (value: ExactTokenCount): TokenCount =>
        value.content.tokens,
    ],
    [
      estimatedTokenCount$(),
      (value: EstimatedTokenCount): TokenCount =>
        value.content.tokens,
    ],
  );

/**
 * The accuracy evidence either variant carries.
 */
export const estimateAccuracy = (
  estimate: TokenEstimate,
): AccuracyEvidence =>
  match(estimate)(
    [
      exactTokenCount$(),
      (
        value: ExactTokenCount,
      ): AccuracyEvidence =>
        value.content.accuracy,
    ],
    [
      estimatedTokenCount$(),
      (
        value: EstimatedTokenCount,
      ): AccuracyEvidence =>
        value.content.accuracy,
    ],
  );

/**
 * An inclusive interval of token counts.
 */
export type TokenRange = Readonly<{
  lower: TokenCount;
  upper: TokenCount;
}>;

/**
 * Inverts the error band into the interval the provider-reported count plausibly
 * lies in, given this prediction.
 *
 * The band is defined on the PREDICTION, not on the truth:
 *
 *   errorPct = 100 × (predicted − actual) / actual
 *
 * so `actual = predicted / (1 + errorPct/100)`, and the interval is obtained by
 * DIVIDING by the band's endpoints — not by multiplying `predicted` by
 * `(1 ± band)`, which is the intuitive-but-wrong inversion and skews both
 * endpoints the wrong way. The band's maximum (the biggest overshoot) yields the
 * LOWER bound on the actual count.
 *
 * Endpoints are widened outward (floor / ceil), never narrowed: a bound that
 * rounds inward would understate the very uncertainty it exists to report.
 */
export const tokenBounds = (
  estimate: TokenEstimate,
): TokenRange =>
  boundsOf(
    tokenCountValue(estimateTokens(estimate)),
    estimateAccuracy(estimate).band,
  );

const boundsOf = (
  predicted: number,
  band: ErrorBand,
): TokenRange => ({
  lower: countOf(
    Math.floor(
      predicted / (1 + band.maxPct / 100),
    ),
  ),
  upper: countOf(
    Math.ceil(
      predicted / (1 + band.minPct / 100),
    ),
  ),
});
