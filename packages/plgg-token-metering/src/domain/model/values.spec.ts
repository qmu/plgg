import {
  describe,
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
  Assertion,
} from "plgg-test";
import {
  TokenCount,
  asTokenCount,
  countOf,
  isTokenCount,
  tokenCountValue,
  addTokens,
  zeroTokens,
} from "plgg-token-metering/domain/model/TokenCount";
import {
  UsdAmount,
  UsdPerMTok,
  asUsdAmount,
  asUsdPerMTok,
  addUsd,
  isUsdAmount,
  isUsdPerMTok,
  perMTok,
  priceTokens,
  usdAmountValue,
  usdPerMTokValue,
  zeroUsd,
} from "plgg-token-metering/domain/model/Usd";
import {
  ModelId,
  asModelId,
  isModelId,
  modelId,
  modelIdValue,
  sameModelId,
} from "plgg-token-metering/domain/model/ModelId";
import {
  TextClass,
  TEXT_CLASSES,
  asTextClass,
  isTextClass,
} from "plgg-token-metering/domain/model/TextClass";
import {
  CountingMethod,
  accuracyEvidence,
  asCountingMethod,
  errorBand,
  exactBand,
  isCountingMethod,
} from "plgg-token-metering/domain/model/Accuracy";
import {
  Calibration,
  bandFor,
  calibration,
  rateFor,
} from "plgg-token-metering/domain/model/Calibration";
import { tokenUsage } from "plgg-token-metering/domain/model/TokenUsage";
import {
  modelPrices,
  priceProvenance,
} from "plgg-token-metering/domain/model/ModelPrices";

/**
 * The value objects, and the invariants that make a count, an amount, and a
 * rate three different things rather than three `number`s.
 */
describe("TokenCount", () => {
  test("accepts a non-negative integer", () =>
    check(
      asTokenCount(42),
      okThen((count: TokenCount) =>
        check(tokenCountValue(count), toBe(42)),
      ),
    ));

  test("rejects a negative count, a fraction, and a non-number", () =>
    all(
      [-1, 1.5, "12", null].map(
        (value): Assertion =>
          check(
            asTokenCount(value),
            errThen(() =>
              check(true, toBe(true)),
            ),
          ),
      ),
    ));

  test("accepts an already-branded count unchanged", () =>
    check(
      asTokenCount(countOf(7)),
      okThen((count: TokenCount) =>
        check(tokenCountValue(count), toBe(7)),
      ),
    ));

  test("countOf forces the invariant on a computed value", () =>
    all([
      check(
        tokenCountValue(countOf(-5)),
        toBe(0),
      ),
      check(
        tokenCountValue(countOf(3.7)),
        toBe(3),
      ),
    ]));

  test("adds counts, with zero as the identity", () =>
    all([
      check(
        tokenCountValue(
          addTokens(countOf(3))(countOf(4)),
        ),
        toBe(7),
      ),
      check(
        tokenCountValue(
          addTokens(countOf(3))(zeroTokens),
        ),
        toBe(3),
      ),
    ]));

  test("guards a branded count", () =>
    all([
      check(isTokenCount(countOf(1)), toBe(true)),
      check(isTokenCount(1), toBe(false)),
    ]));
});

describe("Usd", () => {
  test("accepts a non-negative amount and rejects a negative one", () =>
    all([
      check(
        asUsdAmount(1.25),
        okThen((amount: UsdAmount) =>
          check(
            usdAmountValue(amount),
            toBe(1.25),
          ),
        ),
      ),
      check(
        asUsdAmount(-0.01),
        errThen(() => check(true, toBe(true))),
      ),
      check(
        asUsdAmount(Number.POSITIVE_INFINITY),
        errThen(() => check(true, toBe(true))),
      ),
    ]));

  test("accepts an already-branded amount and rate unchanged", () =>
    all([
      check(
        asUsdAmount(zeroUsd),
        okThen((amount: UsdAmount) =>
          check(usdAmountValue(amount), toBe(0)),
        ),
      ),
      check(
        asUsdPerMTok(perMTok(3)),
        okThen((rate: UsdPerMTok) =>
          check(usdPerMTokValue(rate), toBe(3)),
        ),
      ),
    ]));

  test("rejects a negative rate", () =>
    check(
      asUsdPerMTok(-1),
      errThen(() => check(true, toBe(true))),
    ));

  test("perMTok forces the invariant on a reviewed literal", () =>
    all([
      check(
        usdPerMTokValue(perMTok(-2)),
        toBe(0),
      ),
      check(
        usdPerMTokValue(perMTok(Number.NaN)),
        toBe(0),
      ),
    ]));

  /** The one conversion from a count to money — the reason for two brands. */
  test("prices a million tokens at exactly the per-MTok rate", () =>
    check(
      usdAmountValue(
        priceTokens(perMTok(3))(1_000_000),
      ),
      toBe(3),
    ));

  test("adds amounts", () =>
    check(
      usdAmountValue(
        addUsd(
          priceTokens(perMTok(3))(1_000_000),
        )(priceTokens(perMTok(15))(1_000_000)),
      ),
      toBe(18),
    ));

  test("guards the two money brands apart", () =>
    all([
      check(isUsdAmount(zeroUsd), toBe(true)),
      check(isUsdAmount(perMTok(1)), toBe(false)),
      check(isUsdPerMTok(perMTok(1)), toBe(true)),
      check(isUsdPerMTok(zeroUsd), toBe(false)),
    ]));
});

describe("ModelId", () => {
  test("carries the provider's spelling verbatim", () =>
    all(
      [
        "gpt-5.5",
        "claude-sonnet-5",
        "@cf/qwen/qwen2.5-coder-32b-instruct",
      ].map((id): Assertion =>
        check(
          modelIdValue(modelId(id)),
          toBe(id),
        ),
      ),
    ));

  test("falls back to a loud sentinel for a blank literal", () =>
    check(
      modelIdValue(modelId("   ")),
      toBe("unspecified-model"),
    ));

  test("casts a string and rejects a non-string", () =>
    all([
      check(
        asModelId("gpt-5.5"),
        okThen((id: ModelId) =>
          check(
            modelIdValue(id),
            toBe("gpt-5.5"),
          ),
        ),
      ),
      check(
        asModelId(42),
        errThen(() => check(true, toBe(true))),
      ),
      check(
        asModelId(modelId("gpt-5.5")),
        okThen((id: ModelId) =>
          check(
            modelIdValue(id),
            toBe("gpt-5.5"),
          ),
        ),
      ),
    ]));

  test("compares two ids structurally", () =>
    all([
      check(
        sameModelId(modelId("a"))(modelId("a")),
        toBe(true),
      ),
      check(
        sameModelId(modelId("a"))(modelId("b")),
        toBe(false),
      ),
      check(isModelId(modelId("a")), toBe(true)),
      check(isModelId("a"), toBe(false)),
    ]));
});

describe("TextClass", () => {
  test("admits exactly the three measured classes", () =>
    all([
      check(TEXT_CLASSES.length, toBe(3)),
      ...TEXT_CLASSES.map(
        (textClass: TextClass): Assertion =>
          check(
            asTextClass(textClass),
            okThen((value: TextClass) =>
              check(value, toBe(textClass)),
            ),
          ),
      ),
    ]));

  test("rejects a class the measurement never covered", () =>
    all(
      ["base64", "", null].map(
        (value): Assertion =>
          check(
            asTextClass(value),
            errThen(() =>
              check(true, toBe(true)),
            ),
          ),
      ),
    ));

  test("guards a class", () =>
    all([
      check(isTextClass("code"), toBe(true)),
      check(isTextClass("prose"), toBe(false)),
    ]));
});

describe("Accuracy", () => {
  test("admits the two counting methods and rejects anything else", () =>
    all([
      check(
        asCountingMethod("exact-bpe"),
        okThen((method: CountingMethod) =>
          check(method, toBe("exact-bpe")),
        ),
      ),
      check(
        asCountingMethod("calibrated-estimator"),
        okThen((method: CountingMethod) =>
          check(
            method,
            toBe("calibrated-estimator"),
          ),
        ),
      ),
      check(
        asCountingMethod("guess"),
        errThen(() => check(true, toBe(true))),
      ),
      check(
        isCountingMethod("exact-bpe"),
        toBe(true),
      ),
    ]));

  test("builds a band and rejects an inverted one", () =>
    all([
      check(
        errorBand({ minPct: -10, maxPct: 15 }),
        okThen((band) =>
          check(band.minPct, toBe(-10)),
        ),
      ),
      check(
        errorBand({ minPct: 15, maxPct: -10 }),
        errThen(() => check(true, toBe(true))),
      ),
    ]));

  /**
   * A band at or below -100% would mean a negative predicted count, which
   * `tokenBounds` would divide by zero or flip. Rejected at construction.
   */
  test("rejects a band whose minimum reaches -100%", () =>
    check(
      errorBand({ minPct: -100, maxPct: 0 }),
      errThen(() => check(true, toBe(true))),
    ));

  test("rejects a non-finite band bound", () =>
    check(
      errorBand({
        minPct: Number.NaN,
        maxPct: 0,
      }),
      errThen(() => check(true, toBe(true))),
    ));

  test("the exact band is a point at zero", () =>
    all([
      check(exactBand.minPct, toBe(0)),
      check(exactBand.maxPct, toBe(0)),
    ]));

  test("evidence requires a source and non-negative errors", () =>
    all([
      check(
        accuracyEvidence({
          band: exactBand,
          meanAbsErrorPct: 0,
          maxAbsErrorPct: 0,
          withinTargetPct: true,
          samplesVersion: "tm-v1",
          measuredAt: "2026-07-17T03:02:34.699Z",
          source: "the report",
        }),
        okThen((evidence) =>
          check(
            evidence.source,
            toBe("the report"),
          ),
        ),
      ),
      check(
        accuracyEvidence({
          band: exactBand,
          meanAbsErrorPct: 0,
          maxAbsErrorPct: 0,
          withinTargetPct: true,
          samplesVersion: "tm-v1",
          measuredAt: "2026-07-17T03:02:34.699Z",
          source: "  ",
        }),
        errThen(() => check(true, toBe(true))),
      ),
      check(
        accuracyEvidence({
          band: exactBand,
          meanAbsErrorPct: -1,
          maxAbsErrorPct: 0,
          withinTargetPct: true,
          samplesVersion: "tm-v1",
          measuredAt: "2026-07-17T03:02:34.699Z",
          source: "the report",
        }),
        errThen(() => check(true, toBe(true))),
      ),
    ]));
});

describe("Calibration", () => {
  const rates = {
    english: 0.2,
    japanese: 0.9,
    code: 0.3,
  };
  const bands = {
    english: exactBand,
    japanese: exactBand,
    code: exactBand,
  };

  test("builds from valid rates and reads them back per class", () =>
    check(
      calibration({
        overheadTokens: 4,
        tokensPerChar: rates,
        bands,
        meanAbsErrorPct: 0,
        maxAbsErrorPct: 0,
        withinTargetPct: true,
      }),
      okThen((fitted: Calibration) =>
        all([
          check(
            rateFor("japanese")(fitted),
            toBe(0.9),
          ),
          check(
            bandFor("code")(fitted).maxPct,
            toBe(0),
          ),
        ]),
      ),
    ));

  test("rejects a negative or non-finite rate", () =>
    all(
      [
        { ...rates, english: -0.1 },
        { ...rates, code: Number.NaN },
      ].map((bad): Assertion =>
        check(
          calibration({
            overheadTokens: 4,
            tokensPerChar: bad,
            bands,
            meanAbsErrorPct: 0,
            maxAbsErrorPct: 0,
            withinTargetPct: true,
          }),
          errThen(() => check(true, toBe(true))),
        ),
      ),
    ));

  test("rejects a fractional or negative fitted overhead", () =>
    all(
      [-1, 2.5].map((overhead): Assertion =>
        check(
          calibration({
            overheadTokens: overhead,
            tokensPerChar: rates,
            bands,
            meanAbsErrorPct: 0,
            maxAbsErrorPct: 0,
            withinTargetPct: true,
          }),
          errThen(() => check(true, toBe(true))),
        ),
      ),
    ));
});

describe("TokenUsage and ModelPrices defaults", () => {
  test("every usage bucket defaults to zero", () => {
    const usage = tokenUsage({});
    return all([
      check(
        tokenCountValue(usage.inputTokens),
        toBe(0),
      ),
      check(
        tokenCountValue(usage.outputTokens),
        toBe(0),
      ),
      check(
        tokenCountValue(usage.cacheWriteTokens),
        toBe(0),
      ),
      check(
        tokenCountValue(usage.cacheReadTokens),
        toBe(0),
      ),
    ]);
  });

  /** An unsupplied rate is unknown, not free. */
  test("every optional rate defaults to none", () => {
    const prices = modelPrices({
      model: modelId("m"),
      inputPerMTok: perMTok(1),
      provenance: {
        source: "s",
        retrievedAt: "2026-07-17",
        note: "n",
      },
    });
    return all([
      check(
        prices.outputPerMTok.__tag,
        toBe("None"),
      ),
      check(
        prices.cacheWritePerMTok.__tag,
        toBe("None"),
      ),
      check(
        prices.cacheReadPerMTok.__tag,
        toBe("None"),
      ),
    ]);
  });
});

describe("PriceProvenance", () => {
  /**
   * A rate with no recorded origin cannot be re-checked when it goes stale, and
   * a stale rate is not hypothetical here: the 2026-07-17 recency repair caught
   * a GPT-5.5 input price that was 5x out of date. So the caster refuses a
   * provenance without a source or a date.
   */
  test("accepts a provenance carrying a source and a date", () =>
    check(
      priceProvenance({
        source: "the catalog",
        retrievedAt: "2026-07-17",
        note: "input and output only",
      }),
      okThen((provenance) =>
        all([
          check(
            provenance.source,
            toBe("the catalog"),
          ),
          check(
            provenance.retrievedAt,
            toBe("2026-07-17"),
          ),
        ]),
      ),
    ));

  test("rejects a provenance with no source or no date", () =>
    all(
      [
        {
          source: "   ",
          retrievedAt: "2026-07-17",
          note: "n",
        },
        {
          source: "the catalog",
          retrievedAt: "",
          note: "n",
        },
      ].map((bad): Assertion =>
        check(
          priceProvenance(bad),
          errThen(() => check(true, toBe(true))),
        ),
      ),
    ));
});
