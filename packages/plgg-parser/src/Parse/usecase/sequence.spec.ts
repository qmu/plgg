import {
  test,
  check,
  all,
  okThen,
  shouldBeErr,
  toBe,
  toEqual,
} from "plgg-test";
import { SoftStr, pipe } from "plgg";
import {
  digit,
  letter,
  char,
  literal,
} from "plgg-parser/Parse/usecase/primitive";
import {
  map,
  andThen,
  seq,
  left,
  right,
} from "plgg-parser/Parse/usecase/sequence";
import { run } from "plgg-parser/Parse/usecase/run";

test("map transforms the result value", () =>
  check(
    run(
      pipe(
        digit,
        map((c: SoftStr): number => Number(c)),
      ),
      "5",
      0,
    ),
    okThen(toBe(5)),
  ));

test("andThen chooses the next parser from the value", () =>
  all([
    check(
      run(
        pipe(
          letter,
          andThen((c: SoftStr) =>
            c === "x" ? digit : letter,
          ),
        ),
        "x9",
        0,
      ),
      okThen(toBe("9")),
    ),
    check(
      run(
        pipe(
          letter,
          andThen((c: SoftStr) =>
            c === "x" ? digit : letter,
          ),
        ),
        "yz",
        0,
      ),
      okThen(toBe("z")),
    ),
  ]));

test("andThen short-circuits when the first parser fails", () =>
  check(
    run(
      pipe(
        letter,
        andThen(() => digit),
      ),
      "1",
      0,
    ),
    shouldBeErr(),
  ));

test("seq threads state and collects values", () =>
  check(
    run(
      seq([literal("a"), literal("b")]),
      "abc",
      0,
    ),
    okThen(toEqual(["a", "b"])),
  ));

test("seq of nothing yields an empty array", () =>
  check(
    run(seq<SoftStr, number>([]), "abc", 0),
    okThen(toEqual([])),
  ));

test("seq short-circuits on the first failure", () =>
  check(
    run(
      seq([literal("a"), literal("b")]),
      "axc",
      0,
    ),
    shouldBeErr(),
  ));

test("right keeps the second value, left keeps the first", () =>
  all([
    check(
      run(right(char("("), digit), "(7", 0),
      okThen(toBe("7")),
    ),
    check(
      run(left(digit, char(")")), "7)", 0),
      okThen(toBe("7")),
    ),
    check(
      run(left(digit, char(")")), "7x", 0),
      shouldBeErr(),
    ),
  ]));
