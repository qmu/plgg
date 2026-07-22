import {
  test,
  check,
  all,
  toBe,
  toEqual,
  Assertion,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import { compileThesis } from "plgg-ir-thesis";
import {
  COMPLETE_SEVERING,
  DOCTORED_SEVERING,
  COMPLETE_COVERAGE,
  DOCTORED_COVERAGE,
} from "plgg-ir-thesis-proof/domain/model/examples/rebuttal";

/**
 * `accept` when the full evaluator compiles `source`,
 * otherwise `reject` — collapsing the compile Result to a
 * verdict tag the fixtures assert on.
 */
const verdict = (source: string): Assertion =>
  pipe(
    compileThesis(source),
    matchResult(
      (): Assertion =>
        check("reject", toBe("accept")),
      (): Assertion =>
        check("accept", toBe("accept")),
    ),
  );

/**
 * The diagnostics of a refused compile (empty when the
 * evaluator accepts — the fixtures below never hit that).
 */
const rejectionOf = (
  source: string,
): ReadonlyArray<SemDiagnostic> =>
  pipe(
    compileThesis(source),
    matchResult(
      (
        diags: ReadonlyArray<SemDiagnostic>,
      ): ReadonlyArray<SemDiagnostic> => diags,
      (): ReadonlyArray<SemDiagnostic> => [],
    ),
  );

test("遮断: the evaluator accepts the complete rebuttal", () =>
  verdict(COMPLETE_SEVERING));

test("被覆: the evaluator accepts the complete rebuttal", () =>
  verdict(COMPLETE_COVERAGE));

test("遮断: the evaluator refuses the doctored rebuttal with the surviving path 競合参入 →r3→ 撤退判断", () =>
  pipe(rejectionOf(DOCTORED_SEVERING), (diags) =>
    all([
      check(
        diags.map((d) => d.code),
        toEqual(["thesis.severing-survives"]),
      ),
      check(
        diags.map((d) =>
          d.message.includes(
            "競合参入 →r3→ 撤退判断",
          ),
        ),
        toEqual([true]),
      ),
    ]),
  ));

test("被覆: the evaluator refuses the doctored rebuttal, naming the unattacked relation r3", () =>
  pipe(rejectionOf(DOCTORED_COVERAGE), (diags) =>
    all([
      check(
        diags.map((d) => d.code),
        toEqual(["thesis.coverage-gap"]),
      ),
      check(
        diags.map((d) =>
          d.message.includes("r3"),
        ),
        toEqual([true]),
      ),
    ]),
  ));
