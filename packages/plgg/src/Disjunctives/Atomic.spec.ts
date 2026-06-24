import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  isAtomic,
  isJsonReadyAtomic,
  toJsonReadyAtomic,
  fromJsonReadyAtomic,
} from "plgg/index";

test("isAtomic recognizes primitive atomic values", () =>
  all([
    check(isAtomic(true), toBe(true)),
    check(isAtomic(42), toBe(true)),
    check(isAtomic(3.14), toBe(true)),
    check(isAtomic(42n), toBe(true)),
    check(isAtomic("hello"), toBe(true)),
    check(isAtomic(new Date()), toBe(true)),
    check(
      isAtomic(new Uint8Array([1, 2, 3])),
      toBe(true),
    ),
  ]));

test("isAtomic rejects non-atomic values", () =>
  all([
    check(isAtomic(null), toBe(false)),
    check(isAtomic(undefined), toBe(false)),
    check(isAtomic({}), toBe(false)),
    check(isAtomic([]), toBe(false)),
  ]));

test("toJsonReadyAtomic round-trips Bin via JsonReady", () => {
  const original = new Uint8Array([
    1, 2, 3, 4, 5,
  ]);
  const jsonReady = toJsonReadyAtomic(original);
  const restored = fromJsonReadyAtomic(jsonReady);
  return all([
    check(
      isJsonReadyAtomic(jsonReady),
      toBe(true),
    ),
    check(restored, toEqual(original)),
  ]);
});

test("toJsonReadyAtomic round-trips BigInt", () => {
  const original = 123456789012345678901234n;
  const jsonReady = toJsonReadyAtomic(original);
  const restored = fromJsonReadyAtomic(jsonReady);
  return check(restored, toEqual(original));
});

test("toJsonReadyAtomic round-trips Time", () => {
  const original = new Date(
    "2024-05-01T12:00:00.000Z",
  );
  const jsonReady = toJsonReadyAtomic(original);
  const restored = fromJsonReadyAtomic(jsonReady);
  return check(restored, toEqual(original));
});

test("toJsonReadyAtomic passes through primitives", () =>
  all([
    check(toJsonReadyAtomic(true), toBe(true)),
    check(toJsonReadyAtomic(42), toBe(42)),
    check(toJsonReadyAtomic("x"), toBe("x")),
  ]));

test("fromJsonReadyAtomic passes through primitives", () =>
  all([
    check(
      fromJsonReadyAtomic(false),
      toBe(false),
    ),
    check(fromJsonReadyAtomic(7), toBe(7)),
    check(fromJsonReadyAtomic("y"), toBe("y")),
  ]));
