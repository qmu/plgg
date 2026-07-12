import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchResult,
} from "plgg";
import {
  Sexp,
  sourcePos,
  sourceRange,
  boolExp,
  parseSexps,
} from "plgg-ir-syntax";
import {
  SemType,
  integerType,
  decimalType,
  stringType,
  booleanType,
  paramType,
  nominalType,
  semTypeEquals,
  formatSemType,
  isParamType,
} from "plgg-ir-language/domain/model/SemType";
import {
  SemDiagnostic,
  semMismatch,
  codeTypeMismatch,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Scope,
  binding,
  rootScope,
} from "plgg-ir-language/domain/model/Scope";
import {
  TypedExpr,
  typedExprType,
  isAppExpr,
} from "plgg-ir-language/domain/model/TypedExpr";
import {
  Language,
  defineOperator,
  fixedSignature,
} from "plgg-ir-language/domain/model/Language";
import { checkExprOf } from "plgg-ir-language/domain/usecase/checkExpr";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * The first parsed expression of a (valid) source; a
 * `true` literal when parsing fails, so helper misuse
 * surfaces as a test failure, not a throw.
 */
const firstExpr = (source: string): Sexp =>
  pipe(
    parseSexps(source),
    matchResult(
      (): Sexp => boolExp(true, at),
      (exprs: ReadonlyArray<Sexp>): Sexp =>
        exprs
          .slice(0, 1)
          .reduce<Sexp>(
            (_, e) => e,
            boolExp(true, at),
          ),
    ),
  );

/**
 * The money operand of the toy `*` rule, when the
 * rule applies.
 */
const moneyOperand = (
  args: ReadonlyArray<SemType>,
): Option<SemType> =>
  args.length === 2 &&
  args.slice(0, 1).every(isParamType) &&
  args
    .slice(1)
    .every((b) =>
      semTypeEquals(b)(nominalType("percentage")),
    )
    ? args
        .slice(0, 1)
        .reduce<Option<SemType>>(
          (_, a) => some(a),
          none(),
        )
    : none();

/**
 * The toy language: fixed-signature operators plus a
 * polymorphic money rule (`Money<C> × Percentage →
 * Money<C>`, design §8) written as plain branching —
 * no unification engine.
 */
const language: Language<never> = {
  forms: [],
  operators: [
    defineOperator(
      ">=",
      fixedSignature(
        [integerType, integerType],
        booleanType,
      ),
    ),
    defineOperator(
      "and",
      fixedSignature(
        [booleanType, booleanType],
        booleanType,
      ),
    ),
    defineOperator("=", (args, range) =>
      args.length === 2 &&
      args
        .slice(0, 1)
        .every((a) =>
          args
            .slice(1)
            .every((b) => semTypeEquals(a)(b)),
        )
        ? ok(booleanType)
        : err([
            semMismatch(
              codeTypeMismatch,
              "= requires two operands of the same type",
              range,
              "two equal types",
              args.map(formatSemType).join(" "),
            ),
          ]),
    ),
    defineOperator("*", (args, range) =>
      pipe(moneyOperand(args), (money) =>
        money.__tag === "Some"
          ? ok(money.content)
          : err([
              semMismatch(
                codeTypeMismatch,
                "* requires (money C) × percentage",
                range,
                "(money C) percentage",
                args.map(formatSemType).join(" "),
              ),
            ]),
      ),
    ),
  ],
  expanders: [],
  normalizers: [],
};

const scope: Scope = rootScope([
  binding("field", "age", some(integerType), at),
  binding(
    "field",
    "subtotal",
    some(paramType("money", ["JPY"])),
    at,
  ),
  binding(
    "field",
    "total-usd",
    some(paramType("money", ["USD"])),
    at,
  ),
  binding(
    "field",
    "tax-rate",
    some(nominalType("percentage")),
    at,
  ),
  binding("view", "client-list", none(), at),
]);

/**
 * Checks one parsed expression against the toy
 * language and scope.
 */
const checked = (source: string) =>
  checkExprOf(language)(firstExpr(source), scope);

test("literals type themselves", () =>
  all([
    check(
      checked("18"),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(integerType),
        ),
      ),
    ),
    check(
      checked("1.5"),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(decimalType),
        ),
      ),
    ),
    check(
      checked('"hi"'),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(stringType),
        ),
      ),
    ),
    check(
      checked("true"),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(booleanType),
        ),
      ),
    ),
  ]));

test("symbols resolve to typed references", () =>
  check(
    checked("age"),
    okThen((e: TypedExpr) =>
      check(
        typedExprType(e),
        toEqual(integerType),
      ),
    ),
  ));

test("an unknown name is a compile error", () =>
  check(
    checked("salary"),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.unknown-name"]),
        ),
    ),
  ));

test("an untyped binding cannot appear in an expression", () =>
  check(
    checked("client-list"),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.untyped-reference"]),
        ),
    ),
  ));

test("operator applications type-check (design §8)", () =>
  all([
    check(
      checked("(>= age 18)"),
      okThen((e: TypedExpr) =>
        all([
          check(isAppExpr(e), toBe(true)),
          check(
            typedExprType(e),
            toEqual(booleanType),
          ),
        ]),
      ),
    ),
    check(
      checked("(and (>= age 18) true)"),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(booleanType),
        ),
      ),
    ),
  ]));

test("(>= name 18)-style mismatches report expected/actual", () =>
  check(
    checked('(>= "x" 18)'),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => [d.code, d.message]),
          toEqual([
            [
              "language.type-mismatch",
              "operand 1: expected integer but found string",
            ],
          ]),
        ),
    ),
  ));

test("nominal/parameterized domain types stay distinct in =", () =>
  all([
    check(
      checked("(= subtotal subtotal)"),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(booleanType),
        ),
      ),
    ),
    // Money<JPY> vs Money<USD> is rejected (§8)
    check(
      checked("(= subtotal total-usd)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.type-mismatch"]),
          ),
      ),
    ),
  ]));

test("a polymorphic money rule preserves the currency", () =>
  all([
    check(
      checked("(* subtotal tax-rate)"),
      okThen((e: TypedExpr) =>
        check(
          typedExprType(e),
          toEqual(paramType("money", ["JPY"])),
        ),
      ),
    ),
    check(
      checked("(* age tax-rate)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.type-mismatch"]),
          ),
      ),
    ),
  ]));

test("unknown operators are compile errors", () =>
  check(
    checked("(xor true true)"),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.unknown-operator"]),
        ),
    ),
  ));

test("an expression list needs an operator-symbol head", () =>
  all([
    check(
      checked("()"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual([
              "language.invalid-expression",
            ]),
          ),
      ),
    ),
    check(
      checked("(18 age)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual([
              "language.invalid-expression",
            ]),
          ),
      ),
    ),
  ]));

test("diagnostics accumulate across every operand", () =>
  check(
    checked("(and salary missing)"),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual([
            "language.unknown-name",
            "language.unknown-name",
          ]),
        ),
    ),
  ));
