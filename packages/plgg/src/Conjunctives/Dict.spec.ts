import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
} from "plgg-test";
import { asDictOf, asNum, isErr } from "plgg/index";

test("asDictOf basic validation", () => {
  const result = asDictOf(asNum)({ a: 1, b: 2 });

  return all([
    check(
      result,
      okThen(toEqual({ a: 1, b: 2 })),
    ),
    check(
      isErr(
        asDictOf(asNum)({
          a: "not",
          b: "numbers",
        }),
      ),
      toBe(true),
    ),
    check(
      isErr(asDictOf(asNum)([])),
      toBe(true),
    ),
  ]);
});
