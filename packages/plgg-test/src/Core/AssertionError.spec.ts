import { test, expect } from "plgg-test/index";
import {
  AssertionError,
  isAssertionError,
} from "plgg-test/Core/AssertionError";

test("carries message, expected, actual", () => {
  const e = new AssertionError({
    message: "m",
    expected: "1",
    actual: "2",
  });
  expect(e.message).toBe("m");
  expect(e.expected).toBe("1");
  expect(e.actual).toBe("2");
  expect(e.name).toBe("AssertionError");
});

test("defaults expected/actual to empty", () => {
  const e = new AssertionError({
    message: "m",
  });
  expect(e.expected).toBe("");
  expect(e.actual).toBe("");
});

test("is an Error and guarded", () => {
  const e = new AssertionError({
    message: "m",
  });
  expect(e).toBeInstanceOf(Error);
  expect(isAssertionError(e)).toBe(true);
  expect(isAssertionError(new Error("x"))).toBe(
    false,
  );
});
