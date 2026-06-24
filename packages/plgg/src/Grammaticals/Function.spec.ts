import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { isFunc, asFunc } from "plgg/index";
import type {
  Func,
  InvalidError,
} from "plgg/index";

test("isFunc basic validation", () =>
  all([
    check(isFunc(() => {}), toBe(true)),
    check(isFunc(function () {}), toBe(true)),
    check(
      isFunc((x: number) => x + 1),
      toBe(true),
    ),
    check(isFunc("not a function"), toBe(false)),
    check(isFunc(123), toBe(false)),
    check(isFunc(null), toBe(false)),
  ]));

test("asFunc returns Ok for functions", () => {
  const fn = (x: number) => x * 2;
  return check(
    asFunc(fn),
    okThen((f: Func) =>
      all([
        check(f, toBe(fn)),
        check(f(3), toBe(6)),
      ]),
    ),
  );
});

test("asFunc returns Err for non-function values", () => {
  const cases = [
    42,
    "string",
    null,
    undefined,
    {},
    [],
    true,
  ];
  return all(
    cases.map((value) =>
      check(
        asFunc(value),
        errThen((e: InvalidError) =>
          toBe("Value is not a function")(
            e.content.message,
          ),
        ),
      ),
    ),
  );
});
