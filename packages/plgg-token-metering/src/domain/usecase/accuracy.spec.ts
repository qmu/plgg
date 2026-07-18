import {
  describe,
  test,
  check,
  all,
  pass,
  fail,
  toBe,
  Assertion,
} from "plgg-test";
import { isOk } from "plgg";
import {
  FAMILIES,
  SAMPLES,
  ACCURACY_TARGET_PCT,
  ArticleFamily,
  ArticleRow,
} from "plgg-token-metering/testkit/article";
import { cardFor } from "plgg-token-metering/domain/usecase/registry";
import { countTokens } from "plgg-token-metering/domain/usecase/countTokens";
import { estimatorCounter } from "plgg-token-metering/domain/model/TokenCounter";
import {
  estimateTokens,
  tokenBounds,
} from "plgg-token-metering/domain/model/TokenEstimate";
import { tokenCountValue } from "plgg-token-metering/domain/model/TokenCount";
import { modelId } from "plgg-token-metering/domain/model/ModelId";
import { countOf } from "plgg-token-metering/domain/model/TokenCount";

/**
 * The accuracy claim, re-checked against the article's measured numbers.
 *
 * No API key, no network, no provider call: the article's API-reported counts
 * are the fixture, and this package's own counting runs against them. What is
 * verified is that this implementation reproduces the PUBLISHED measurement —
 * if the estimator here drifts from the one that was measured, the numbers in
 * the README stop being true and this fails.
 *
 * WHAT THIS DOES AND DOES NOT COVER, stated plainly:
 *
 * - ESTIMATOR families (Claude, Gemini) are covered end-to-end: `countTokens`
 *   runs over the real sample text and its prediction is compared against the
 *   provider's reported count.
 * - EXACT families (OpenAI, Qwen) cannot be run here, because an exact count
 *   needs the published vocabulary (o200k_base is ~3.6 MB) and this package
 *   does not bundle one — see DEPENDENCY-LOG.md. Their composition is checked
 *   from the article's recorded content counts instead, in `exactComposition`
 *   below. The BPE engine itself is verified against a real vocabulary in
 *   `bpe.spec.ts` and, out of band, against all 30 samples of the real
 *   o200k_base — see README, Accuracy.
 */

const errorPctOf = (
  predicted: number,
  apiTokens: number,
): number =>
  (100 * (predicted - apiTokens)) / apiTokens;

const estimatorFamilies: ReadonlyArray<ArticleFamily> =
  FAMILIES.filter(
    (family) =>
      family.countingMethod ===
      "calibrated-estimator",
  );

const exactFamilies: ReadonlyArray<ArticleFamily> =
  FAMILIES.filter(
    (family) =>
      family.countingMethod === "exact-bpe",
  );

const predictWith = (
  apiModelId: string,
  row: ArticleRow,
): number | undefined => {
  const sample = SAMPLES.find(
    (candidate) => candidate.id === row.sampleId,
  );
  if (sample === undefined) return undefined;
  const card = cardFor(modelId(apiModelId));
  if (!isOk(card)) return undefined;
  const counter = estimatorCounter({
    card: card.content,
  });
  if (!isOk(counter)) return undefined;
  const counted = countTokens({
    text: sample.text,
    textClass: sample.textClass,
  })(counter.content);
  return isOk(counted)
    ? tokenCountValue(
        estimateTokens(counted.content),
      )
    : undefined;
};

describe("accuracy against the published measurement", () => {
  /**
   * The strongest check in this package: for every one of the 30 rows, this
   * package's estimator must predict the exact integer the article recorded as
   * its prediction. Reproducing the measurement row by row is what makes the
   * error table transferable — the bands shipped in the registry describe THIS
   * code, not merely the code that was measured.
   */
  test("estimator families reproduce the article's per-sample predictions exactly", () =>
    all(
      estimatorFamilies.flatMap((family) =>
        family.rows.map((row): Assertion => {
          const predicted = predictWith(
            family.apiModelId,
            row,
          );
          return predicted === undefined
            ? fail({
                matcher: "predict",
                expected: `${row.predictedTokens}`,
                actual: "could not count",
                message: `${family.familyId}/${row.sampleId}: counting failed`,
              })
            : check(
                predicted,
                toBe(row.predictedTokens),
              );
        }),
      ),
    ));

  /**
   * And the errors those predictions produce must land inside each class's
   * published band. This is the band's meaning: the extremes actually observed
   * on the holdout.
   */
  test("holdout errors land inside the published per-class band", () =>
    all(
      estimatorFamilies.flatMap((family) =>
        family.rows
          .filter((row) => row.role === "holdout")
          .map((row): Assertion => {
            const predicted = predictWith(
              family.apiModelId,
              row,
            );
            if (predicted === undefined) {
              return fail({
                matcher: "band",
                expected: "a prediction",
                actual: "none",
                message: `${family.familyId}/${row.sampleId}: counting failed`,
              });
            }
            const error = errorPctOf(
              predicted,
              row.apiTokens,
            );
            return Math.abs(error) <=
              family.holdoutMaxAbsErrorPct + 0.01
              ? pass(row.sampleId)
              : fail({
                  matcher: "band",
                  expected: `|error| <= ${family.holdoutMaxAbsErrorPct}%`,
                  actual: `${error.toFixed(2)}%`,
                  message: `${family.familyId}/${row.sampleId}: error outside the family's published max`,
                });
          }),
      ),
    ));

  /**
   * The honest half of the accuracy story, asserted rather than only written
   * down. Claude and Gemini MISS the ±5% target, and this test fails if a future
   * change quietly claims otherwise — including by "improving" a calibration
   * without re-measuring.
   */
  test("Claude and Gemini are recorded as NOT meeting the ±5% target", () =>
    all(
      estimatorFamilies.map(
        (family): Assertion =>
          family.holdoutMaxAbsErrorPct >
          ACCURACY_TARGET_PCT
            ? check(
                family.withinTarget,
                toBe(false),
              )
            : fail({
                matcher: "targetHonesty",
                expected: `${family.familyId} max error above ${ACCURACY_TARGET_PCT}%`,
                actual: `${family.holdoutMaxAbsErrorPct}%`,
                message: `${family.familyId}: fixture no longer reflects the published miss — re-check the article before relaxing this`,
              }),
      ),
    ));

  test("the two estimator families are Claude and Gemini, at the published errors", () =>
    all([
      check(estimatorFamilies.length, toBe(2)),
      check(
        estimatorFamilies
          .map(
            (family) =>
              `${family.familyId}:${family.holdoutMeanAbsErrorPct}/${family.holdoutMaxAbsErrorPct}`,
          )
          .join(" "),
        toBe(
          "anthropic-claude:8.54/16.24 google-gemini:6.6/15.73",
        ),
      ),
    ]));

  /**
   * Exact families: the vocabulary is not bundled, so the BPE cannot run here.
   * What IS checkable without it is the composition the package performs on top
   * of the content count — `contentTokens + fittedOverhead` — against the
   * article's recorded content counts and API totals. That is the arithmetic
   * that turns an exact content count into a prediction, and it is where the
   * 0.00% comes from.
   */
  test("exact families: recorded content + fitted overhead reproduces the API total (0.00%)", () =>
    all(
      exactFamilies.flatMap((family) => {
        const card = cardFor(
          modelId(family.apiModelId),
        );
        return family.rows.map(
          (row): Assertion => {
            if (
              !isOk(card) ||
              row.selfContentTokens === undefined
            ) {
              return fail({
                matcher: "exactComposition",
                expected:
                  "a card and a content count",
                actual: "missing",
                message: `${family.familyId}/${row.sampleId}: fixture or registry incomplete`,
              });
            }
            const predicted =
              row.selfContentTokens +
              tokenCountValue(
                card.content.calibration
                  .overheadTokens,
              );
            return all([
              check(
                predicted,
                toBe(row.predictedTokens),
              ),
              check(
                predicted,
                toBe(row.apiTokens),
              ),
              check(row.errorPct, toBe(0)),
            ]);
          },
        );
      }),
    ));

  test("exact families are OpenAI and Qwen, both at 0.00%", () =>
    all([
      check(exactFamilies.length, toBe(2)),
      ...exactFamilies.map((family): Assertion =>
        all([
          check(
            family.holdoutMaxAbsErrorPct,
            toBe(0),
          ),
          check(family.withinTarget, toBe(true)),
        ]),
      ),
    ]));

  /**
   * The band inversion, checked on a family whose band is wide. A predicted
   * count of N with a band of [min, max] means the ACTUAL count lies in
   * [N/(1+max), N/(1+min)] — dividing, not multiplying. The naive
   * `N × (1 ± band)` would put the bounds on the wrong side.
   */
  test("tokenBounds brackets the API-reported count for Claude holdout rows", () =>
    all(
      (
        FAMILIES.find(
          (family) =>
            family.familyId ===
            "anthropic-claude",
        )?.rows ?? []
      )
        .filter((row) => row.role === "holdout")
        .map((row): Assertion => {
          const sample = SAMPLES.find(
            (candidate) =>
              candidate.id === row.sampleId,
          );
          const card = cardFor(
            modelId("claude-sonnet-5"),
          );
          if (
            sample === undefined ||
            !isOk(card)
          ) {
            return fail({
              matcher: "bounds",
              expected: "a sample and a card",
              actual: "missing",
              message: `${row.sampleId}: fixture incomplete`,
            });
          }
          const counter = estimatorCounter({
            card: card.content,
          });
          if (!isOk(counter)) {
            return fail({
              matcher: "bounds",
              expected: "an estimator counter",
              actual: "none",
              message: `${row.sampleId}: counter build failed`,
            });
          }
          const counted = countTokens({
            text: sample.text,
            textClass: sample.textClass,
          })(counter.content);
          if (!isOk(counted)) {
            return fail({
              matcher: "bounds",
              expected: "a count",
              actual: "none",
              message: `${row.sampleId}: counting failed`,
            });
          }
          const bounds = tokenBounds(
            counted.content,
          );
          const lower = tokenCountValue(
            bounds.lower,
          );
          const upper = tokenCountValue(
            bounds.upper,
          );
          return lower <= row.apiTokens &&
            row.apiTokens <= upper
            ? pass(row.sampleId)
            : fail({
                matcher: "bounds",
                expected: `${row.apiTokens} within [${lower}, ${upper}]`,
                actual: `${row.apiTokens}`,
                message: `${row.sampleId}: the inverted band does not bracket the reported count`,
              });
        }),
    ));

  test("countOf clamps a computed negative to zero", () =>
    check(tokenCountValue(countOf(-3)), toBe(0)));
});
