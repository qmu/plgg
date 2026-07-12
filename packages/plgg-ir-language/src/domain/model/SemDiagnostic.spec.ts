import {
  test,
  check,
  all,
  toBe,
  toEqual,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test";
import { pipe } from "plgg";
import {
  sourcePos,
  sourceRange,
  syntaxError,
} from "plgg-ir-syntax";
import {
  semError,
  semMismatch,
  withRelated,
  fromSyntaxDiagnostic,
  codeInvalidForm,
  codeUnknownForm,
  codeUnknownOperator,
  codeUnknownName,
  codeDuplicateName,
  codeArityMismatch,
  codeTypeMismatch,
  codeInvalidExpression,
  codeUntypedReference,
  codeExpansionDepth,
} from "plgg-ir-language/domain/model/SemDiagnostic";

const range = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(3, 1, 4),
);

test("semError builds a bare error diagnostic", () =>
  all([
    check(
      semError(codeUnknownName, "nope", range)
        .severity,
      toBe("error"),
    ),
    check(
      semError(codeUnknownName, "nope", range)
        .expected,
      shouldBeNone(),
    ),
    check(
      semError(codeUnknownName, "nope", range)
        .related,
      toEqual([]),
    ),
  ]));

test("semMismatch carries expected/actual context", () =>
  all([
    check(
      semMismatch(
        codeTypeMismatch,
        "expected integer but found string",
        range,
        "integer",
        "string",
      ).expected,
      shouldBeSome(),
    ),
    check(
      semMismatch(
        codeTypeMismatch,
        "m",
        range,
        "integer",
        "string",
      ).actual,
      shouldBeSome(),
    ),
  ]));

test("withRelated attaches related locations", () =>
  check(
    pipe(
      semError(codeDuplicateName, "dup", range),
      withRelated([
        {
          message: "first declared here",
          range,
        },
      ]),
    ).related,
    toEqual([
      { message: "first declared here", range },
    ]),
  ));

test("fromSyntaxDiagnostic lifts the syntax shape", () =>
  check(
    fromSyntaxDiagnostic(
      syntaxError(
        "syntax.unterminated-list",
        "open",
        range,
      ),
    ),
    toEqual(
      semError(
        "syntax.unterminated-list",
        "open",
        range,
      ),
    ),
  ));

test("diagnostic codes are stable machine identifiers", () =>
  all([
    check(
      codeInvalidForm,
      toBe("language.invalid-form"),
    ),
    check(
      codeUnknownForm,
      toBe("language.unknown-form"),
    ),
    check(
      codeUnknownOperator,
      toBe("language.unknown-operator"),
    ),
    check(
      codeUnknownName,
      toBe("language.unknown-name"),
    ),
    check(
      codeDuplicateName,
      toBe("language.duplicate-name"),
    ),
    check(
      codeArityMismatch,
      toBe("language.arity-mismatch"),
    ),
    check(
      codeTypeMismatch,
      toBe("language.type-mismatch"),
    ),
    check(
      codeInvalidExpression,
      toBe("language.invalid-expression"),
    ),
    check(
      codeUntypedReference,
      toBe("language.untyped-reference"),
    ),
    check(
      codeExpansionDepth,
      toBe("language.expansion-depth"),
    ),
  ]));
