import { test, expect, assert } from "vitest";
import {
  isStr,
  asStr,
  isOk,
  isErr,
  concat,
} from "plgg/index";

test("isStr correctly identifies string values", () => {
  // Valid strings
  expect(isStr("hello")).toBe(true);
  expect(isStr("")).toBe(true);
  expect(isStr("123")).toBe(true);
  expect(isStr(" whitespace ")).toBe(true);
  expect(isStr("special chars: !@#$%")).toBe(
    true,
  );

  // Invalid types
  expect(isStr(123)).toBe(false);
  expect(isStr(true)).toBe(false);
  expect(isStr(null)).toBe(false);
  expect(isStr(undefined)).toBe(false);
  expect(isStr({})).toBe(false);
  expect(isStr([])).toBe(false);
  expect(isStr(Symbol("test"))).toBe(false);
});

test("asStr validates and returns string values", () => {
  // Example: User input validation
  const validString = asStr("user@example.com");
  assert(isOk(validString));
  expect(validString.body).toBe(
    "user@example.com",
  );

  const emptyString = asStr("");
  assert(isOk(emptyString));
  expect(emptyString.body).toBe("");

  // Example: API response validation
  const numberInput = asStr(123);
  assert(isErr(numberInput));
  expect(numberInput.body.message).toBe(
    "123 is not a string",
  );

  const booleanInput = asStr(true);
  assert(isErr(booleanInput));
  expect(booleanInput.body.message).toBe(
    "true is not a string",
  );

  const nullInput = asStr(null);
  assert(isErr(nullInput));
  expect(nullInput.body.message).toBe(
    "null is not a string",
  );

  const undefinedInput = asStr(undefined);
  assert(isErr(undefinedInput));
  expect(undefinedInput.body.message).toBe(
    "undefined is not a string",
  );
});

test("asStr works in validation pipelines", () => {
  // Example: Email validation pipeline
  const validateEmail = (input: unknown) => {
    const strResult = asStr(input);
    if (isErr(strResult)) return strResult;

    const email = strResult.body;
    return email.includes("@") &&
      email.includes(".")
      ? { __tag: "Ok" as const, body: email }
      : {
          __tag: "Err" as const,
          body: new Error("Invalid email format"),
        };
  };

  const validEmail = validateEmail(
    "user@example.com",
  );
  assert(isOk(validEmail));
  expect(validEmail.body).toBe(
    "user@example.com",
  );

  const invalidType = validateEmail(123);
  assert(isErr(invalidType));
  expect(invalidType.body.message).toBe(
    "123 is not a string",
  );

  const invalidFormat = validateEmail(
    "not-an-email",
  );
  assert(isErr(invalidFormat));
  expect(invalidFormat.body.message).toBe(
    "Invalid email format",
  );
});

test("concat concatenates strings correctly", () => {
  // Basic concatenation
  expect(concat(" world")("hello")).toBe(
    "hello world",
  );
  expect(concat("")("test")).toBe("test");

  // Concatenating special characters
  expect(concat("!@#$%")("special")).toBe(
    "special!@#$%",
  );

  // Concatenating with empty strings
  expect(concat("")("")).toBe("");

  // Concatenating with numbers as strings
  expect(concat("123")("456")).toBe("456123");
});
