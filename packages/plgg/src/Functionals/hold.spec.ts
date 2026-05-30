import { test, expect } from "vitest";
import { hold } from "plgg/index";

test("bind applies function to values in pipelines", () => {
  // Example: Simple value transformation in composition
  const uppercase = (s: string) =>
    s.toUpperCase();

  const result = hold(uppercase)("hello");
  expect(result).toBe("HELLO");
});
