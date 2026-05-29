import { test, expect, assert } from "vitest";
import {
  isSoftStr,
  asSoftStr,
  isOk,
  isErr,
  concat,
} from "plgg/index";

test("isSoftStr correctly identifies string values", () => {
  // Valid strings
  expect(isSoftStr("hello")).toBe(true);
  expect(isSoftStr("")).toBe(true);
  expect(isSoftStr("123")).toBe(true);
  expect(isSoftStr(" whitespace ")).toBe(true);
  expect(isSoftStr("special chars: !@#$%")).toBe(
    true,
  );

  // Invalid types
  expect(isSoftStr(123)).toBe(false);
  expect(isSoftStr(true)).toBe(false);
  expect(isSoftStr(null)).toBe(false);
  expect(isSoftStr(undefined)).toBe(false);
  expect(isSoftStr({})).toBe(false);
  expect(isSoftStr([])).toBe(false);
  expect(isSoftStr(Symbol("test"))).toBe(false);
});

test("asSoftStr validates and returns string values", () => {
  // Example: User input validation
  const validString = asSoftStr("user@example.com");
  assert(isOk(validString));
  expect(validString.content).toBe(
    "user@example.com",
  );

  const emptyString = asSoftStr("");
  assert(isOk(emptyString));
  expect(emptyString.content).toBe("");

  // Example: API response validation
  const numberInput = asSoftStr(123);
  assert(isErr(numberInput));
  expect(numberInput.content.message).toBe(
    "123 is not a string",
  );

  const booleanInput = asSoftStr(true);
  assert(isErr(booleanInput));
  expect(booleanInput.content.message).toBe(
    "true is not a string",
  );

  const nullInput = asSoftStr(null);
  assert(isErr(nullInput));
  expect(nullInput.content.message).toBe(
    "null is not a string",
  );

  const undefinedInput = asSoftStr(undefined);
  assert(isErr(undefinedInput));
  expect(undefinedInput.content.message).toBe(
    "undefined is not a string",
  );
});

test("asSoftStr works in validation pipelines", () => {
  // Example: Email validation pipeline
  const validateEmail = (input: unknown) => {
    const strResult = asSoftStr(input);
    if (isErr(strResult)) return strResult;

    const email = strResult.content;
    return email.includes("@") &&
      email.includes(".")
      ? { __tag: "Ok" as const, content: email }
      : {
          __tag: "Err" as const,
          content: new Error(
            "Invalid email format",
          ),
        };
  };

  const validEmail = validateEmail(
    "user@example.com",
  );
  assert(isOk(validEmail));
  expect(validEmail.content).toBe(
    "user@example.com",
  );

  const invalidType = validateEmail(123);
  assert(isErr(invalidType));
  expect(invalidType.content.message).toBe(
    "123 is not a string",
  );

  const invalidFormat = validateEmail(
    "not-an-email",
  );
  assert(isErr(invalidFormat));
  expect(invalidFormat.content.message).toBe(
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
