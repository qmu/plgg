import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import { sourceRange } from "plgg-ir-syntax/domain/model/SourceRange";
import {
  syntaxError,
  codeUnexpectedCharacter,
  codeUnterminatedString,
  codeInvalidEscape,
  codeInvalidNumber,
  codeUnterminatedList,
  codeUnexpectedCloseParen,
} from "plgg-ir-syntax/domain/model/SyntaxDiagnostic";

const range = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

test("syntaxError builds an error-severity diagnostic", () =>
  check(
    syntaxError(
      codeUnexpectedCharacter,
      "unexpected character",
      range,
    ),
    toEqual({
      code: "syntax.unexpected-character",
      severity: "error",
      message: "unexpected character",
      range,
    }),
  ));

test("diagnostic codes are stable machine identifiers", () =>
  all([
    check(
      codeUnexpectedCharacter,
      toBe("syntax.unexpected-character"),
    ),
    check(
      codeUnterminatedString,
      toBe("syntax.unterminated-string"),
    ),
    check(
      codeInvalidEscape,
      toBe("syntax.invalid-escape"),
    ),
    check(
      codeInvalidNumber,
      toBe("syntax.invalid-number"),
    ),
    check(
      codeUnterminatedList,
      toBe("syntax.unterminated-list"),
    ),
    check(
      codeUnexpectedCloseParen,
      toBe("syntax.unexpected-close-paren"),
    ),
  ]));
