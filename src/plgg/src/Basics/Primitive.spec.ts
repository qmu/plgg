import { test, expect } from "vitest";
import { isPrimitive } from "plgg/index";

test("Primitive.is type guard", () => {
  // String primitives
  expect(isPrimitive("hello")).toBe(true);
  expect(isPrimitive("")).toBe(true);

  // Number primitives
  expect(isPrimitive(123)).toBe(true);
  expect(isPrimitive(0)).toBe(true);
  expect(isPrimitive(-123)).toBe(true);
  expect(isPrimitive(3.14)).toBe(true);

  // Boolean primitives
  expect(isPrimitive(true)).toBe(true);
  expect(isPrimitive(false)).toBe(true);

  // Date primitives
  expect(isPrimitive(new Date())).toBe(true);
  expect(
    isPrimitive(new Date("2023-01-01")),
  ).toBe(true);

  // Non-primitives
  expect(isPrimitive({})).toBe(false);
  expect(isPrimitive([])).toBe(false);
  expect(isPrimitive(null)).toBe(false);
  expect(isPrimitive(undefined)).toBe(false);
  expect(isPrimitive(Symbol("test"))).toBe(false);
  expect(isPrimitive(() => {})).toBe(false);
});

test("Primitive.is covers all primitive types", () => {
  // Test that Primitive.is handles all expected primitive types
  const testValues = [
    "string",
    123,
    true,
    false,
    new Date(),
    "branded string" as any, // Branded strings are still strings
    42 as any, // Branded numbers are still numbers
    true as any, // Branded booleans are still booleans
  ];

  testValues.forEach((value) => {
    expect(isPrimitive(value)).toBe(true);
  });
});

test("Primitive.is rejects non-primitive types", () => {
  const nonPrimitives = [
    {},
    [],
    null,
    undefined,
    Symbol("test"),
    () => {},
    new Set(),
    new Map(),
    /regex/,
    new Error("test"),
  ];

  nonPrimitives.forEach((value) => {
    expect(isPrimitive(value)).toBe(false);
  });
});
