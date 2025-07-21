import { test, expect, vi } from "vitest";
import {
  DomainError,
  printDomainError,
  isDomainError,
  InvalidError,
  BaseError,
} from "plgg/index";

test("DomainError.is type guard with InvalidError", () => {
  const error = new InvalidError({ message: "Test error" });
  expect(isDomainError(error)).toBe(true);
});

test("DomainError.is type guard with BaseError", () => {
  const error = new BaseError("Test error");
  expect(isDomainError(error)).toBe(true);
});

test("DomainError.is type guard with regular Error", () => {
  const error = new Error("Test error");
  expect(isDomainError(error)).toBe(false);
});

test("DomainError.is type guard with non-error objects", () => {
  expect(isDomainError({})).toBe(false);
  expect(isDomainError(null)).toBe(false);
  expect(isDomainError(undefined)).toBe(false);
  expect(isDomainError("string")).toBe(false);
  expect(isDomainError(123)).toBe(false);
  expect(isDomainError([])).toBe(false);
});

test("DomainError.is checks brand property", () => {
  const validError = { __: "DomainError", message: "test" };
  expect(isDomainError(validError)).toBe(true);

  const invalidError = { __: "SomeOtherError", message: "test" };
  expect(isDomainError(invalidError)).toBe(false);

  const noBrandError = { message: "test" };
  expect(isDomainError(noBrandError)).toBe(false);
});

test("DomainError.debug with InvalidError", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const error = new InvalidError({ message: "Test validation error" });
  printDomainError(error);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[InvalidError]"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Test validation error"),
  );

  consoleSpy.mockRestore();
});

test("DomainError.debug with nested errors", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const parentError = new InvalidError({ message: "Parent error" });
  const childError = new InvalidError({
    message: "Child error",
    parent: parentError,
  });

  printDomainError(childError);

  expect(consoleSpy).toHaveBeenCalledTimes(2);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Child error"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Parent error"),
  );

  consoleSpy.mockRestore();
});

test("DomainError.debug with regular Error", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const error = new Error("Regular error");
  printDomainError(error as any);

  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[Error]"));
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Regular error"),
  );

  consoleSpy.mockRestore();
});

test("DomainError type alias", () => {
  const error: DomainError = new InvalidError({
    message: "Test error",
  });
  expect(error instanceof InvalidError).toBe(true);
  expect(error instanceof BaseError).toBe(true);
});

test("DomainError.debug with error having no stack trace", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const error = new InvalidError({ message: "No stack error" });
  // Create an error without stack by using Object.defineProperty
  Object.defineProperty(error, "stack", { value: undefined });

  printDomainError(error);

  expect(consoleSpy).toHaveBeenCalledWith(expect.not.stringContaining(" at "));

  consoleSpy.mockRestore();
});

test("DomainError.debug with error having malformed stack", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const error = new InvalidError({ message: "Malformed stack error" });
  // Set a malformed stack (only one line)
  Object.defineProperty(error, "stack", {
    value: "Error: Malformed stack error",
  });

  printDomainError(error);

  expect(consoleSpy).toHaveBeenCalledWith(expect.not.stringContaining(" at "));

  consoleSpy.mockRestore();
});
