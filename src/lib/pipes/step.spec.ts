import { test, expect } from "vitest";
import { step } from "plgg/lib/pipes/step";

test("step with single function", async () => {
  const double = (x: number) => x * 2;
  const result = await step(5, double);
  expect(result).toBe(10);
});

test("step with multiple synchronous functions", async () => {
  const double = (x: number) => x * 2;
  const addTen = (x: number) => x + 10;
  const toString = (x: number) => x.toString();

  const result = await step(5, double, addTen, toString);
  expect(result).toBe("20");
});

test("step with async functions", async () => {
  const asyncDouble = async (x: number) => x * 2;
  const asyncAddTen = async (x: number) => x + 10;

  const result = await step(5, asyncDouble, asyncAddTen);
  expect(result).toBe(20);
});

test("step with mixed sync and async functions", async () => {
  const double = (x: number) => x * 2;
  const asyncAddTen = async (x: number) => x + 10;
  const toString = (x: number) => x.toString();

  const result = await step(5, double, asyncAddTen, toString);
  expect(result).toBe("20");
});

test("step with string operations", async () => {
  const addSuffix = (s: string) => s + "!";
  const toUpper = (s: string) => s.toUpperCase();

  const result = await step("hello", addSuffix, toUpper);
  expect(result).toBe("HELLO!");
});

test("step stepesses sequentially", async () => {
  const operations: string[] = [];
  const first = (x: number) => {
    operations.push("first");
    return x + 1;
  };
  const second = (x: number) => {
    operations.push("second");
    return x + 1;
  };
  const third = (x: number) => {
    operations.push("third");
    return x + 1;
  };

  const result = await step(0, first, second, third);
  expect(result).toBe(3);
  expect(operations).toEqual(["first", "second", "third"]);
});
