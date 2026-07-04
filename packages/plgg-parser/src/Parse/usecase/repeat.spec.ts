import {
  test,
  check,
  all,
  okThen,
  shouldBeErr,
  toEqual,
} from "plgg-test";
import {
  digit,
  char,
  succeed,
} from "plgg-parser/Parse/usecase/primitive";
import {
  many,
  many1,
  between,
  sepBy,
  sepBy1,
} from "plgg-parser/Parse/usecase/repeat";
import { run } from "plgg-parser/Parse/usecase/run";

test("many collects zero or more matches", () =>
  all([
    check(
      run(many(digit), "123x", 0),
      okThen(toEqual(["1", "2", "3"])),
    ),
    check(
      run(many(digit), "x", 0),
      okThen(toEqual([])),
    ),
  ]));

test("many stops on a zero-width success instead of looping", () =>
  check(
    run(many(succeed(0)), "abc", 0),
    okThen(toEqual([])),
  ));

test("many1 requires at least one match", () =>
  all([
    check(
      run(many1(digit), "12", 0),
      okThen(toEqual(["1", "2"])),
    ),
    check(
      run(many1(digit), "x", 0),
      shouldBeErr(),
    ),
  ]));

test("between frames an inner parser", () =>
  all([
    check(
      run(
        between(char("("), char(")"))(digit),
        "(7)",
        0,
      ),
      okThen(toEqual("7")),
    ),
    check(
      run(
        between(char("("), char(")"))(digit),
        "(7]",
        0,
      ),
      shouldBeErr(),
    ),
  ]));

test("sepBy1 parses one-or-more separated values", () =>
  all([
    check(
      run(sepBy1(char(","))(digit), "1,2,3", 0),
      okThen(toEqual(["1", "2", "3"])),
    ),
    check(
      run(sepBy1(char(","))(digit), "1", 0),
      okThen(toEqual(["1"])),
    ),
    check(
      run(sepBy1(char(","))(digit), "x", 0),
      shouldBeErr(),
    ),
  ]));

test("sepBy parses zero-or-more separated values", () =>
  all([
    check(
      run(sepBy(char(","))(digit), "1,2", 0),
      okThen(toEqual(["1", "2"])),
    ),
    check(
      run(sepBy(char(","))(digit), "x", 0),
      okThen(toEqual([])),
    ),
  ]));
