import { test, expect } from "vitest";
import { Primitive } from "plgg/lib/index";

test("Primitive.is type guard", () => {
  // String primitives
  expect(Primitive.is("hello")).toBe(true);
  expect(Primitive.is("")).toBe(true);
  
  // Number primitives
  expect(Primitive.is(123)).toBe(true);
  expect(Primitive.is(0)).toBe(true);
  expect(Primitive.is(-123)).toBe(true);
  expect(Primitive.is(3.14)).toBe(true);
  
  // Boolean primitives
  expect(Primitive.is(true)).toBe(true);
  expect(Primitive.is(false)).toBe(true);
  
  // Date primitives
  expect(Primitive.is(new Date())).toBe(true);
  expect(Primitive.is(new Date("2023-01-01"))).toBe(true);
  
  // Non-primitives
  expect(Primitive.is({})).toBe(false);
  expect(Primitive.is([])).toBe(false);
  expect(Primitive.is(null)).toBe(false);
  expect(Primitive.is(undefined)).toBe(false);
  expect(Primitive.is(Symbol("test"))).toBe(false);
  expect(Primitive.is(() => {})).toBe(false);
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
  
  testValues.forEach(value => {
    expect(Primitive.is(value)).toBe(true);
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
  
  nonPrimitives.forEach(value => {
    expect(Primitive.is(value)).toBe(false);
  });
});