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
  lParenTok,
  rParenTok,
  symbolTok,
  strTok,
  numTok,
  boolTok,
  isLParenTok,
  isRParenTok,
  tokenRange,
} from "plgg-ir-syntax/domain/model/Token";

const range = sourceRange(
  sourcePos(3, 1, 4),
  sourcePos(4, 1, 5),
);

test("paren guards identify their variants", () =>
  all([
    check(
      isLParenTok(lParenTok(range)),
      toBe(true),
    ),
    check(
      isLParenTok(rParenTok(range)),
      toBe(false),
    ),
    check(
      isRParenTok(rParenTok(range)),
      toBe(true),
    ),
    check(
      isRParenTok(symbolTok("a", range)),
      toBe(false),
    ),
  ]));

test("tokenRange reads any variant's range", () =>
  all([
    check(
      tokenRange(lParenTok(range)),
      toEqual(range),
    ),
    check(
      tokenRange(rParenTok(range)),
      toEqual(range),
    ),
    check(
      tokenRange(symbolTok("entity", range)),
      toEqual(range),
    ),
    check(
      tokenRange(strTok("s", range)),
      toEqual(range),
    ),
    check(
      tokenRange(numTok(1, range)),
      toEqual(range),
    ),
    check(
      tokenRange(boolTok(false, range)),
      toEqual(range),
    ),
  ]));
