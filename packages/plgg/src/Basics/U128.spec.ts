import { test, expect, assert } from "plgg-test";
import {
  asU128,
  isU128,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isU128 true for a valid U128 box", () => {
  const value = box("U128")(1000n);
  expect(isU128(value)).toBe(true);
});

test("isU128 false for boxes with other tags", () => {
  expect(isU128(box("U64")(1n))).toBe(false);
  expect(isU128(1n)).toBe(false);
  expect(isU128(null)).toBe(false);
  expect(isU128({})).toBe(false);
});

test("asU128 accepts an already-boxed U128", () => {
  const existing = box("U128")(42n);
  const result = asU128(existing);
  assert(isOk(result));
  expect(result.content).toBe(existing);
});

test("asU128 lifts a raw bigint in range", () => {
  const result = asU128(10000000000n);
  assert(isOk(result));
  expect(result.content.__tag).toBe("U128");
  expect(result.content.content).toBe(10000000000n);
});

test("asU128 lifts the zero boundary", () => {
  const result = asU128(0n);
  assert(isOk(result));
});

test("asU128 lifts the max U128 value", () => {
  const max =
    340282366920938463463374607431768211455n;
  const result = asU128(max);
  assert(isOk(result));
  expect(result.content.content).toBe(max);
});

test("asU128 fails for bigint above range", () => {
  const outOfRange =
    340282366920938463463374607431768211456n;
  const result = asU128(outOfRange);
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Value is not a U128",
  );
});

test("asU128 fails for negative bigint", () => {
  const result = asU128(-1n);
  assert(isErr(result));
});

test("asU128 fails for non-bigint values", () => {
  expect(isErr(asU128(42))).toBe(true);
  expect(isErr(asU128("42"))).toBe(true);
  expect(isErr(asU128(null))).toBe(true);
  expect(isErr(asU128(undefined))).toBe(true);
});
