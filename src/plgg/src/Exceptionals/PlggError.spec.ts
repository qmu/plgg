import { test, expect, vi } from "vitest";
import {
  PlggError,
  InvalidError,
  BaseError,
  printPlggError,
  isPlggError,
  unreachable,
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

test("PlggError.debug with regular Error", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const error = new Error("Regular error");
  printPlggError(error as any);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[Error]"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Regular error"),
  );

  consoleSpy.mockRestore();
});

test("PlggError type alias", () => {
  const error: PlggError = new InvalidError({
    message: "Test error",
  });
  expect(error instanceof InvalidError).toBe(
    true,
  );
  expect(error instanceof BaseError).toBe(true);
});

test("PlggError.debug with error having no stack trace", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const error = new InvalidError({
    message: "No stack error",
  });
  // Create an error without stack by using Object.defineProperty
  Object.defineProperty(error, "stack", {
    value: undefined,
  });

  printPlggError(error);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.not.stringContaining(" at "),
  );

  consoleSpy.mockRestore();
});

test("PlggError.debug with error having malformed stack", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const error = new InvalidError({
    message: "Malformed stack error",
  });
  // Set a malformed stack (only one line)
  Object.defineProperty(error, "stack", {
    value: "Error: Malformed stack error",
  });

  printPlggError(error);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.not.stringContaining(" at "),
  );

  consoleSpy.mockRestore();
});

test("unreachable throws error for exhaustive checking", () => {
  // Example: Exhaustive pattern matching
  expect(() => unreachable()).toThrow(
    "Supposed to be unreachable",
  );
});
