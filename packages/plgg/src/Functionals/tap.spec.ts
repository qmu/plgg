import {
  test,
  check,
  all,
  toBe,
  toEqual,
  vi,
  deepEqual,
} from "plgg-test";
import { tap } from "plgg/index";

test("tap executes side effect and returns value unchanged", () => {
  // Example: Logging in a processing pipeline
  const sideEffectFn = vi.fn();
  const tapper = tap(sideEffectFn);

  const result = tapper("test-value");

  return all([
    check(result, toBe("test-value")),
    check(
      sideEffectFn.mock.calls.some((c) =>
        deepEqual(c, ["test-value"]),
      ),
      toBe(true),
    ),
    check(
      sideEffectFn.mock.calls.length,
      toBe(1),
    ),
  ]);
});

test("tap works with console.log", () => {
  const consoleSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => {});

  const logTap = tap(console.log);
  const result = logTap(42);

  const assertion = all([
    check(result, toBe(42)),
    check(
      consoleSpy.mock.calls.some((c) =>
        deepEqual(c, [42]),
      ),
      toBe(true),
    ),
  ]);

  consoleSpy.mockRestore();
  return assertion;
});

test("tap preserves object references", () => {
  const sideEffectFn = vi.fn();
  const obj = { foo: "bar" };

  const result = tap(sideEffectFn)(obj);

  return all([
    check(result, toBe(obj)),
    check(
      sideEffectFn.mock.calls.some((c) =>
        deepEqual(c, [obj]),
      ),
      toBe(true),
    ),
  ]);
});

test("tap can be used for debugging in pipelines", () => {
  const logs: unknown[] = [];
  const logger = (value: unknown) =>
    logs.push(value);

  const processValue = (x: number) =>
    tap(logger)(x * 2);

  const result = processValue(5);

  return all([
    check(result, toBe(10)),
    check(logs, toEqual([10])),
  ]);
});
