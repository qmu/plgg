import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  Num,
  isNum,
  asNum,
  pipe,
  cast,
  chainResult,
  refine,
} from "plgg/index";

test("isNum correctly identifies numeric values", () =>
  all([
    // Valid numbers
    check(isNum(123), toBe(true)),
    check(isNum(0), toBe(true)),
    check(isNum(-123), toBe(true)),
    check(isNum(3.14), toBe(true)),
    check(
      isNum(Number.MAX_SAFE_INTEGER),
      toBe(true),
    ),
    check(
      isNum(Number.MIN_SAFE_INTEGER),
      toBe(true),
    ),
    check(isNum(Infinity), toBe(true)),
    check(isNum(-Infinity), toBe(true)),
    check(isNum(NaN), toBe(true)),
    // BigInt values within safe range
    check(isNum(BigInt(123)), toBe(true)),
    check(
      isNum(BigInt(Number.MAX_SAFE_INTEGER)),
      toBe(true),
    ),
    check(
      isNum(BigInt(Number.MIN_SAFE_INTEGER)),
      toBe(true),
    ),
    // Invalid types
    check(isNum("123"), toBe(false)),
    check(isNum(true), toBe(false)),
    check(isNum(null), toBe(false)),
    check(isNum(undefined), toBe(false)),
    check(isNum({}), toBe(false)),
    check(isNum([]), toBe(false)),
    check(isNum(Symbol("test")), toBe(false)),
  ]));

test("asNum validates and converts numeric values", () =>
  all([
    // Example: Age validation
    check(asNum(25), okThen(toBe(25))),
    check(asNum(0), okThen(toBe(0))),
    check(asNum(-123), okThen(toBe(-123))),
    check(asNum(3.14), okThen(toBe(3.14))),
    // BigInt conversion
    check(asNum(BigInt(42)), okThen(toBe(42))),
    // Example: API response validation
    check(
      asNum("123"),
      errThen((e) =>
        toBe("Value is not a number")(
          e.content.message,
        ),
      ),
    ),
    check(
      asNum(true),
      errThen((e) =>
        toBe("Value is not a number")(
          e.content.message,
        ),
      ),
    ),
    check(
      asNum(null),
      errThen((e) =>
        toBe("Value is not a number")(
          e.content.message,
        ),
      ),
    ),
  ]));

test("asNum works in validation pipelines", () => {
  // Example: Price validation with business rules
  const validatePrice = (input: unknown) =>
    pipe(
      asNum(input),
      chainResult((price: Num) =>
        cast(
          price,
          refine(
            (x: Num) => x >= 0,
            "Price cannot be negative",
          ),
          refine(
            (x: Num) => x <= 10000,
            "Price too high",
          ),
        ),
      ),
    );

  return all([
    check(
      validatePrice(29.99),
      okThen(toBe(29.99)),
    ),
    check(
      validatePrice("not-a-number"),
      errThen((e) =>
        toBe("Value is not a number")(
          e.content.message,
        ),
      ),
    ),
    check(
      validatePrice(-5),
      errThen((e) =>
        toBe("Price cannot be negative")(
          e.content.message,
        ),
      ),
    ),
    check(
      validatePrice(15000),
      errThen((e) =>
        toBe("Price too high")(e.content.message),
      ),
    ),
  ]);
});

test("asNum handles special numeric values", () =>
  all([
    // Example: Mathematical operations that
    // might produce special values
    check(
      asNum(Infinity),
      okThen(toBe(Infinity)),
    ),
    check(
      asNum(-Infinity),
      okThen(toBe(-Infinity)),
    ),
    check(
      asNum(NaN),
      okThen((n) => toBe(true)(Number.isNaN(n))),
    ),
  ]));
