import {
  Result,
  ok,
  err,
  invalidError,
  mapResult,
  chainResult,
  pipe,
} from "plgg";
import { ModelPrices } from "plgg-token-metering/domain/model/ModelPrices";
import {
  TokenUsage,
  tokenUsage,
} from "plgg-token-metering/domain/model/TokenUsage";
import {
  CostBreakdown,
  CostProjection,
} from "plgg-token-metering/domain/model/Cost";
import {
  TokenCount,
  tokenCountValue,
  zeroTokens,
} from "plgg-token-metering/domain/model/TokenCount";
import {
  TokenEstimate,
  estimateAccuracy,
  estimateTokens,
  isExactTokenCount,
  tokenBounds,
} from "plgg-token-metering/domain/model/TokenEstimate";
import { MeteringError } from "plgg-token-metering/domain/model/MeteringError";
import { estimateCost } from "plgg-token-metering/domain/usecase/estimateCost";

/**
 * What the caller knows about output length BEFORE the run.
 *
 * Output tokens cannot be counted ahead of a call — the model decides when to
 * stop — so only bounds exist. Both fields come from the caller because neither
 * is derivable here: `ceiling` is the request's own max-tokens cap (the hard
 * limit the provider enforces) and `expected` is a historical output/input
 * ratio for the caller's workload. This package will not invent a ratio; the
 * research article measured input counting, not output length.
 */
export type OutputBound = Readonly<{
  expected: TokenCount;
  ceiling: TokenCount;
}>;

/**
 * Constructs an {@link OutputBound}, rejecting an expectation above the
 * ceiling — the provider stops generating at the cap, so expecting more is a
 * contradiction rather than a pessimistic guess.
 */
export const outputBound = ({
  expected,
  ceiling,
}: {
  expected: TokenCount;
  ceiling: TokenCount;
}): Result<OutputBound, MeteringError> =>
  tokenCountValue(expected) >
  tokenCountValue(ceiling)
    ? err(
        invalidError({
          message:
            "OutputBound expected exceeds ceiling: the provider stops generating at the max-tokens cap",
        }),
      )
    : ok({ expected, ceiling });

/**
 * A projection with no output at all — an embedding call, or a caller that
 * only wants the input side of the bill.
 */
export const noOutput: OutputBound = {
  expected: zeroTokens,
  ceiling: zeroTokens,
};

const usageAt = (
  input: TokenCount,
  output: TokenCount,
): TokenUsage =>
  tokenUsage({
    inputTokens: input,
    outputTokens: output,
  });

/**
 * Projects a pre-run cost interval for an input count and an output bound.
 *
 * The three corners, and why:
 *
 * - `low`: the input band's lower bound with ZERO output — the model may emit a
 *   stop token immediately, so no positive output floor is honest.
 * - `point`: the point count with the caller's expected output.
 * - `high`: the input band's upper bound with the max-tokens ceiling.
 *
 * The input bounds come from inverting the measured error band (`tokenBounds`).
 * For an exact-BPE family that band is [0, 0], so `low` and `high` differ from
 * `point` only in output; for Claude and Gemini the band is wide (up to 16.24%
 * and 15.73% max holdout error) and the interval is correspondingly wide. That
 * width is the point: it is what the measurement actually found.
 *
 * A {@link CostProjection} has no single amount to read off, deliberately. It
 * is for quota admission and budget headroom. What gets billed is
 * `estimateCost` over the response's reported usage.
 */
export const projectCost =
  (input: TokenEstimate, output: OutputBound) =>
  (
    prices: ModelPrices,
  ): Result<CostProjection, MeteringError> => {
    const bounds = tokenBounds(input);
    return pipe(
      estimateCost(
        usageAt(bounds.lower, zeroTokens),
      )(prices),
      chainResult((low: CostBreakdown) =>
        pipe(
          estimateCost(
            usageAt(
              estimateTokens(input),
              output.expected,
            ),
          )(prices),
          chainResult((point: CostBreakdown) =>
            pipe(
              estimateCost(
                usageAt(
                  bounds.upper,
                  output.ceiling,
                ),
              )(prices),
              mapResult(
                (
                  high: CostBreakdown,
                ): CostProjection => ({
                  low,
                  point,
                  high,
                  basis: {
                    countingMethod:
                      isExactTokenCount(input)
                        ? "exact-bpe"
                        : "calibrated-estimator",
                    accuracySource:
                      estimateAccuracy(input)
                        .source,
                    outputCeilingNote:
                      "high uses the request's max-tokens cap; low assumes the model stops immediately",
                  },
                }),
              ),
            ),
          ),
        ),
      ),
    );
  };
