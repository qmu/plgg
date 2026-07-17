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
import {
  SAMPLES,
  FAMILIES,
  SAMPLES_VERSION,
  ACCURACY_TARGET_PCT,
} from "plgg-token-metering/testkit/article";

const encoder = new TextEncoder();

const utf8Length = (text: string): number =>
  encoder.encode(text).length;

const countOfClass = (
  textClass: string,
): number =>
  SAMPLES.filter(
    (sample) => sample.textClass === textClass,
  ).length;

const countOfRole = (role: string): number =>
  SAMPLES.filter((sample) => sample.role === role)
    .length;

/**
 * Proves the fixture is a faithful copy of the published manifest.
 *
 * The article recorded `chars` and `utf8Bytes` for every sample. Those numbers
 * are copied here as DATA and are not recomputed, so measuring the copied text
 * and comparing against them is an independent check that the text itself
 * survived the copy intact.
 *
 * Not hypothetical: while this fixture was being built, an extraction step
 * silently rewrote `export const` inside the body of `code-01` and the text came
 * out 197 characters against the article's recorded 204. This comparison is what
 * caught it. A fixture that only agreed with itself would have shipped the
 * corrupted sample and quietly mis-measured the whole code class.
 */
describe("article fixture", () => {
  test("carries the pinned manifest version and target", () =>
    all([
      check(SAMPLES_VERSION, toBe("tm-v1")),
      check(ACCURACY_TARGET_PCT, toBe(5)),
    ]));

  test("holds 30 samples, 10 per class", () =>
    all([
      check(SAMPLES.length, toBe(30)),
      check(countOfClass("english"), toBe(10)),
      check(countOfClass("japanese"), toBe(10)),
      check(countOfClass("code"), toBe(10)),
    ]));

  test("splits the manifest half calibration, half holdout", () =>
    all([
      check(countOfRole("holdout"), toBe(15)),
      check(countOfRole("calibration"), toBe(15)),
    ]));

  test("every sample text measures the article's recorded chars and utf8Bytes", () =>
    all(
      (FAMILIES[0]?.rows ?? []).map(
        (row): Assertion => {
          const sample = SAMPLES.find(
            (candidate) =>
              candidate.id === row.sampleId,
          );
          return sample === undefined
            ? fail({
                matcher: "articleSample",
                expected: `a fixture sample for ${row.sampleId}`,
                actual: "undefined",
                message: `the article measured ${row.sampleId} but the fixture has no such sample`,
              })
            : all([
                check(
                  sample.text.length,
                  toBe(row.chars),
                ),
                check(
                  utf8Length(sample.text),
                  toBe(row.utf8Bytes),
                ),
                check(
                  sample.textClass,
                  toBe(row.textClass),
                ),
                check(
                  sample.role,
                  toBe(row.role),
                ),
              ]);
        },
      ),
    ));

  test("records the same 30 sample ids for every family", () =>
    all(
      FAMILIES.map((family): Assertion =>
        check(
          family.rows
            .map((row) => row.sampleId)
            .sort()
            .join(","),
          toBe(
            SAMPLES.map((sample) => sample.id)
              .sort()
              .join(","),
          ),
        ),
      ),
    ));

  test("the article's own errorPct agrees with its own recorded counts", () =>
    all(
      FAMILIES.flatMap((family) =>
        family.rows.map((row): Assertion => {
          const derived =
            (100 *
              (row.predictedTokens -
                row.apiTokens)) /
            row.apiTokens;
          return Math.abs(
            derived - row.errorPct,
          ) < 0.01
            ? pass(row.sampleId)
            : fail({
                matcher: "errorPct",
                expected: `${row.errorPct}`,
                actual: `${derived}`,
                message: `${family.familyId}/${row.sampleId}: recorded errorPct disagrees with recorded counts`,
              });
        }),
      ),
    ));
});
