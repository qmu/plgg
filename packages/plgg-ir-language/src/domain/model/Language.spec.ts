import {
  test,
  check,
  all,
  toEqual,
  okThen,
  errThen,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test";
import { ok, err } from "plgg";
import {
  sourcePos,
  sourceRange,
  symbolExp,
} from "plgg-ir-syntax";
import {
  integerType,
  decimalType,
  booleanType,
  SemType,
} from "plgg-ir-language/domain/model/SemType";
import { SemDiagnostic } from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  defineOperator,
  fixedSignature,
  declaresNothing,
  findForm,
  findOperator,
  findExpander,
  Language,
} from "plgg-ir-language/domain/model/Language";

const range = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(8, 1, 9),
);

const gte = defineOperator(
  ">=",
  fixedSignature(
    [integerType, integerType],
    booleanType,
  ),
);

test("fixedSignature accepts matching operands", () =>
  check(
    gte.check([integerType, integerType], range),
    okThen((t: SemType) =>
      check(t, toEqual(booleanType)),
    ),
  ));

test("fixedSignature widens integer to decimal", () =>
  check(
    defineOperator(
      "avg",
      fixedSignature(
        [decimalType, decimalType],
        decimalType,
      ),
    ).check([integerType, decimalType], range),
    okThen((t: SemType) =>
      check(t, toEqual(decimalType)),
    ),
  ));

test("fixedSignature rejects wrong arity with expected/actual", () =>
  check(
    gte.check([integerType], range),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.arity-mismatch"]),
        ),
    ),
  ));

test("fixedSignature accumulates every operand mismatch", () =>
  check(
    gte.check([booleanType, decimalType], range),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        all([
          check(
            diags.map((d) => d.code),
            toEqual([
              "language.type-mismatch",
              "language.type-mismatch",
            ]),
          ),
          check(
            diags
              .slice(0, 1)
              .map((d) => d.message),
            toEqual([
              "operand 1: expected integer but found boolean",
            ]),
          ),
        ]),
    ),
  ));

test("declaresNothing binds nothing", () =>
  check(
    declaresNothing(),
    okThen((bs) => check(bs, toEqual([]))),
  ));

test("registry lookups find by name", () => {
  const language: Language<never> = {
    forms: [
      {
        name: "def",
        declare: declaresNothing,
        analyze: () => err([]),
      },
    ],
    operators: [gte],
    expanders: [
      {
        name: "flag",
        apply: () =>
          ok(symbolExp("expanded", range)),
      },
    ],
    normalizers: [],
  };
  return all([
    check(
      findForm(language, "def"),
      shouldBeSome(),
    ),
    check(
      findForm(language, "missing"),
      shouldBeNone(),
    ),
    check(
      findOperator(language, ">="),
      shouldBeSome(),
    ),
    check(
      findOperator(language, "missing"),
      shouldBeNone(),
    ),
    check(
      findExpander(language, "flag"),
      shouldBeSome(),
    ),
    check(
      findExpander(language, "missing"),
      shouldBeNone(),
    ),
  ]);
});
