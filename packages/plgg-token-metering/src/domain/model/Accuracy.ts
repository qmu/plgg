import {
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
  isNum,
  isSoftStr,
  SoftStr,
} from "plgg";

/**
 * How a family's token count is produced.
 *
 * - `exact-bpe`: the provider publishes the vocabulary and merge rules, so a
 *   self-implemented byte-pair-encoding counter reproduces the content count.
 * - `calibrated-estimator`: the tokenizer is unpublished, so the count is a
 *   statistical estimate from per-class characters-per-token rates, and it
 *   carries an error band. Never false precision.
 *
 * This is the article's core distinction and it is a type here because the two
 * cannot be substituted for one another at a call site: see `TokenEstimate`,
 * whose two variants force the caller to fold them apart.
 */
export type CountingMethod =
  "exact-bpe" | "calibrated-estimator";

const qualifyMethod = (
  value: unknown,
): value is CountingMethod =>
  value === "exact-bpe" ||
  value === "calibrated-estimator";

/**
 * Type guard for {@link CountingMethod}.
 */
export const isCountingMethod = qualifyMethod;

/**
 * Casts an unknown value to a {@link CountingMethod}.
 */
export const asCountingMethod = (
  value: unknown,
): Result<CountingMethod, InvalidError> =>
  qualifyMethod(value)
    ? ok(value)
    : err(
        invalidError({
          message:
            "Value is not a CountingMethod (exact-bpe | calibrated-estimator)",
        }),
      );

/**
 * The signed holdout error band of a prediction, in percent.
 *
 * `minPct` and `maxPct` are the extremes of `100 × (predicted − apiReported) /
 * apiReported` observed over the measured holdout rows of one class. A positive
 * error means the self-count OVERSHOOTS what the provider reported.
 *
 * The band is measured, not assumed: it is the observed range on a 5-row
 * holdout per class, so it is evidence of the error seen, not a guaranteed
 * bound on error never seen. That distinction is stated in the README and is
 * why `tokenBounds` widens rather than narrows.
 */
export type ErrorBand = Readonly<{
  minPct: number;
  maxPct: number;
}>;

/**
 * Constructs an {@link ErrorBand}, rejecting an inverted band.
 */
export const errorBand = ({
  minPct,
  maxPct,
}: {
  minPct: number;
  maxPct: number;
}): Result<ErrorBand, InvalidError> =>
  !isNum(minPct) ||
  !isNum(maxPct) ||
  !Number.isFinite(minPct) ||
  !Number.isFinite(maxPct)
    ? err(
        invalidError({
          message:
            "ErrorBand bounds must be finite numbers",
        }),
      )
    : minPct > maxPct
      ? err(
          invalidError({
            message:
              "ErrorBand minPct must not exceed maxPct",
          }),
        )
      : // A rate below −100% would mean a negative predicted count.
        minPct <= -100
        ? err(
            invalidError({
              message:
                "ErrorBand minPct must exceed -100",
            }),
          )
        : ok({ minPct, maxPct });

/**
 * The exact band — `[0, 0]`. The two exact-BPE families measured 0.00% mean and
 * 0.00% max error on every holdout class, so their band is a point. This is a
 * MEASURED result on the pinned sample set, not a definition of exactness.
 */
export const exactBand: ErrorBand = {
  minPct: 0,
  maxPct: 0,
};

/**
 * The provenance of an accuracy claim: which measurement produced the band, on
 * which pinned sample set, when, and where to read it.
 *
 * Carried in the type — not only in the README — so an accuracy claim cannot
 * travel without its source. Every `TokenEstimate` this package returns holds
 * one, which is the `objective-documentation` policy applied to values rather
 * than prose.
 */
export type AccuracyEvidence = Readonly<{
  /** Signed holdout error band for the class this estimate used. */
  band: ErrorBand;
  /** Mean absolute holdout error for the family, percent. */
  meanAbsErrorPct: number;
  /** Max absolute holdout error for the family, percent. */
  maxAbsErrorPct: number;
  /** Whether the family met the ±5% target. False for Claude and Gemini. */
  withinTargetPct: boolean;
  /** The pinned sample manifest the band is stated over (`tm-v1`). */
  samplesVersion: SoftStr;
  /** ISO instant of the measuring run. */
  measuredAt: SoftStr;
  /** The published report the numbers come from. */
  source: SoftStr;
}>;

/**
 * Constructs an {@link AccuracyEvidence}.
 */
export const accuracyEvidence = ({
  band,
  meanAbsErrorPct,
  maxAbsErrorPct,
  withinTargetPct,
  samplesVersion,
  measuredAt,
  source,
}: {
  band: ErrorBand;
  meanAbsErrorPct: number;
  maxAbsErrorPct: number;
  withinTargetPct: boolean;
  samplesVersion: SoftStr;
  measuredAt: SoftStr;
  source: SoftStr;
}): Result<AccuracyEvidence, InvalidError> =>
  !isNum(meanAbsErrorPct) ||
  !isNum(maxAbsErrorPct) ||
  meanAbsErrorPct < 0 ||
  maxAbsErrorPct < 0
    ? err(
        invalidError({
          message:
            "AccuracyEvidence error percentages must be non-negative numbers",
        }),
      )
    : !isSoftStr(source) ||
        source.trim().length === 0
      ? err(
          invalidError({
            message:
              "AccuracyEvidence requires a source",
          }),
        )
      : ok({
          band,
          meanAbsErrorPct,
          maxAbsErrorPct,
          withinTargetPct,
          samplesVersion,
          measuredAt,
          source,
        });
