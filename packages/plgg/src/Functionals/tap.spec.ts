import { test, expect, vi } from "vitest";
import { tap } from "plgg/index";

test("tap executes side effect and returns value unchanged", () => {
  // Example: Logging in a processing pipeline
  const sideEffectFn = vi.fn();
  const tapper = tap(sideEffectFn);

  const result = tapper("test-value");

  expect(result).toBe("test-value");
  expect(sideEffectFn).toHaveBeenCalledWith(
    "test-value",
  );
  expect(sideEffectFn).toHaveBeenCalledTimes(1);
});

test("tap works with console.log", () => {
  const consoleSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => {});

  const logTap = tap(console.log);
  const result = logTap(42);

  expect(result).toBe(42);
  expect(consoleSpy).toHaveBeenCalledWith(42);

  consoleSpy.mockRestore();
});

test("tap preserves object references", () => {
  const sideEffectFn = vi.fn();
  const obj = { foo: "bar" };

  const result = tap(sideEffectFn)(obj);

  expect(result).toBe(obj);
  expect(sideEffectFn).toHaveBeenCalledWith(obj);
});

test("tap can be used for debugging in pipelines", () => {
  const logs: unknown[] = [];
  const logger = (value: unknown) => logs.push(value);

  const processValue = (x: number) =>
    tap(logger)(x * 2);

  const result = processValue(5);

  expect(result).toBe(10);
  expect(logs).toEqual([10]);
});
