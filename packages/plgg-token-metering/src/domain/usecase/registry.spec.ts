import {
  describe,
  test,
  check,
  all,
  fail,
  toBe,
  okThen,
  errThen,
  Assertion,
} from "plgg-test";
import { isOk } from "plgg";
import {
  cardFor,
  measuredCards,
  measuredPrices,
} from "plgg-token-metering/domain/usecase/registry";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import {
  modelId,
  modelIdValue,
} from "plgg-token-metering/domain/model/ModelId";
import { tokenCountValue } from "plgg-token-metering/domain/model/TokenCount";
import {
  exactBpeCounter,
  estimatorCounter,
} from "plgg-token-metering/domain/model/TokenCounter";
import { rankedBytesVocabulary } from "plgg-token-metering/domain/model/BpeVocabulary";
import {
  MeteringError,
  isMethodMismatchError,
  isUnknownModelError,
} from "plgg-token-metering/domain/model/MeteringError";
import {
  FAMILIES,
  PER_CLASS,
  MEASURED_AT,
} from "plgg-token-metering/testkit/article";

const emptyVocabulary = rankedBytesVocabulary({
  ranks: new Map<string, number>(),
  pretokenPattern: "[a-z]+",
});

/**
 * Guards the transcription.
 *
 * `measured.ts` is hand-carried data: twelve tokens-per-character rates, four
 * fitted overheads, twelve error bands. A wrong digit there would produce
 * plausible numbers with no measurement behind them — the exact failure this
 * package exists to prevent. So every shipped value is re-asserted against the
 * article fixture, which is itself asserted against the published run.
 */
describe("the registry transcribes the article", () => {
  test("ships exactly the four measured models", () =>
    check(measuredCards.length, toBe(4)));

  test("every family's card matches the article's method and errors", () =>
    all(
      FAMILIES.map((family): Assertion =>
        check(
          cardFor(modelId(family.apiModelId)),
          okThen((card: ModelCard) =>
            all([
              check(
                card.countingMethod,
                toBe(family.countingMethod),
              ),
              check(
                card.calibration.meanAbsErrorPct,
                toBe(
                  family.holdoutMeanAbsErrorPct,
                ),
              ),
              check(
                card.calibration.maxAbsErrorPct,
                toBe(
                  family.holdoutMaxAbsErrorPct,
                ),
              ),
              check(
                card.calibration.withinTargetPct,
                toBe(family.withinTarget),
              ),
              check(
                card.measuredAt,
                toBe(MEASURED_AT),
              ),
              check(
                card.samplesVersion,
                toBe("tm-v1"),
              ),
            ]),
          ),
        ),
      ),
    ));

  test("every per-class band matches the article's published band", () =>
    all(
      PER_CLASS.map((row): Assertion => {
        const family = FAMILIES.find(
          (candidate) =>
            candidate.familyId === row.familyId,
        );
        return family === undefined
          ? fail({
              matcher: "band",
              expected: `a family for ${row.familyId}`,
              actual: "none",
              message: `${row.familyId}: fixture incomplete`,
            })
          : check(
              cardFor(modelId(family.apiModelId)),
              okThen((card: ModelCard) =>
                all([
                  check(
                    card.calibration.bands[
                      row.textClass
                    ].minPct,
                    toBe(row.minBandPct),
                  ),
                  check(
                    card.calibration.bands[
                      row.textClass
                    ].maxPct,
                    toBe(row.maxBandPct),
                  ),
                ]),
              ),
            );
      }),
    ));

  test("the fitted overheads are the article's 4 / 6 / 7 / 29", () =>
    check(
      measuredCards
        .map(
          (card: ModelCard) =>
            `${modelIdValue(card.model)}=${tokenCountValue(card.calibration.overheadTokens)}`,
        )
        .join(" "),
      toBe(
        "claude-sonnet-5=4 gpt-5.5=6 gemini-3.1-pro-preview=7 @cf/qwen/qwen2.5-coder-32b-instruct=29",
      ),
    ));

  test("every card carries a source and a report to check it against", () =>
    all(
      measuredCards.map(
        (card: ModelCard): Assertion =>
          all([
            check(
              card.source.length > 0,
              toBe(true),
            ),
            check(
              card.report.length > 0,
              toBe(true),
            ),
            check(
              card.lastVerified,
              toBe("2026-07-17"),
            ),
          ]),
      ),
    ));

  test("every shipped price entry records where its rates came from", () =>
    all(
      measuredPrices.map((prices): Assertion =>
        all([
          check(
            prices.provenance.source.length > 0,
            toBe(true),
          ),
          check(
            prices.provenance.retrievedAt,
            toBe("2026-07-17"),
          ),
        ]),
      ),
    ));
});

describe("registry scope", () => {
  /**
   * The article's scope, enforced. A sibling model in a measured family has no
   * card, because its tokenizer was never validated against the provider. This
   * is the test that fails if someone "helpfully" maps every Claude model onto
   * claude-sonnet-5's calibration.
   */
  test("an unmeasured sibling model has no card", () =>
    all(
      [
        "claude-opus-4-8",
        "gpt-5.4",
        "gemini-3.5-flash",
      ].map((id): Assertion =>
        check(
          cardFor(modelId(id)),
          errThen((error: MeteringError) =>
            check(
              isUnknownModelError(error),
              toBe(true),
            ),
          ),
        ),
      ),
    ));
});

describe("counter construction", () => {
  test("refuses an exact-BPE counter for an unpublished tokenizer", () =>
    check(
      cardFor(modelId("claude-sonnet-5")),
      okThen((card: ModelCard) =>
        check(
          exactBpeCounter({
            card,
            vocabulary: emptyVocabulary,
          }),
          errThen((error: MeteringError) =>
            check(
              isMethodMismatchError(error),
              toBe(true),
            ),
          ),
        ),
      ),
    ));

  test("refuses an estimator for a family whose vocabulary is published", () =>
    check(
      cardFor(modelId("gpt-5.5")),
      okThen((card: ModelCard) =>
        check(
          estimatorCounter({ card }),
          errThen((error: MeteringError) =>
            check(
              isMethodMismatchError(error),
              toBe(true),
            ),
          ),
        ),
      ),
    ));

  test("builds an estimator for Claude and an exact counter for GPT", () =>
    all([
      check(
        cardFor(modelId("claude-sonnet-5")),
        okThen((card: ModelCard) =>
          check(
            isOk(estimatorCounter({ card })),
            toBe(true),
          ),
        ),
      ),
      check(
        cardFor(modelId("gpt-5.5")),
        okThen((card: ModelCard) =>
          check(
            isOk(
              exactBpeCounter({
                card,
                vocabulary: emptyVocabulary,
              }),
            ),
            toBe(true),
          ),
        ),
      ),
    ]));
});
