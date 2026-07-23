import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import {
  isVec,
  asVec,
  asVecOf,
  asNum,
  mapVec,
  pipe,
  foldrVec,
  foldlVec,
} from "plgg/index";

test("Vec.is should return true for vectors", () =>
  all([
    check(isVec([]), toBe(true)),
    check(isVec([1, 2, 3]), toBe(true)),
    check(isVec(["a", "b", "c"]), toBe(true)),
    check(
      isVec([1, "a", true, null]),
      toBe(true),
    ),
    check(isVec(new Array(5)), toBe(true)),
    check(
      isVec(Array.from({ length: 3 })),
      toBe(true),
    ),
  ]));

test("Vec.is should return false for non-vectors", () =>
  all([
    check(isVec(null), toBe(false)),
    check(isVec(undefined), toBe(false)),
    check(isVec({}), toBe(false)),
    check(isVec("vector"), toBe(false)),
    check(isVec(123), toBe(false)),
    check(isVec(true), toBe(false)),
    check(isVec({ length: 0 }), toBe(false)),
    check(isVec(""), toBe(false)),
  ]));

test("Vec.cast should succeed for vectors", () =>
  all([
    check(asVec([]), okThen(toEqual([]))),
    check(
      asVec([1, 2, 3]),
      okThen(toEqual([1, 2, 3])),
    ),
    check(
      asVec(["a", "b", "c"]),
      okThen(toEqual(["a", "b", "c"])),
    ),
    check(
      asVec([1, "a", true, null]),
      okThen(toEqual([1, "a", true, null])),
    ),
  ]));

test("Vec.cast should fail for non-vectors", () =>
  all([
    check(
      asVec(null),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asVec(undefined),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asVec({}),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asVec("vector"),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asVec(123),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
  ]));

test("Vec Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapVec(double));
  const r2 = pipe([1, 2, 3], mapVec(double));
  const r3 = pipe([1, 2, 3], mapVec(toString));

  return all([
    check(r1, toEqual([])),
    check(r2, toEqual([2, 4, 6])),
    check(r3, toEqual(["1", "2", "3"])),
  ]);
});

test("Vec Functor Laws - Identity", () => {
  const vec = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(vec, mapVec(identity));

  return check(r1, toEqual(vec));
});

test("Vec Functor Laws - Composition", () => {
  const vec = [1, 2, 3];
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    vec,
    mapVec((x: number) => g(f(x))),
  );
  const r2 = pipe(vec, mapVec(f), mapVec(g));

  return check(r1, toEqual(r2));
});

test("Vec Foldable - foldr function", () => {
  const add = (x: number, acc: number) => x + acc;
  const concat = (x: string, acc: string) =>
    x + acc;

  const r1 = pipe([], foldrVec(add)(0));
  const r2 = pipe([1, 2, 3], foldrVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldrVec(concat)(""),
  );

  return all([
    check(r1, toBe(0)),
    check(r2, toBe(6)),
    check(r3, toBe("abc")),
  ]);
});

test("Vec Foldable - foldl function", () => {
  const add = (acc: number, x: number) => acc + x;
  const concat = (acc: string, x: string) =>
    acc + x;

  const r1 = pipe([], foldlVec(add)(0));
  const r2 = pipe([1, 2, 3], foldlVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldlVec(concat)(""),
  );

  return all([
    check(r1, toBe(0)),
    check(r2, toBe(6)),
    check(r3, toBe("abc")),
  ]);
});

test("asVecOf validates each element", () => {
  const result = asVecOf(asNum)([1, 2, 3]);
  return check(result, okThen(toEqual([1, 2, 3])));
});

test("asVecOf fails when value is not a vector", () => {
  const result = asVecOf(asNum)("not-a-vector");
  return check(
    result,
    errThen((e) =>
      toBe("Value is not a vector")(
        e.content.message,
      ),
    ),
  );
});

test("asVecOf fails with index of bad element", () => {
  const result = asVecOf(asNum)([1, "bad", 3]);
  return check(
    result,
    errThen((e) =>
      toContain("Invalid element at index 1")(
        e.content.message,
      ),
    ),
  );
});

test("asVecOf accepts empty array", () => {
  const result = asVecOf(asNum)([]);
  return check(result, okThen(toEqual([])));
});
