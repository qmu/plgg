import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  sourcePos,
  sourceRange,
  numExp,
} from "plgg-ir-syntax";
import {
  integerType,
  booleanType,
  nominalType,
} from "plgg-ir-language/domain/model/SemType";
import {
  typedRef,
  litExpr,
  refExpr,
  appExpr,
  isLitExpr,
  isRefExpr,
  isAppExpr,
  typedExprType,
} from "plgg-ir-language/domain/model/TypedExpr";

const range = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(2, 1, 3),
);

const lit = litExpr(
  integerType,
  numExp(18, range),
);

const ref = refExpr(
  typedRef(
    "field",
    "age",
    nominalType("age-years"),
    range,
    range,
  ),
);

const app = appExpr(
  ">=",
  [lit, lit],
  booleanType,
  range,
);

test("constructors tag their variants", () =>
  all([
    check(isLitExpr(lit), toBe(true)),
    check(isRefExpr(ref), toBe(true)),
    check(isAppExpr(app), toBe(true)),
    check(isLitExpr(ref), toBe(false)),
    check(isRefExpr(app), toBe(false)),
    check(isAppExpr(lit), toBe(false)),
  ]));

test("typedExprType reads any variant's type", () =>
  all([
    check(
      typedExprType(lit),
      toEqual(integerType),
    ),
    check(
      typedExprType(ref),
      toEqual(nominalType("age-years")),
    ),
    check(
      typedExprType(app),
      toEqual(booleanType),
    ),
  ]));
