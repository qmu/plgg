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
import { estimateCost } from "plgg-token-metering/domain/usecase/estimateCost";
import { pricesFor } from "plgg-token-metering/domain/usecase/registry";
import {
  ModelPrices,
  PriceProvenance,
  modelPrices,
} from "plgg-token-metering/domain/model/ModelPrices";
import { tokenUsage } from "plgg-token-metering/domain/model/TokenUsage";
import { CostBreakdown } from "plgg-token-metering/domain/model/Cost";
import { countOf } from "plgg-token-metering/domain/model/TokenCount";
import {
  perMTok,
  usdAmountValue,
} from "plgg-token-metering/domain/model/Usd";
import { modelId } from "plgg-token-metering/domain/model/ModelId";
import {
  MeteringError,
  isMissingPriceError,
} from "plgg-token-metering/domain/model/MeteringError";

const provenance: PriceProvenance = {
  source: "spec fixture",
  retrievedAt: "2026-07-17",
  note: "hand-built for this spec",
};

/** A table with input and output rates but no cache rates — the shipped shape. */
const withoutCacheRates: ModelPrices =
  modelPrices({
    model: modelId("test-model"),
    inputPerMTok: perMTok(3),
    outputPerMTok: some(perMTok(15)),
    provenance,
  });

describe("estimateCost", () => {
  test("prices input and output at their own rates, keeping the breakdown", () =>
    check(
      estimateCost(
        tokenUsage({
          inputTokens: countOf(1_000_000),
          outputTokens: countOf(1_000_000),
        }),
      )(withoutCacheRates),
      okThen((cost: CostBreakdown) =>
        all([
          check(
            usdAmountValue(cost.input),
            toBe(3),
          ),
          check(
            usdAmountValue(cost.output),
            toBe(15),
          ),
          check(
            usdAmountValue(cost.total),
            toBe(18),
          ),
        ]),
      ),
    ));

  test("keeps every bucket, not just a total", () =>
    check(
      estimateCost(
        tokenUsage({
          inputTokens: countOf(2_000_000),
        }),
      )(withoutCacheRates),
      okThen((cost: CostBreakdown) =>
        all([
          check(
            usdAmountValue(cost.input),
            toBe(6),
          ),
          check(
            usdAmountValue(cost.output),
            toBe(0),
          ),
          check(
            usdAmountValue(cost.cacheRead),
            toBe(0),
          ),
          check(
            usdAmountValue(cost.total),
            toBe(6),
          ),
        ]),
      ),
    ));

  /**
   * The refusal that keeps this package from inventing money. No source it
   * draws on publishes a cache rate, so pricing cache tokens must fail loudly
   * rather than quietly charging them at the input rate.
   */
  test("refuses to price cache tokens when no cache rate is published", () =>
    check(
      estimateCost(
        tokenUsage({
          inputTokens: countOf(100),
          cacheReadTokens: countOf(50),
        }),
      )(withoutCacheRates),
      errThen((error: MeteringError) =>
        check(
          isMissingPriceError(error),
          toBe(true),
        ),
      ),
    ));

  /**
   * The other half of that rule: a bucket with zero tokens needs no rate, so a
   * table with no cache rates still prices an ordinary request.
   */
  test("prices a request that used no cache, despite no cache rate", () =>
    check(
      estimateCost(
        tokenUsage({
          inputTokens: countOf(1_000_000),
        }),
      )(withoutCacheRates),
      okThen((cost: CostBreakdown) =>
        check(
          usdAmountValue(cost.total),
          toBe(3),
        ),
      ),
    ));

  test("carries the price provenance into the result", () =>
    check(
      estimateCost(
        tokenUsage({ inputTokens: countOf(10) }),
      )(withoutCacheRates),
      okThen((cost: CostBreakdown) =>
        check(
          cost.prices.retrievedAt,
          toBe("2026-07-17"),
        ),
      ),
    ));

  test("does not round a sub-cent amount away", () =>
    check(
      estimateCost(
        tokenUsage({ inputTokens: countOf(1) }),
      )(withoutCacheRates),
      okThen((cost: CostBreakdown) =>
        check(
          usdAmountValue(cost.total) > 0,
          toBe(true),
        ),
      ),
    ));
});

/**
 * A caller-supplied table that DOES carry cache rates — the escape hatch the
 * shipped tables leave open. Proves the cache buckets are wired end to end, so
 * the shipped `none()`s are a statement about the SOURCE (no published rate),
 * not a gap in this package.
 */
const withCacheRates: ModelPrices = modelPrices({
  model: modelId("test-model"),
  inputPerMTok: perMTok(3),
  outputPerMTok: some(perMTok(15)),
  cacheWritePerMTok: some(perMTok(3.75)),
  cacheReadPerMTok: some(perMTok(0.3)),
  provenance: {
    source: "a caller's own catalog reading",
    retrievedAt: "2026-07-17",
    note: "supplied by the consumer, with its own provenance",
  },
});

describe("estimateCost with caller-supplied cache rates", () => {
  test("prices each cache bucket at its own rate", () =>
    check(
      estimateCost(
        tokenUsage({
          inputTokens: countOf(1_000_000),
          outputTokens: countOf(1_000_000),
          cacheWriteTokens: countOf(1_000_000),
          cacheReadTokens: countOf(1_000_000),
        }),
      )(withCacheRates),
      okThen((cost: CostBreakdown) =>
        all([
          check(
            usdAmountValue(cost.input),
            toBe(3),
          ),
          check(
            usdAmountValue(cost.output),
            toBe(15),
          ),
          check(
            usdAmountValue(cost.cacheWrite),
            toBe(3.75),
          ),
          check(
            usdAmountValue(cost.cacheRead),
            toBe(0.3),
          ),
          check(
            usdAmountValue(cost.total),
            toBe(22.05),
          ),
        ]),
      ),
    ));

  /**
   * The reason the breakdown is kept: the same 1M tokens cost 12.5x more as a
   * cache write than as a cache read. A meter that collapsed the buckets into
   * one number could not reproduce this.
   */
  test("the same token count costs differently per bucket", () =>
    check(
      estimateCost(
        tokenUsage({
          cacheWriteTokens: countOf(1_000_000),
        }),
      )(withCacheRates),
      okThen((write: CostBreakdown) =>
        check(
          estimateCost(
            tokenUsage({
              cacheReadTokens: countOf(1_000_000),
            }),
          )(withCacheRates),
          okThen((read: CostBreakdown) =>
            check(
              usdAmountValue(write.total) >
                usdAmountValue(read.total),
              toBe(true),
            ),
          ),
        ),
      ),
    ));

  test("refuses a cache-write bucket when only a cache-read rate is known", () =>
    check(
      estimateCost(
        tokenUsage({
          cacheWriteTokens: countOf(10),
        }),
      )(
        modelPrices({
          model: modelId("test-model"),
          inputPerMTok: perMTok(3),
          cacheReadPerMTok: some(perMTok(0.3)),
          provenance,
        }),
      ),
      errThen((error: MeteringError) =>
        check(
          isMissingPriceError(error),
          toBe(true),
        ),
      ),
    ));
});

describe("the shipped price table", () => {
  test("prices gpt-5.5 input at the corrected $5/MTok, not the 5x-stale $25", () =>
    check(
      pricesFor(modelId("gpt-5.5")),
      okThen((prices: ModelPrices) =>
        check(
          estimateCost(
            tokenUsage({
              inputTokens: countOf(1_000_000),
            }),
          )(prices),
          okThen((cost: CostBreakdown) =>
            check(
              usdAmountValue(cost.input),
              toBe(5),
            ),
          ),
        ),
      ),
    ));

  test("refuses to price Qwen output, which no source publishes", () =>
    check(
      pricesFor(
        modelId(
          "@cf/qwen/qwen2.5-coder-32b-instruct",
        ),
      ),
      okThen((prices: ModelPrices) =>
        all([
          check(
            prices.outputPerMTok.__tag,
            toBe("None"),
          ),
          check(
            estimateCost(
              tokenUsage({
                inputTokens: countOf(10),
                outputTokens: countOf(10),
              }),
            )(prices),
            errThen((error: MeteringError) =>
              check(
                isMissingPriceError(error),
                toBe(true),
              ),
            ),
          ),
        ]),
      ),
    ));

  test("prices Qwen input, which the run's family card does publish", () =>
    check(
      pricesFor(
        modelId(
          "@cf/qwen/qwen2.5-coder-32b-instruct",
        ),
      ),
      okThen((prices: ModelPrices) =>
        check(
          estimateCost(
            tokenUsage({
              inputTokens: countOf(1_000_000),
            }),
          )(prices),
          okThen((cost: CostBreakdown) =>
            check(
              usdAmountValue(cost.input),
              toBe(0.66),
            ),
          ),
        ),
      ),
    ));

  test("ships no cache rate for any model", () =>
    check(
      pricesFor(modelId("claude-sonnet-5")),
      okThen((prices: ModelPrices) =>
        all([
          check(
            prices.cacheReadPerMTok.__tag,
            toBe("None"),
          ),
          check(
            prices.cacheWritePerMTok.__tag,
            toBe("None"),
          ),
        ]),
      ),
    ));

  test("has no entry for an unmeasured sibling model", () =>
    check(
      pricesFor(modelId("claude-opus-4-8")),
      errThen((error: MeteringError) =>
        check(
          error.__tag,
          toBe("UnknownModelError"),
        ),
      ),
    ));
});
