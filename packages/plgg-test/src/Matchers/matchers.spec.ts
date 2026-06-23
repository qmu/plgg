import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  toHaveLength,
  toBeGreaterThan,
  toBeInstanceOf,
  toBeUndefined,
  toBeNull,
  isAssertion,
} from "../index.js";
import { isOk, isErr } from "plgg";

// We are testing the matchers themselves, so we inspect their output
// Assertion's Ok/Err directly.
test("toBe passes on Object.is, fails otherwise", () =>
  all([
    check(isAssertion(toBe(1)(1)), toBe(true)),
    check(isOk(toBe(1)(1)), toBe(true)),
    check(isErr(toBe(1)(2)), toBe(true)),
  ]));

test("check fans several matchers over the same actual", () =>
  // `check` applies each matcher to the SAME actual (independent
  // fan-out) and aggregates — the common multi-check shape.
  check(7, toBe(7), toBeGreaterThan(6)));

test("toEqual deep-equals structures", () =>
  all([
    check(
      isOk(toEqual({ a: [1] })({ a: [1] })),
      toBe(true),
    ),
    check(
      isErr(toEqual({ a: 1 })({ a: 2 })),
      toBe(true),
    ),
  ]));

test("toContain on strings and arrays", () =>
  all([
    check(
      isOk(toContain("ell")("hello")),
      toBe(true),
    ),
    check(
      isOk(toContain(2)([1, 2, 3])),
      toBe(true),
    ),
    check(isErr(toContain(9)([1])), toBe(true)),
  ]));

test("toHaveLength", () =>
  all([
    check(
      isOk(toHaveLength(2)([1, 2])),
      toBe(true),
    ),
    check(
      isErr(toHaveLength(9)("ab")),
      toBe(true),
    ),
  ]));

test("toBeGreaterThan", () =>
  all([
    check(
      isOk(toBeGreaterThan(2)(3)),
      toBe(true),
    ),
    check(
      isErr(toBeGreaterThan(3)(3)),
      toBe(true),
    ),
  ]));

test("toBeInstanceOf", () =>
  check(
    isOk(toBeInstanceOf(Error)(new Error("x"))),
    toBe(true),
  ));

test("toBeUndefined / toBeNull", () =>
  all([
    check(
      isOk(toBeUndefined()(undefined)),
      toBe(true),
    ),
    check(isOk(toBeNull()(null)), toBe(true)),
    check(isErr(toBeNull()(0)), toBe(true)),
  ]));
