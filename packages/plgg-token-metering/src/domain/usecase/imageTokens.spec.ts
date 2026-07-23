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
  anthropicImageContentTokens,
  UNIMPLEMENTED_IMAGE_CONVERSIONS,
} from "plgg-token-metering/domain/usecase/imageTokens";
import { cardFor } from "plgg-token-metering/domain/usecase/registry";
import { modelId } from "plgg-token-metering/domain/model/ModelId";
import {
  TokenCount,
  tokenCountValue,
} from "plgg-token-metering/domain/model/TokenCount";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import { MeteringError } from "plgg-token-metering/domain/model/MeteringError";
import { EDGE_PROBES } from "plgg-token-metering/testkit/article";

describe("anthropicImageContentTokens", () => {
  /**
   * The formula tied to the measurement.
   *
   * The article probed a 300x300 PNG against Anthropic's count_tokens endpoint
   * and read 124 tokens. The published formula gives 300x300/750 = 120 content
   * tokens, and Claude's fitted message overhead is 4 — the same constant a text
   * request pays. 120 + 4 = 124 reproduces the probe exactly, which is what
   * justifies shipping this conversion at all.
   */
  test("content tokens plus Claude's fitted overhead reproduce the article's probe", () =>
    check(
      anthropicImageContentTokens({
        width: EDGE_PROBES.imageWidth,
        height: EDGE_PROBES.imageHeight,
      }),
      okThen((content: TokenCount) =>
        check(
          cardFor(modelId("claude-sonnet-5")),
          okThen((card: ModelCard) =>
            all([
              check(
                tokenCountValue(content),
                toBe(120),
              ),
              check(
                tokenCountValue(content) +
                  tokenCountValue(
                    card.calibration
                      .overheadTokens,
                  ),
                toBe(
                  EDGE_PROBES.anthropicImageTokens,
                ),
              ),
            ]),
          ),
        ),
      ),
    ));

  test("scales with area", () =>
    check(
      anthropicImageContentTokens({
        width: 750,
        height: 100,
      }),
      okThen((content: TokenCount) =>
        check(
          tokenCountValue(content),
          toBe(100),
        ),
      ),
    ));

  test("rounds a partial tile up rather than discarding it", () =>
    check(
      anthropicImageContentTokens({
        width: 1,
        height: 1,
      }),
      okThen((content: TokenCount) =>
        check(tokenCountValue(content), toBe(1)),
      ),
    ));

  test("rejects a non-positive or non-finite size", () =>
    all(
      [
        { width: 0, height: 100 },
        { width: 100, height: -1 },
        {
          width: Number.POSITIVE_INFINITY,
          height: 100,
        },
      ].map((size): Assertion =>
        check(
          anthropicImageContentTokens(size),
          errThen((error: MeteringError) =>
            check(
              error.__tag,
              toBe("InvalidError"),
            ),
          ),
        ),
      ),
    ));
});

describe("unimplemented image conversions", () => {
  /**
   * Records WHY Google's conversion is absent, as a test rather than only a
   * comment: the documented rule (a flat 258 tokens for an image up to 384px)
   * disagrees with the article's own probe of a 300x300 PNG, which read 1089 on
   * Gemini's countTokens endpoint. Shipping the documented formula would return
   * a number the provider's own endpoint contradicts by 4.2x.
   *
   * If a future run resolves the disagreement, this test is the marker to
   * revisit — and it fails if the fixture's probe ever comes to agree with the
   * documented 258, which would mean the omission is no longer justified.
   */
  test("Google's documented 258/image disagrees with the article's own probe", () =>
    all([
      check(
        EDGE_PROBES.googleImageTokens,
        toBe(1089),
      ),
      check(
        EDGE_PROBES.googleImageTokens === 258,
        toBe(false),
      ),
      check(
        UNIMPLEMENTED_IMAGE_CONVERSIONS.includes(
          "google-gemini",
        ),
        toBe(true),
      ),
    ]));

  test("OpenAI's conversion is absent because the article records no constants", () =>
    check(
      UNIMPLEMENTED_IMAGE_CONVERSIONS.includes(
        "openai-gpt",
      ),
      toBe(true),
    ));
});
