import { test, expect } from "vitest";
import { synth } from "plgg/pipes/synth";

test("synth creates composed function", async () => {
  const double = (x: number) => x * 2;
  const addTen = (x: number) => x + 10;
  
  const composed = synth(double, addTen);
  const result = await composed(5);
  expect(result).toBe(20);
});

test("synth with single function", async () => {
  const double = (x: number) => x * 2;
  const composed = synth(double);
  const result = await composed(5);
  expect(result).toBe(10);
});

test("synth with async functions", async () => {
  const asyncDouble = async (x: number) => x * 2;
  const asyncAddTen = async (x: number) => x + 10;
  
  const composed = synth(asyncDouble, asyncAddTen);
  const result = await composed(5);
  expect(result).toBe(20);
});

test("synth with string transformations", async () => {
  const addExclamation = (s: string) => s + "!";
  const toUpper = (s: string) => s.toUpperCase();
  const addPrefix = (s: string) => ">>> " + s;
  
  const composed = synth(addExclamation, toUpper, addPrefix);
  const result = await composed("hello");
  expect(result).toBe(">>> HELLO!");
});

test("synth creates reusable pipeline", async () => {
  const double = (x: number) => x * 2;
  const addTen = (x: number) => x + 10;
  
  const pipeline = synth(double, addTen);
  
  const result1 = await pipeline(5);
  const result2 = await pipeline(10);
  const result3 = await pipeline(0);
  
  expect(result1).toBe(20);
  expect(result2).toBe(30);
  expect(result3).toBe(10);
});

test("synth with type transformations", async () => {
  const toString = (x: number) => x.toString();
  const getLength = (s: string) => s.length;
  const isEven = (n: number) => n % 2 === 0;
  
  const composed = synth(toString, getLength, isEven);
  const result = await composed(12345);
  expect(result).toBe(false); // "12345".length = 5, which is odd
});