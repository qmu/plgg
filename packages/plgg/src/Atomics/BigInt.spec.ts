import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  isBigInt,
  asBigInt,
  isErr,
  err,
  ok,
  invalidError,
} from "plgg/index";

test("isBigInt correctly identifies BigInt values", () =>
  all([
    // Valid BigInt values
    check(isBigInt(BigInt(123)), toBe(true)),
    check(isBigInt(BigInt(0)), toBe(true)),
    check(isBigInt(BigInt(-123)), toBe(true)),
    check(
      isBigInt(BigInt("9007199254740991")),
      toBe(true),
    ),
    check(
      isBigInt(BigInt("-9007199254740991")),
      toBe(true),
    ),
    check(
      isBigInt(
        BigInt("123456789012345678901234567890"),
      ),
      toBe(true),
    ),
    // Invalid types
    check(isBigInt(123), toBe(false)),
    check(isBigInt("123"), toBe(false)),
    check(isBigInt(true), toBe(false)),
    check(isBigInt(null), toBe(false)),
    check(isBigInt(undefined), toBe(false)),
    check(isBigInt({}), toBe(false)),
    check(isBigInt([]), toBe(false)),
    check(
      isBigInt(Symbol("test")),
      toBe(false),
    ),
    check(isBigInt(3.14), toBe(false)),
    check(isBigInt(Infinity), toBe(false)),
    check(isBigInt(NaN), toBe(false)),
  ]));

test("asBigInt validates and converts BigInt values", () =>
  all([
    // Direct BigInt values
    check(
      asBigInt(BigInt(123)),
      okThen(toBe(BigInt(123))),
    ),
    check(
      asBigInt(BigInt(0)),
      okThen(toBe(BigInt(0))),
    ),
    check(
      asBigInt(BigInt(-456)),
      okThen(toBe(BigInt(-456))),
    ),
    // Integer number conversion
    check(
      asBigInt(42),
      okThen(toBe(BigInt(42))),
    ),
    check(
      asBigInt(0),
      okThen(toBe(BigInt(0))),
    ),
    check(
      asBigInt(-789),
      okThen(toBe(BigInt(-789))),
    ),
    // String conversion
    check(
      asBigInt(
        "123456789012345678901234567890",
      ),
      okThen(
        toBe(
          BigInt(
            "123456789012345678901234567890",
          ),
        ),
      ),
    ),
    check(
      asBigInt("0"),
      okThen(toBe(BigInt(0))),
    ),
    // Invalid conversions
    check(
      asBigInt(3.14),
      errThen((e) =>
        toBe("Value is not a BigInt")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBigInt("not-a-number"),
      errThen((e) =>
        toBe("Value is not a valid BigInt")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBigInt(true),
      errThen((e) =>
        toBe("Value is not a BigInt")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBigInt(null),
      errThen((e) =>
        toBe("Value is not a BigInt")(
          e.content.message,
        ),
      ),
    ),
  ]));

test("asBigInt works in validation pipelines", () => {
  // Example: ID validation with business rules
  const validateUserId = (input: unknown) => {
    const bigIntResult = asBigInt(input);
    if (isErr(bigIntResult)) return bigIntResult;

    const userId = bigIntResult.content;
    if (userId < 1n) {
      return err(
        invalidError({
          message: "User ID must be positive",
        }),
      );
    }
    if (userId > BigInt("9999999999999999")) {
      return err(
        invalidError({
          message: "User ID too large",
        }),
      );
    }
    return ok(userId);
  };

  return all([
    check(
      validateUserId(BigInt(12345)),
      okThen(toBe(BigInt(12345))),
    ),
    check(
      validateUserId("9876543210"),
      okThen(toBe(BigInt("9876543210"))),
    ),
    check(
      validateUserId("not-a-number"),
      errThen((e) =>
        toBe("Value is not a valid BigInt")(
          e.content.message,
        ),
      ),
    ),
    check(
      validateUserId(BigInt(-1)),
      errThen((e) =>
        toBe("User ID must be positive")(
          e.content.message,
        ),
      ),
    ),
    check(
      validateUserId(
        BigInt("99999999999999999"),
      ),
      errThen((e) =>
        toBe("User ID too large")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("asBigInt handles large values beyond Number.MAX_SAFE_INTEGER", () =>
  all([
    // Example: Large integer values that exceed
    // JavaScript number precision
    check(
      asBigInt(
        "123456789012345678901234567890",
      ),
      okThen(
        toBe(
          BigInt(
            "123456789012345678901234567890",
          ),
        ),
      ),
    ),
    check(
      asBigInt(
        "-987654321098765432109876543210",
      ),
      okThen(
        toBe(
          BigInt(
            "-987654321098765432109876543210",
          ),
        ),
      ),
    ),
    // Converting from max safe integer boundaries
    check(
      asBigInt(Number.MAX_SAFE_INTEGER),
      okThen(
        toBe(BigInt(Number.MAX_SAFE_INTEGER)),
      ),
    ),
    check(
      asBigInt(Number.MIN_SAFE_INTEGER),
      okThen(
        toBe(BigInt(Number.MIN_SAFE_INTEGER)),
      ),
    ),
  ]));
