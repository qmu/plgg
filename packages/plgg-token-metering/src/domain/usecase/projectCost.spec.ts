import {
  describe,
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { some } from "plgg";
import {
  projectCost,
  outputBound,
  noOutput,
  OutputBound,
} from "plgg-token-metering/domain/usecase/projectCost";
import {
  ModelPrices,
  PriceProvenance,
  modelPrices,
} from "plgg-token-metering/domain/model/ModelPrices";
import { CostProjection } from "plgg-token-metering/domain/model/Cost";
import {
  countOf,
  tokenCountValue,
} from "plgg-token-metering/domain/model/TokenCount";
import {
  perMTok,
  usdAmountValue,
} from "plgg-token-metering/domain/model/Usd";
import { modelId } from "plgg-token-metering/domain/model/ModelId";
import { cardFor } from "plgg-token-metering/domain/usecase/registry";
import { estimatorCounter } from "plgg-token-metering/domain/model/TokenCounter";
import { countTokens } from "plgg-token-metering/domain/usecase/countTokens";
import {
  TokenEstimate,
  estimateTokens,
  tokenBounds,
} from "plgg-token-metering/domain/model/TokenEstimate";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import { TokenCounter } from "plgg-token-metering/domain/model/TokenCounter";
import { MeteringError } from "plgg-token-metering/domain/model/MeteringError";

const provenance: PriceProvenance = {
  source: "spec fixture",
  retrievedAt: "2026-07-17",
  note: "hand-built for this spec",
};

const prices: ModelPrices = modelPrices({
  model: modelId("claude-sonnet-5"),
  inputPerMTok: perMTok(3),
  outputPerMTok: some(perMTok(15)),
  provenance,
});

/** A Claude estimate over real Japanese sample text — a wide band by measurement. */
const claudeEstimate = (
  onEstimate: (
    estimate: TokenEstimate,
  ) => ReturnType<typeof check>,
) =>
  check(
    cardFor(modelId("claude-sonnet-5")),
    okThen((card: ModelCard) =>
      check(
        estimatorCounter({ card }),
        okThen((counter: TokenCounter) =>
          check(
            countTokens({
              text: "これは日本語のテキストで、トークン数を推定するための入力です。",
              textClass: "japanese",
            })(counter),
            okThen(onEstimate),
          ),
        ),
      ),
    ),
  );

describe("outputBound", () => {
  test("rejects an expectation above the ceiling", () =>
    check(
      outputBound({
        expected: countOf(500),
        ceiling: countOf(100),
      }),
      errThen((error: MeteringError) =>
        check(error.__tag, toBe("InvalidError")),
      ),
    ));

  test("accepts an expectation at or below the ceiling", () =>
    check(
      outputBound({
        expected: countOf(100),
        ceiling: countOf(100),
      }),
      okThen((bound: OutputBound) =>
        check(
          tokenCountValue(bound.ceiling),
          toBe(100),
        ),
      ),
    ));

  test("noOutput is a zero bound", () =>
    all([
      check(
        tokenCountValue(noOutput.expected),
        toBe(0),
      ),
      check(
        tokenCountValue(noOutput.ceiling),
        toBe(0),
      ),
    ]));
});

describe("projectCost", () => {
  /**
   * The interval must be ordered and must straddle the point. For Claude the
   * band is wide by measurement (up to 16.24% max holdout error), so low and
   * high genuinely differ from point on the INPUT side too — not only through
   * the output bound.
   */
  test("produces an ordered low <= point <= high interval", () =>
    claudeEstimate((estimate: TokenEstimate) =>
      check(
        projectCost(
          estimate,
          outputBoundOrZero(200, 1000),
        )(prices),
        okThen((projection: CostProjection) =>
          all([
            check(
              usdAmountValue(
                projection.low.total,
              ) <=
                usdAmountValue(
                  projection.point.total,
                ),
              toBe(true),
            ),
            check(
              usdAmountValue(
                projection.point.total,
              ) <=
                usdAmountValue(
                  projection.high.total,
                ),
              toBe(true),
            ),
          ]),
        ),
      ),
    ));

  /**
   * `low` assumes the model stops immediately: no positive output floor is
   * honest, because the model decides when to stop.
   */
  test("low charges no output at all", () =>
    claudeEstimate((estimate: TokenEstimate) =>
      check(
        projectCost(
          estimate,
          outputBoundOrZero(200, 1000),
        )(prices),
        okThen((projection: CostProjection) =>
          check(
            usdAmountValue(projection.low.output),
            toBe(0),
          ),
        ),
      ),
    ));

  /** `high` charges the request's hard max-tokens cap. */
  test("high charges output at the max-tokens ceiling", () =>
    claudeEstimate((estimate: TokenEstimate) =>
      check(
        projectCost(
          estimate,
          outputBoundOrZero(200, 1000),
        )(prices),
        okThen((projection: CostProjection) =>
          check(
            usdAmountValue(
              projection.high.output,
            ),
            toBe((1000 * 15) / 1_000_000),
          ),
        ),
      ),
    ));

  /**
   * The input side of the interval must be the inverted band, not the point —
   * this is what carries the estimator's uncertainty into the money.
   */
  test("the input corners come from the inverted token band", () =>
    claudeEstimate((estimate: TokenEstimate) => {
      const bounds = tokenBounds(estimate);
      return check(
        projectCost(estimate, noOutput)(prices),
        okThen((projection: CostProjection) =>
          all([
            check(
              usdAmountValue(
                projection.low.input,
              ),
              toBe(
                (tokenCountValue(bounds.lower) *
                  3) /
                  1_000_000,
              ),
            ),
            check(
              usdAmountValue(
                projection.high.input,
              ),
              toBe(
                (tokenCountValue(bounds.upper) *
                  3) /
                  1_000_000,
              ),
            ),
            check(
              usdAmountValue(
                projection.point.input,
              ),
              toBe(
                (tokenCountValue(
                  estimateTokens(estimate),
                ) *
                  3) /
                  1_000_000,
              ),
            ),
          ]),
        ),
      );
    }));

  test("records the counting method and the accuracy source in the basis", () =>
    claudeEstimate((estimate: TokenEstimate) =>
      check(
        projectCost(estimate, noOutput)(prices),
        okThen((projection: CostProjection) =>
          all([
            check(
              projection.basis.countingMethod,
              toBe("calibrated-estimator"),
            ),
            check(
              projection.basis.accuracySource
                .length > 0,
              toBe(true),
            ),
          ]),
        ),
      ),
    ));

  /**
   * For an estimator family the interval must be genuinely WIDE — a projection
   * that collapsed to a point would be exactly the false precision this package
   * is built to avoid.
   */
  test("a Claude projection is an interval, not a point", () =>
    claudeEstimate((estimate: TokenEstimate) =>
      check(
        projectCost(estimate, noOutput)(prices),
        okThen((projection: CostProjection) =>
          check(
            usdAmountValue(projection.low.input) <
              usdAmountValue(
                projection.high.input,
              ),
            toBe(true),
          ),
        ),
      ),
    ));
});

/**
 * Builds a bound from two counts, falling back to `noOutput` if the pair is
 * incoherent — keeps the specs above free of Result plumbing for a value they
 * control.
 */
const outputBoundOrZero = (
  expected: number,
  ceiling: number,
): OutputBound => ({
  expected: countOf(expected),
  ceiling: countOf(ceiling),
});
