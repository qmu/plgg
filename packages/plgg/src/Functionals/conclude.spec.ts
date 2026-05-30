import { test, expect, assert } from "vitest";
import {
  Result,
  conclude,
  pipe,
  ok,
  err,
  isOk,
  isErr,
} from "plgg/index";

test("conclude - success case with all valid results", () => {
  const parseNumber = (
    s: string,
  ): Result<number, Error> => {
    const num = Number(s);
    return isNaN(num)
      ? err(new Error("Invalid number"))
      : ok(num);
  };

  const r1 = pipe([], conclude(parseNumber));
  assert(isOk(r1));
  expect(r1.content).toEqual([]);

  const r2 = pipe(
    ["1", "2", "3"],
    conclude(parseNumber),
  );
  assert(isOk(r2));
  expect(r2.content).toEqual([1, 2, 3]);

  const r3 = pipe(
    ["42", "3.14", "0"],
    conclude(parseNumber),
  );
  assert(isOk(r3));
  expect(r3.content).toEqual([42, 3.14, 0]);
});

test("conclude - failure case with first error returned", () => {
  const parsePositiveNumber = (
    s: string,
  ): Result<number, Error> => {
    const num = Number(s);
    if (isNaN(num)) {
      return err(
        new Error("Invalid number: " + s),
      );
    }
    if (num <= 0) {
      return err(
        new Error("Non-positive number: " + s),
      );
    }
    return ok(num);
  };

  const r1 = pipe(
    ["invalid"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r1));
  expect(r1.content.length).toBe(1);
  expect(r1.content[0]?.message).toBe(
    "Invalid number: invalid",
  );

  const r2 = pipe(
    ["1", "invalid", "3"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r2));
  expect(r2.content.length).toBe(1);
  expect(r2.content[0]?.message).toBe(
    "Invalid number: invalid",
  );

  const r3 = pipe(
    ["1", "-5", "3"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r3));
  expect(r3.content.length).toBe(1);
  expect(r3.content[0]?.message).toBe(
    "Non-positive number: -5",
  );

  const r4 = pipe(
    ["-1", "invalid", "0"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r4));
  expect(r4.content.length).toBe(3);
  expect(r4.content[0]?.message).toBe(
    "Non-positive number: -1",
  );
  expect(r4.content[1]?.message).toBe(
    "Invalid number: invalid",
  );
  expect(r4.content[2]?.message).toBe(
    "Non-positive number: 0",
  );
});

test("conclude - mixed types transformation", () => {
  const processValue = (
    x: number,
  ): Result<string, Error> => {
    if (x < 0) {
      return err(
        new Error("Negative value not allowed"),
      );
    }
    if (x === 0) {
      return ok("zero");
    }
    if (x === 1) {
      return ok("one");
    }
    return ok(`number: ${x}`);
  };

  const r1 = pipe(
    [0, 1, 2, 10],
    conclude(processValue),
  );
  assert(isOk(r1));
  expect(r1.content).toEqual([
    "zero",
    "one",
    "number: 2",
    "number: 10",
  ]);

  const r2 = pipe(
    [1, -1, 2],
    conclude(processValue),
  );
  assert(isErr(r2));
  expect(r2.content.length).toBe(1);
  expect(r2.content[0]?.message).toBe(
    "Negative value not allowed",
  );
});

test("conclude - processes all elements but returns first error", () => {
  let callCount = 0;
  const trackingFunction = (
    x: number,
  ): Result<number, Error> => {
    callCount++;
    if (x === 2) {
      return err(new Error("Error at 2"));
    }
    return ok(x * 10);
  };

  callCount = 0;
  const r1 = pipe(
    [1, 2, 3, 4],
    conclude(trackingFunction),
  );
  assert(isErr(r1));
  expect(r1.content.length).toBe(1);
  expect(r1.content[0]?.message).toBe(
    "Error at 2",
  );
  expect(callCount).toBe(4);

  callCount = 0;
  const r2 = pipe(
    [1, 3, 4],
    conclude(trackingFunction),
  );
  assert(isOk(r2));
  expect(r2.content).toEqual([10, 30, 40]);
  expect(callCount).toBe(3);
});
