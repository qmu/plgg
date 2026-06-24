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
  isReadonlyArray,
  asReadonlyArray,
  asNum,
  isErr,
} from "plgg/index";

test("isReadonlyArray and asReadonlyArray basic validation", () => {
  const result = asReadonlyArray(asNum)([1, 2, 3]);

  return all([
    check(
      isReadonlyArray([1, 2, 3]),
      toBe(true),
    ),
    check(isReadonlyArray([]), toBe(true)),
    check(isReadonlyArray("test"), toBe(false)),
    check(result, okThen(toEqual([1, 2, 3]))),
    check(
      isErr(
        asReadonlyArray(asNum)([
          "not",
          "numbers",
        ]),
      ),
      toBe(true),
    ),
  ]);
});

test("asReadonlyArray fails when value is not an array", () => {
  const result = asReadonlyArray(asNum)(
    "not an array",
  );
  return check(
    result,
    errThen((e) =>
      toBe("Value is not an array")(
        e.content.message,
      ),
    ),
  );
});

test("asReadonlyArray fails for null element", () => {
  const result = asReadonlyArray(asNum)([
    1,
    null,
    3,
  ]);
  return check(
    result,
    errThen((e) =>
      toContain("index 1 is undefined")(
        e.content.message,
      ),
    ),
  );
});

test("asReadonlyArray fails for undefined element", () => {
  const result = asReadonlyArray(asNum)([
    1,
    undefined,
    3,
  ]);
  return check(
    result,
    errThen((e) =>
      toContain("index 1 is undefined")(
        e.content.message,
      ),
    ),
  );
});

test("asReadonlyArray failure carries parent error", () => {
  const result = asReadonlyArray(asNum)([
    1,
    "no",
    3,
  ]);
  return check(
    result,
    errThen((e) =>
      all([
        check(
          e.content.message,
          toContain(
            "index 1 failed validation",
          ),
        ),
        check(
          e.content.sibling !== undefined,
          toBe(true),
        ),
      ]),
    ),
  );
});

test("asReadonlyArray succeeds on empty array", () => {
  const result = asReadonlyArray(asNum)([]);
  return check(result, okThen(toEqual([])));
});
