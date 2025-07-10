import { test, expect, vi } from "vitest";
import {
  DomainError,
  printDomainError,
  isDomainError,
  ValidationError,
  BaseError,
} from "plgg/index";

test("DomainError.is type guard with ValidationError", () => {
  const error = new ValidationError({ message: "Test error" });
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

test("DomainError.debug with ValidationError", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const error = new ValidationError({ message: "Test validation error" });
  printDomainError(error);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[ValidationError]"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Test validation error"),
  );

  consoleSpy.mockRestore();
});

test("DomainError.debug with nested errors", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const parentError = new ValidationError({ message: "Parent error" });
  const childError = new ValidationError({
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
  const error: DomainError = new ValidationError({
    message: "Test error",
  });
  expect(error instanceof ValidationError).toBe(true);
  expect(error instanceof BaseError).toBe(true);
});
