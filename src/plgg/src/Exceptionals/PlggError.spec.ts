import { test, expect, assert, vi } from "vitest";
import {
  InvalidError,
  BaseError,
  Time,
  Option,
  Obj,
  Str,
  Result,
  printPlggError,
  isPlggError,
  asSoftStr,
  asObj,
  forProp,
  forOptionProp,
  asTime,
  cast,
  refine,
  asStr,
} from "plgg/index";

test("PlggError.is type guard with InvalidError", () => {
  const error = new InvalidError({
    message: "Test error",
  });
  expect(isPlggError(error)).toBe(true);
});

test("PlggError.is type guard with BaseError", () => {
  const error = new BaseError("Test error");
  expect(isPlggError(error)).toBe(true);
});

test("PlggError.is type guard with regular Error", () => {
  const error = new Error("Test error");
  expect(isPlggError(error)).toBe(false);
});

test("PlggError.is type guard with non-error objects", () => {
  expect(isPlggError({})).toBe(false);
  expect(isPlggError(null)).toBe(false);
  expect(isPlggError(undefined)).toBe(false);
  expect(isPlggError("string")).toBe(false);
  expect(isPlggError(123)).toBe(false);
  expect(isPlggError([])).toBe(false);
});

test("PlggError.is checks brand property", () => {
  const validError = {
    __: "PlggError",
    message: "test",
  };
  expect(isPlggError(validError)).toBe(true);

  const invalidError = {
    __: "SomeOtherError",
    message: "test",
  };
  expect(isPlggError(invalidError)).toBe(false);

  const noBrandError = { message: "test" };
  expect(isPlggError(noBrandError)).toBe(false);
});

test("PlggError.debug with InvalidError", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const error = new InvalidError({
    message: "Test validation error",
  });
  printPlggError(error);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[InvalidError]"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      "Test validation error",
    ),
  );

  consoleSpy.mockRestore();
});

test("PlggError.debug with nested errors", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const parentError = new InvalidError({
    message: "Parent error",
  });
  const childError = new InvalidError({
    message: "Child error",
    parent: parentError,
  });

  printPlggError(childError);

  expect(consoleSpy).toHaveBeenCalledTimes(2);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Child error"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Parent error"),
  );

  consoleSpy.mockRestore();
});

test("InvalidError over cast pipeline", () => {
  type Id = string;
  const asId = (v: unknown) => cast(v, asSoftStr);

  type Name = Str;
  const asName = (v: unknown) =>
    cast(
      v,
      asSoftStr,
      refine(
        (str) => str.length >= 3,
        "Name must be at least 3 characters long",
      ),
      asStr,
    );

  type Article = Obj<{
    id: Id;
    createdAt: Time;
    name: Name;
    memo: Option<string>;
  }>;

  const asArticle = (
    v: unknown,
  ): Result<Article, InvalidError> =>
    cast(
      v,
      asObj,
      forProp("id", asId),
      forProp("createdAt", asTime),
      forProp("name", asName),
      forOptionProp("memo", asSoftStr),
    );

  const result = asArticle({
    id: 1,
    createdAt: "2024-01-01T00:00:00Z",
    name: "AB",
  });
  if (result.isErr()) {
    expect(result.content).toBeInstanceOf(
      InvalidError,
    );
    expect(result.content.sibling).toHaveLength(
      2,
    );
    return;
  }
  assert.fail(
    "Expected InvalidError but got success",
  );
});
