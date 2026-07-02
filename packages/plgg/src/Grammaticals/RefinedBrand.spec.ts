import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  Box,
  Result,
  refinedBrand,
  box,
  matchResult,
} from "plgg/index";

const even = refinedBrand<"Even", number, string>(
  "Even",
  (v): v is number =>
    typeof v === "number" && v % 2 === 0,
  (v) => `not even: ${String(v)}`,
);

const fold = (
  r: Result<Box<"Even", number>, string>,
): string =>
  matchResult<Box<"Even", number>, string, string>(
    (e) => `err:${e}`,
    (v) => `ok:${v.content}`,
  )(r);

test("as accepts a bare qualifying value", () =>
  check(fold(even.as(4)), toBe("ok:4")));

test("as accepts an already-branded value", () =>
  check(
    fold(even.as(box("Even")(6))),
    toBe("ok:6"),
  ));

test("as rejects a non-qualifying value", () =>
  check(
    fold(even.as(3)),
    toBe("err:not even: 3"),
  ));

test("is guards a qualifying brand", () =>
  all([
    check(even.is(box("Even")(2)), toBe(true)),
    check(even.is(box("Even")(3)), toBe(false)),
    check(even.is(2), toBe(false)),
    check(even.is("x"), toBe(false)),
  ]));

test("unwrap returns the content", () =>
  check(even.unwrap(box("Even")(8)), toBe(8)));
