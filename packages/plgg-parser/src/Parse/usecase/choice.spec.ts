import {
  test,
  check,
  all,
  okThen,
  errThen,
  someThen,
  shouldBeNone,
  toBe,
  toHaveLength,
} from "plgg-test";
import {
  char,
  literal,
  digit,
} from "plgg-parser/Parse/usecase/primitive";
import {
  or,
  optional,
} from "plgg-parser/Parse/usecase/choice";
import { run } from "plgg-parser/Parse/usecase/run";

test("or returns the first matching alternative", () =>
  all([
    check(
      run(
        or(literal("if"), literal("else")),
        "if x",
        0,
      ),
      okThen(toBe("if")),
    ),
    check(
      run(
        or(literal("if"), literal("else")),
        "else y",
        0,
      ),
      okThen(toBe("else")),
    ),
  ]));

test("or aggregates every branch failure as siblings", () =>
  check(
    run(
      or(char("a"), char("b"), char("c")),
      "z",
      0,
    ),
    errThen((e) =>
      all([
        check(
          e.content.message,
          toBe(
            "no alternative matched (at position 0)",
          ),
        ),
        check(e.content.sibling, toHaveLength(3)),
      ]),
    ),
  ));

test("optional yields Some on match", () =>
  check(
    run(optional(digit), "7", 0),
    okThen(someThen(toBe("7"))),
  ));

test("optional yields None on miss, consuming nothing", () =>
  check(
    run(optional(digit), "x", 0),
    okThen(shouldBeNone()),
  ));
