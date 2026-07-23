import {
  describe,
  test,
  check,
  all,
  toBe,
  okThen,
  Assertion,
} from "plgg-test";
import { countTokens } from "plgg-token-metering/domain/usecase/countTokens";
import { cardFor } from "plgg-token-metering/domain/usecase/registry";
import { modelId } from "plgg-token-metering/domain/model/ModelId";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import {
  TokenCounter,
  counterCard,
  estimatorCounter,
  exactBpeCounter,
} from "plgg-token-metering/domain/model/TokenCounter";
import {
  BpeVocabulary,
  rankedBytesVocabulary,
} from "plgg-token-metering/domain/model/BpeVocabulary";
import {
  TokenEstimate,
  estimateAccuracy,
  estimateTokens,
  isEstimatedTokenCount,
  isExactTokenCount,
  tokenBounds,
} from "plgg-token-metering/domain/model/TokenEstimate";
import { modelIdValue } from "plgg-token-metering/domain/model/ModelId";
import { tokenCountValue } from "plgg-token-metering/domain/model/TokenCount";

const bytesOf = (text: string): string =>
  Array.from(
    new TextEncoder().encode(text),
    (byte) => String.fromCharCode(byte),
  ).join("");

/**
 * A toy vocabulary in which "ab" is one token. Standing in for the real
 * o200k_base, which this package does not bundle — what is under test here is
 * the COMPOSITION `contentTokens + fittedOverhead` and the shape of the result,
 * not the real vocabulary's counts (those are checked in `accuracy.spec.ts`).
 */
const toyVocabulary: BpeVocabulary =
  rankedBytesVocabulary({
    ranks: new Map([
      [bytesOf("a"), 0],
      [bytesOf("b"), 1],
      [bytesOf("ab"), 2],
    ]),
    pretokenPattern: "[a-z]+",
  });

const withExactCounter = (
  onCounter: (
    counter: TokenCounter,
    card: ModelCard,
  ) => ReturnType<typeof check>,
) =>
  check(
    cardFor(modelId("gpt-5.5")),
    okThen((card: ModelCard) =>
      check(
        exactBpeCounter({
          card,
          vocabulary: toyVocabulary,
        }),
        okThen((counter: TokenCounter) =>
          onCounter(counter, card),
        ),
      ),
    ),
  );

const withEstimatorCounter = (
  onCounter: (
    counter: TokenCounter,
    card: ModelCard,
  ) => ReturnType<typeof check>,
) =>
  check(
    cardFor(modelId("claude-sonnet-5")),
    okThen((card: ModelCard) =>
      check(
        estimatorCounter({ card }),
        okThen((counter: TokenCounter) =>
          onCounter(counter, card),
        ),
      ),
    ),
  );

describe("countTokens on an exact-BPE counter", () => {
  test("adds the family's fitted overhead to the BPE content count", () =>
    withExactCounter((counter) =>
      check(
        countTokens({
          text: "ab",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) =>
          // "ab" is one token in the toy vocabulary; gpt-5.5's fitted
          // overhead is 6, so the predicted total is 7.
          check(
            tokenCountValue(
              estimateTokens(estimate),
            ),
            toBe(7),
          ),
        ),
      ),
    ));

  test("returns the exact variant, carrying content and overhead separately", () =>
    withExactCounter((counter) =>
      check(
        countTokens({
          text: "ab",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) =>
          all([
            check(
              isExactTokenCount(estimate),
              toBe(true),
            ),
            check(
              isEstimatedTokenCount(estimate),
              toBe(false),
            ),
            check(
              estimate.__tag,
              toBe("ExactTokenCount"),
            ),
          ]),
        ),
      ),
    ));

  /**
   * The exact families measured 0.00% on every holdout class, so their band is a
   * point and the bounds collapse onto the prediction. This is the [0,0] band
   * flowing through the same inversion the wide bands use.
   */
  test("an exact count's bounds collapse onto the point", () =>
    withExactCounter((counter) =>
      check(
        countTokens({
          text: "ab",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) => {
          const bounds = tokenBounds(estimate);
          return all([
            check(
              tokenCountValue(bounds.lower),
              toBe(7),
            ),
            check(
              tokenCountValue(bounds.upper),
              toBe(7),
            ),
          ]);
        }),
      ),
    ));

  test("carries the accuracy evidence, marked as meeting the target", () =>
    withExactCounter((counter) =>
      check(
        countTokens({
          text: "ab",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) => {
          const accuracy =
            estimateAccuracy(estimate);
          return all([
            check(
              accuracy.withinTargetPct,
              toBe(true),
            ),
            check(
              accuracy.maxAbsErrorPct,
              toBe(0),
            ),
            check(
              accuracy.samplesVersion,
              toBe("tm-v1"),
            ),
            check(
              accuracy.source.length > 0,
              toBe(true),
            ),
          ]);
        }),
      ),
    ));
});

describe("countTokens on an estimator counter", () => {
  test("returns the estimated variant", () =>
    withEstimatorCounter((counter) =>
      check(
        countTokens({
          text: "Some English prose.",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) =>
          all([
            check(
              isEstimatedTokenCount(estimate),
              toBe(true),
            ),
            check(
              isExactTokenCount(estimate),
              toBe(false),
            ),
          ]),
        ),
      ),
    ));

  /**
   * The honest flag, at the value level: a Claude count announces that it does
   * NOT meet the ±5% target, so a caller reading the evidence cannot miss it.
   */
  test("a Claude count reports that it misses the ±5% target", () =>
    withEstimatorCounter((counter) =>
      check(
        countTokens({
          text: "Some English prose.",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) => {
          const accuracy =
            estimateAccuracy(estimate);
          return all([
            check(
              accuracy.withinTargetPct,
              toBe(false),
            ),
            check(
              accuracy.maxAbsErrorPct,
              toBe(16.24),
            ),
          ]);
        }),
      ),
    ));

  /**
   * The class is load-bearing: Japanese tokenizes at ~3x English's per-character
   * rate, so the same text length counted under a different class yields a
   * different number. This is why the class is a required input rather than a
   * guess.
   */
  test("the declared class changes the count for the same text", () =>
    withEstimatorCounter((counter) =>
      check(
        countTokens({
          text: "aaaaaaaaaaaaaaaaaaaa",
          textClass: "english",
        })(counter),
        okThen((asEnglish: TokenEstimate) =>
          check(
            countTokens({
              text: "aaaaaaaaaaaaaaaaaaaa",
              textClass: "japanese",
            })(counter),
            okThen((asJapanese: TokenEstimate) =>
              check(
                tokenCountValue(
                  estimateTokens(asEnglish),
                ) <
                  tokenCountValue(
                    estimateTokens(asJapanese),
                  ),
                toBe(true),
              ),
            ),
          ),
        ),
      ),
    ));

  test("empty text still costs the fitted message overhead", () =>
    withEstimatorCounter((counter) =>
      check(
        countTokens({
          text: "",
          textClass: "english",
        })(counter),
        okThen((estimate: TokenEstimate) =>
          check(
            tokenCountValue(
              estimateTokens(estimate),
            ),
            toBe(4),
          ),
        ),
      ),
    ));
});

describe("counterCard", () => {
  test("reads back the card either counter was built from", () =>
    all([
      withExactCounter((counter): Assertion =>
        check(
          modelIdValue(
            counterCard(counter).model,
          ),
          toBe("gpt-5.5"),
        ),
      ),
      withEstimatorCounter((counter): Assertion =>
        check(
          modelIdValue(
            counterCard(counter).model,
          ),
          toBe("claude-sonnet-5"),
        ),
      ),
    ]));
});
