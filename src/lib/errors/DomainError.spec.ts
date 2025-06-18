import { test, expect, vi } from "vitest";
import { DomainError, ValidationError, BaseError } from "plgg/lib/index";

test("DomainError.is type guard with ValidationError", () => {
  const error = new ValidationError("Test error");
  expect(DomainError.is(error)).toBe(true);
});

test("DomainError.is type guard with BaseError", () => {
  const error = new BaseError("Test error");
  expect(DomainError.is(error)).toBe(true);
});

test("DomainError.is type guard with regular Error", () => {
  const error = new Error("Test error");
  expect(DomainError.is(error)).toBe(false);
});

test("DomainError.is type guard with non-error objects", () => {
  expect(DomainError.is({})).toBe(false);
  expect(DomainError.is(null)).toBe(false);
  expect(DomainError.is(undefined)).toBe(false);
  expect(DomainError.is("string")).toBe(false);
  expect(DomainError.is(123)).toBe(false);
  expect(DomainError.is([])).toBe(false);
});

test("DomainError.is checks brand property", () => {
  const validError = { __: "DomainError", message: "test" };
  expect(DomainError.is(validError)).toBe(true);
  
  const invalidError = { __: "SomeOtherError", message: "test" };
  expect(DomainError.is(invalidError)).toBe(false);
  
  const noBrandError = { message: "test" };
  expect(DomainError.is(noBrandError)).toBe(false);
});

test("DomainError.debug with ValidationError", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  
  const error = new ValidationError("Test validation error");
  DomainError.debug(error);
  
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[ValidationError]")
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Test validation error")
  );
  
  consoleSpy.mockRestore();
});

test("DomainError.debug with nested errors", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  
  const parentError = new ValidationError("Parent error");
  const childError = new ValidationError("Child error", parentError);
  
  DomainError.debug(childError);
  
  expect(consoleSpy).toHaveBeenCalledTimes(2);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Child error")
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Parent error")
  );
  
  consoleSpy.mockRestore();
});

test("DomainError type alias", () => {
  const error: DomainError.t = new ValidationError("Test error");
  expect(error instanceof ValidationError).toBe(true);
  expect(error instanceof BaseError).toBe(true);
});