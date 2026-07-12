import {
  test,
  check,
  all,
  toBe,
  toEqual,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test";
import {
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isListExp,
  listExp,
  parseSexps,
  printSexp,
  boolExp,
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  headOf,
  hasHead,
  isClause,
  clausesNamed,
  childrenOf,
  symbolArg,
  numberArg,
  exprArg,
} from "plgg-ir-manifest/domain/usecase/clause";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * The first parsed expression as a list (a `(true)`
 * dummy when parsing fails — surfaces as test
 * failure).
 */
const listOf = (source: string): ListExp =>
  pipe(
    parseSexps(source),
    matchResult(
      (): ReadonlyArray<Sexp> => [],
      (exprs: ReadonlyArray<Sexp>) => exprs,
    ),
  )
    .filter(isListExp)
    .reduce<ListExp>(
      (_, l) => l,
      listExp([boolExp(true, at)], at),
    );

test("headOf reads the head symbol", () =>
  all([
    check(
      pipe(
        headOf(listOf("(field name)")),
        matchOption(
          (): string => "",
          (h: SymbolExp) => h.content.name,
        ),
      ),
      toBe("field"),
    ),
    check(headOf(listOf("()")), shouldBeNone()),
    check(
      headOf(listOf("(1 2)")),
      shouldBeNone(),
    ),
  ]));

test("hasHead and isClause dispatch by head name", () =>
  all([
    check(
      hasHead("field")(listOf("(field a)")),
      toBe(true),
    ),
    check(
      hasHead("field")(listOf("(relation a)")),
      toBe(false),
    ),
    check(
      isClause("field")(listOf("(field a)")),
      toBe(true),
    ),
    check(
      isClause("field")(boolExp(true, at)),
      toBe(false),
    ),
  ]));

test("clausesNamed and childrenOf select children", () =>
  all([
    check(
      clausesNamed(
        listOf(
          "(entity e (field a) x (field b))",
        ),
        "field",
      ).map(printSexp),
      toEqual(["(field a)", "(field b)"]),
    ),
    check(
      childrenOf(listOf("(entity e x)")).length,
      toBe(2),
    ),
  ]));

test("argument selectors are positional and typed", () =>
  all([
    check(
      symbolArg(listOf("(field name)"), 1),
      shouldBeSome(),
    ),
    check(
      symbolArg(listOf("(field 42)"), 1),
      shouldBeNone(),
    ),
    check(
      symbolArg(listOf("(field)"), 1),
      shouldBeNone(),
    ),
    check(
      numberArg(listOf("(max-length 5)"), 1),
      shouldBeSome(),
    ),
    check(
      numberArg(listOf("(max-length x)"), 1),
      shouldBeNone(),
    ),
    check(
      exprArg(listOf("(invariant (a b))"), 1),
      shouldBeSome(),
    ),
    check(
      exprArg(listOf("(invariant)"), 1),
      shouldBeNone(),
    ),
  ]));
