import { test, expect, assert } from "vitest";
import {
  isBigInt,
  asBigInt,
  isOk,
  isErr,
} from "plgg/index";

test("isBigInt correctly identifies BigInt values", () => {
  // Valid BigInt values
  expect(isBigInt(BigInt(123))).toBe(true);
  expect(isBigInt(BigInt(0))).toBe(true);
  expect(isBigInt(BigInt(-123))).toBe(true);
  expect(
    isBigInt(BigInt("9007199254740991")),
  ).toBe(true);
  expect(
    isBigInt(BigInt("-9007199254740991")),
  ).toBe(true);
  expect(
    isBigInt(
      BigInt("123456789012345678901234567890"),
    ),
  ).toBe(true);

  // Invalid types
  expect(isBigInt(123)).toBe(false);
  expect(isBigInt("123")).toBe(false);
  expect(isBigInt(true)).toBe(false);
  expect(isBigInt(null)).toBe(false);
  expect(isBigInt(undefined)).toBe(false);
  expect(isBigInt({})).toBe(false);
  expect(isBigInt([])).toBe(false);
  expect(isBigInt(Symbol("test"))).toBe(false);
  expect(isBigInt(3.14)).toBe(false);
  expect(isBigInt(Infinity)).toBe(false);
  expect(isBigInt(NaN)).toBe(false);
});

test("asBigInt validates and converts BigInt values", () => {
  // Direct BigInt values
  const validBigInt = asBigInt(BigInt(123));
  assert(isOk(validBigInt));
  expect(validBigInt.body).toBe(BigInt(123));

  const zeroBigInt = asBigInt(BigInt(0));
  assert(isOk(zeroBigInt));
  expect(zeroBigInt.body).toBe(BigInt(0));

  const negativeBigInt = asBigInt(BigInt(-456));
  assert(isOk(negativeBigInt));
  expect(negativeBigInt.body).toBe(BigInt(-456));

  // Integer number conversion
  const integerValue = asBigInt(42);
  assert(isOk(integerValue));
  expect(integerValue.body).toBe(BigInt(42));

  const zeroValue = asBigInt(0);
  assert(isOk(zeroValue));
  expect(zeroValue.body).toBe(BigInt(0));

  const negativeIntValue = asBigInt(-789);
  assert(isOk(negativeIntValue));
  expect(negativeIntValue.body).toBe(
    BigInt(-789),
  );

  // String conversion
  const stringValue = asBigInt(
    "123456789012345678901234567890",
  );
  assert(isOk(stringValue));
  expect(stringValue.body).toBe(
    BigInt("123456789012345678901234567890"),
  );

  const stringZero = asBigInt("0");
  assert(isOk(stringZero));
  expect(stringZero.body).toBe(BigInt(0));

  // Invalid conversions
  const floatValue = asBigInt(3.14);
  assert(isErr(floatValue));
  expect(floatValue.body.message).toBe(
    "Value is not a BigInt",
  );

  const invalidString = asBigInt("not-a-number");
  assert(isErr(invalidString));
  expect(invalidString.body.message).toBe(
    "Value is not a valid BigInt",
  );

  const booleanInput = asBigInt(true);
  assert(isErr(booleanInput));
  expect(booleanInput.body.message).toBe(
    "Value is not a BigInt",
  );

  const nullInput = asBigInt(null);
  assert(isErr(nullInput));
  expect(nullInput.body.message).toBe(
    "Value is not a BigInt",
  );
});

test("asBigInt works in validation pipelines", () => {
  // Example: ID validation with business rules
  const validateUserId = (input: unknown) => {
    const bigIntResult = asBigInt(input);
    if (isErr(bigIntResult)) return bigIntResult;

    const userId = bigIntResult.body;
    if (userId < 1n) {
      return {
        __tag: "Err" as const,
        body: new Error(
          "User ID must be positive",
        ),
      };
    }
    if (userId > BigInt("9999999999999999")) {
      return {
        __tag: "Err" as const,
        body: new Error("User ID too large"),
      };
    }
    return {
      __tag: "Ok" as const,
      body: userId,
    };
  };

  const validUserId = validateUserId(
    BigInt(12345),
  );
  assert(isOk(validUserId));
  expect(validUserId.body).toBe(BigInt(12345));

  const stringUserId =
    validateUserId("9876543210");
  assert(isOk(stringUserId));
  expect(stringUserId.body).toBe(
    BigInt("9876543210"),
  );

  const invalidType = validateUserId(
    "not-a-number",
  );
  assert(isErr(invalidType));
  expect(invalidType.body.message).toBe(
    "Value is not a valid BigInt",
  );

  const negativeUserId = validateUserId(
    BigInt(-1),
  );
  assert(isErr(negativeUserId));
  expect(negativeUserId.body.message).toBe(
    "User ID must be positive",
  );

  const tooLargeUserId = validateUserId(
    BigInt("99999999999999999"),
  );
  assert(isErr(tooLargeUserId));
  expect(tooLargeUserId.body.message).toBe(
    "User ID too large",
  );
});

test("asBigInt handles large values beyond Number.MAX_SAFE_INTEGER", () => {
  // Example: Large integer values that exceed JavaScript number precision
  const largeValue = asBigInt(
    "123456789012345678901234567890",
  );
  assert(isOk(largeValue));
  expect(largeValue.body).toBe(
    BigInt("123456789012345678901234567890"),
  );

  const veryLargeNegative = asBigInt(
    "-987654321098765432109876543210",
  );
  assert(isOk(veryLargeNegative));
  expect(veryLargeNegative.body).toBe(
    BigInt("-987654321098765432109876543210"),
  );

  // Converting from max safe integer boundaries
  const maxSafeInt = asBigInt(
    Number.MAX_SAFE_INTEGER,
  );
  assert(isOk(maxSafeInt));
  expect(maxSafeInt.body).toBe(
    BigInt(Number.MAX_SAFE_INTEGER),
  );

  const minSafeInt = asBigInt(
    Number.MIN_SAFE_INTEGER,
  );
  assert(isOk(minSafeInt));
  expect(minSafeInt.body).toBe(
    BigInt(Number.MIN_SAFE_INTEGER),
  );
});

