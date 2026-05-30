import { test, expect } from "vitest";
import {
  isDatum,
  isDatumCore,
  some,
  none,
  createNominalDatum,
} from "plgg/index";

test("isDatum accepts core atomic values", () => {
  expect(isDatum(1)).toBe(true);
  expect(isDatum("hello")).toBe(true);
  expect(isDatum(true)).toBe(true);
  expect(isDatum(42n)).toBe(true);
  expect(isDatum(new Date())).toBe(true);
});

test("isDatum accepts plain objects of data", () => {
  expect(isDatum({})).toBe(true);
  expect(isDatum({ a: 1, b: "x" })).toBe(true);
});

test("isDatum accepts arrays of data", () => {
  expect(isDatum([1, 2, 3])).toBe(true);
  expect(isDatum([])).toBe(true);
});

test("isDatum accepts Optional datum wrappers", () => {
  expect(isDatum(none())).toBe(true);
  expect(isDatum(some(1))).toBe(true);
  expect(isDatum(some("hello"))).toBe(true);
  expect(isDatum(some({ a: 1 }))).toBe(true);
});

test("isDatum accepts Nominal datum wrappers", () => {
  const nominal = createNominalDatum(
    "UserId",
    "abc",
  );
  expect(isDatum(nominal)).toBe(true);
});

test("isDatum rejects Some with non-datum content", () => {
  const fn = () => 1;
  expect(isDatum(some(fn as unknown as string))).toBe(
    false,
  );
});

test("isDatum rejects non-datum values", () => {
  const fn = () => 1;
  expect(isDatum(fn)).toBe(false);
  expect(isDatum(Symbol("x"))).toBe(false);
});

test("isDatumCore accepts plain shapes", () => {
  expect(isDatumCore({ a: 1, b: "hello" })).toBe(
    true,
  );
  expect(isDatumCore([1, 2, 3])).toBe(true);
});

test("isDatumCore rejects functions", () => {
  const fn = () => 1;
  expect(isDatumCore(fn)).toBe(false);
});
