import {
  test,
  check,
  all,
  okThen,
  toBe,
} from "plgg-test";
import { SoftStr, pipe } from "plgg";
import {
  char,
  digit,
} from "plgg-parser/Parse/usecase/primitive";
import { or } from "plgg-parser/Parse/usecase/choice";
import {
  right,
  map,
} from "plgg-parser/Parse/usecase/sequence";
import {
  many,
  between,
} from "plgg-parser/Parse/usecase/repeat";
import {
  lazy,
  getUserState,
  setUserState,
} from "plgg-parser/Parse/usecase/context";
import { Parser } from "plgg-parser/Parse/model/Parser";
import { run } from "plgg-parser/Parse/usecase/run";

test("getUserState reads the threaded context", () =>
  check(
    run(getUserState, "abc", 99),
    okThen(toBe(99)),
  ));

test("setUserState updates context for later parsers", () =>
  check(
    run(
      right(
        setUserState((n: number) => n + 1),
        getUserState,
      ),
      "abc",
      0,
    ),
    okThen(toBe(1)),
  ));

test("threaded state accumulates across a run", () =>
  check(
    run(
      right(
        many(
          right(
            digit,
            setUserState((n: number) => n + 1),
          ),
        ),
        getUserState,
      ),
      "123",
      0,
    ),
    // three digits each bumped the threaded counter
    okThen(toBe(3)),
  ));

test("lazy enables a recursive grammar", () => {
  // nested-parens depth: "(((0)))" -> 3. S is pinned to
  // `number` on each branch so the S-polymorphic primitives
  // unify with the fixed-S recursive reference.
  const nested: Parser<number, number> = pipe(
    between<SoftStr, SoftStr, number>(
      char("("),
      char(")"),
    )(lazy(() => depth)),
    map((inner: number): number => inner + 1),
  );
  // Pin the S-polymorphic primitive to the concrete state
  // type by direct assignment, then compose from there.
  const digitN: Parser<SoftStr, number> = digit;
  const base: Parser<number, number> = pipe(
    digitN,
    map((): number => 0),
  );
  const depth: Parser<number, number> = or(
    nested,
    base,
  );
  return all([
    check(
      run(depth, "(((0)))", 0),
      okThen(toBe(3)),
    ),
    check(run(depth, "0", 0), okThen(toBe(0))),
  ]);
});
