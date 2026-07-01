import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  isDatum,
  isDatumCore,
  some,
  none,
  createNominalDatum,
} from "plgg/index";

test("isDatum accepts core atomic values", () =>
  all([
    check(isDatum(1), toBe(true)),
    check(isDatum("hello"), toBe(true)),
    check(isDatum(true), toBe(true)),
    check(isDatum(42n), toBe(true)),
    check(isDatum(new Date()), toBe(true)),
  ]));

test("isDatum accepts plain objects of data", () =>
  all([
    check(isDatum({}), toBe(true)),
    check(isDatum({ a: 1, b: "x" }), toBe(true)),
  ]));

test("isDatum accepts arrays of data", () =>
  all([
    check(isDatum([1, 2, 3]), toBe(true)),
    check(isDatum([]), toBe(true)),
  ]));

test("isDatum accepts Optional datum wrappers", () =>
  all([
    check(isDatum(none()), toBe(true)),
    check(isDatum(some(1)), toBe(true)),
    check(isDatum(some("hello")), toBe(true)),
    check(isDatum(some({ a: 1 })), toBe(true)),
  ]));

test("isDatum accepts Nominal datum wrappers", () => {
  const nominal = createNominalDatum(
    "UserId",
    "abc",
  );
  return check(isDatum(nominal), toBe(true));
});

test("isDatum rejects Some with non-datum content", () => {
  const fn = () => 1;
  return check(isDatum(some(fn)), toBe(false));
});

test("isDatum rejects non-datum values", () => {
  const fn = () => 1;
  return all([
    check(isDatum(fn), toBe(false)),
    check(isDatum(Symbol("x")), toBe(false)),
  ]);
});

test("isDatumCore accepts plain shapes", () =>
  all([
    check(
      isDatumCore({ a: 1, b: "hello" }),
      toBe(true),
    ),
    check(isDatumCore([1, 2, 3]), toBe(true)),
  ]));

test("isDatumCore rejects functions", () => {
  const fn = () => 1;
  return check(isDatumCore(fn), toBe(false));
});
