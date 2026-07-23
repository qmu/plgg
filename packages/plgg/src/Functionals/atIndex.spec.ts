import {
  test,
  check,
  toBe,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { atIndex, isErr } from "plgg/index";

test("atIndex returns Ok with element at valid index", () =>
  check(
    atIndex(1)([10, 20, 30]),
    okThen(toBe(20)),
  ));

test("atIndex returns Ok at the first index", () =>
  check(
    atIndex(0)(["a", "b"]),
    okThen(toBe("a")),
  ));

test("atIndex returns Err for negative index", () =>
  check(
    atIndex(-1)([1, 2, 3]),
    errThen((e) =>
      toContain("Cannot access index -1")(
        e.content.message,
      ),
    ),
  ));

test("atIndex returns Err for out-of-bounds index", () =>
  check(
    atIndex(5)([1, 2, 3]),
    errThen((e) =>
      toContain("Cannot access index 5")(
        e.content.message,
      ),
    ),
  ));

test("atIndex returns Err for non-array value", () =>
  check(
    atIndex(0)("not-an-array"),
    errThen((e) =>
      toContain("Cannot access index 0")(
        e.content.message,
      ),
    ),
  ));

test("atIndex returns Err for null", () =>
  check(isErr(atIndex(0)(null)), toBe(true)));
