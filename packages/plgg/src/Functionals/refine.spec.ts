import { test, expect, assert } from "vitest";
import { refine, isOk, isErr } from "plgg/index";

test("refine validates values with custom predicates", () => {
  // Example: Custom validation rules
  const isPositive = (n: number) => n > 0;
  const validatePositive = refine(
    isPositive,
    "Number must be positive",
  );

  const validResult = validatePositive(5);
  assert(isOk(validResult));
  expect(validResult.content).toBe(5);

  const invalidResult = validatePositive(-3);
  assert(isErr(invalidResult));
  expect(invalidResult.content.message).toBe(
    "Number must be positive",
  );
});

test("refine with default error message", () => {
  // Test refine function without custom error message
  const isPositive = (n: number) => n > 0;
  const validatePositive = refine(isPositive);

  const invalidResult = validatePositive(-5);
  assert(isErr(invalidResult));
  expect(invalidResult.content.message).toBe(
    "The value -5 is not valid according to the predicate",
  );
});
