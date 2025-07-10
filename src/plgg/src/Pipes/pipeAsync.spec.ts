import { test, expect } from "vitest";
import { pipeAsync } from "plgg/index";

test("pipeAsync with single function", async () => {
  const double = (x: number) => x * 2;
  const result = await pipeAsync(5, double);
  expect(result).toBe(10);
});

test("pipeAsync with multiple synchronous functions", async () => {
  const double = (x: number) => x * 2;
  const addTen = (x: number) => x + 10;
  const toString = (x: number) => x.toString();

  const result = await pipeAsync(5, double, addTen, toString);
  expect(result).toBe("20");
});

test("pipeAsync with async functions", async () => {
  const asyncDouble = async (x: number) => x * 2;
  const asyncAddTen = async (x: number) => x + 10;

  const result = await pipeAsync(5, asyncDouble, asyncAddTen);
  expect(result).toBe(20);
});

test("pipeAsync with mixed sync and async functions", async () => {
  const double = (x: number) => x * 2;
  const asyncAddTen = async (x: number) => x + 10;
  const toString = (x: number) => x.toString();

  const result = await pipeAsync(5, double, asyncAddTen, toString);
  expect(result).toBe("20");
});

test("pipeAsync with string operations", async () => {
  const addSuffix = (s: string) => s + "!";
  const toUpper = (s: string) => s.toUpperCase();

  const result = await pipeAsync("hello", addSuffix, toUpper);
  expect(result).toBe("HELLO!");
});

test("pipeAsync pipeAsyncesses sequentially", async () => {
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

  const result = await pipeAsync(0, first, second, third);
  expect(result).toBe(3);
  expect(operations).toEqual(["first", "second", "third"]);
});
