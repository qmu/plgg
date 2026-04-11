import { test, expect } from "vitest";
import {
  isAtomic,
  isJsonReadyAtomic,
  toJsonReadyAtomic,
  fromJsonReadyAtomic,
} from "plgg/index";

test("isAtomic recognizes primitive atomic values", () => {
  expect(isAtomic(true)).toBe(true);
  expect(isAtomic(42)).toBe(true);
  expect(isAtomic(3.14)).toBe(true);
  expect(isAtomic(42n)).toBe(true);
  expect(isAtomic("hello")).toBe(true);
  expect(isAtomic(new Date())).toBe(true);
  expect(isAtomic(new Uint8Array([1, 2, 3]))).toBe(
    true,
  );
});

test("isAtomic rejects non-atomic values", () => {
  expect(isAtomic(null)).toBe(false);
  expect(isAtomic(undefined)).toBe(false);
  expect(isAtomic({})).toBe(false);
  expect(isAtomic([])).toBe(false);
});

test("toJsonReadyAtomic round-trips Bin via JsonReady", () => {
  const original = new Uint8Array([1, 2, 3, 4, 5]);
  const jsonReady = toJsonReadyAtomic(original);
  expect(isJsonReadyAtomic(jsonReady)).toBe(true);
  const restored = fromJsonReadyAtomic(jsonReady);
  expect(restored).toEqual(original);
});

test("toJsonReadyAtomic round-trips BigInt", () => {
  const original = 123456789012345678901234n;
  const jsonReady = toJsonReadyAtomic(original);
  const restored = fromJsonReadyAtomic(jsonReady);
  expect(restored).toEqual(original);
});

test("toJsonReadyAtomic round-trips Time", () => {
  const original = new Date(
    "2024-05-01T12:00:00.000Z",
  );
  const jsonReady = toJsonReadyAtomic(original);
  const restored = fromJsonReadyAtomic(jsonReady);
  expect(restored).toEqual(original);
});

test("toJsonReadyAtomic passes through primitives", () => {
  expect(toJsonReadyAtomic(true)).toBe(true);
  expect(toJsonReadyAtomic(42)).toBe(42);
  expect(toJsonReadyAtomic("x")).toBe("x");
});

test("fromJsonReadyAtomic passes through primitives", () => {
  expect(fromJsonReadyAtomic(false)).toBe(false);
  expect(fromJsonReadyAtomic(7)).toBe(7);
  expect(fromJsonReadyAtomic("y")).toBe("y");
});
