import {
  test,
  check,
  all,
  toBe,
  vi,
} from "../index.js";
import { deepEqual } from "../Expect/equals.js";

test("vi.fn mockImplementation swaps the body", () => {
  const fn = vi.fn(() => 1);
  const first = fn();
  fn.mockImplementation(() => 2);
  const second = fn();
  return all([
    check(first, toBe<unknown>(1)),
    check(second, toBe<unknown>(2)),
    check(fn.mock.calls.length, toBe(2)),
  ]);
});

test("vi.spyOn records, calls original, and restores", () => {
  const obj = {
    greet: (n: unknown) => `hi ${n}`,
  };
  const spy = vi.spyOn(obj, "greet");
  const out = obj.greet("x");
  const recorded = all([
    check(out, toBe("hi x")),
    check(
      spy.mock.calls.some((c) =>
        deepEqual(c, ["x"]),
      ),
      toBe(true),
    ),
  ]);
  spy.mockRestore();
  // After restore the original is back (spy no longer records).
  obj.greet("y");
  return all([
    recorded,
    check(spy.mock.calls.length, toBe(1)),
  ]);
});

test("vi.spyOn mockImplementation overrides the original", () => {
  const obj = { f: () => "real" };
  const spy = vi
    .spyOn(obj, "f")
    .mockImplementation(() => "fake");
  const faked = check(obj.f(), toBe("fake"));
  spy.mockRestore();
  return all([
    faked,
    check(obj.f(), toBe("real")),
  ]);
});

test("vi.fn records calls and returns impl result", () => {
  const fn = vi.fn(
    (a: unknown, b: unknown) =>
      Number(a) + Number(b),
  );
  const out = fn(2, 3);
  return all([
    check(out, toBe<unknown>(5)),
    check(fn.mock.calls.length > 0, toBe(true)),
    check(fn.mock.calls.length, toBe(1)),
    check(
      fn.mock.calls.some((c) =>
        deepEqual(c, [2, 3]),
      ),
      toBe(true),
    ),
  ]);
});

test("vi.fn without impl returns undefined", () => {
  const fn = vi.fn();
  const out = fn("x");
  return all([
    check(out === undefined, toBe(true)),
    check(
      fn.mock.calls.some((c) =>
        deepEqual(c, ["x"]),
      ),
      toBe(true),
    ),
  ]);
});

test("not.toHaveBeenCalled on a fresh spy", () => {
  const fn = vi.fn();
  return check(
    fn.mock.calls.length === 0,
    toBe(true),
  );
});

test("stubGlobal then unstubAllGlobals restores", () => {
  vi.stubGlobal("__plggTestProbe", 123);
  const stubbed = check(
    "__plggTestProbe" in globalThis,
    toBe(true),
  );
  vi.unstubAllGlobals();
  return all([
    stubbed,
    check(
      "__plggTestProbe" in globalThis,
      toBe(false),
    ),
  ]);
});

test("stubEnv then unstubAllEnvs restores", () => {
  vi.stubEnv("PLGG_TEST_PROBE", "on");
  const stubbed = check(
    process.env.PLGG_TEST_PROBE,
    toBe<string | undefined>("on"),
  );
  vi.unstubAllEnvs();
  return all([
    stubbed,
    check(
      process.env.PLGG_TEST_PROBE === undefined,
      toBe(true),
    ),
  ]);
});

test("stubEnv restores a pre-existing env value", () => {
  process.env.PLGG_PREEXIST = "old";
  vi.stubEnv("PLGG_PREEXIST", "new");
  const stubbed = check(
    process.env.PLGG_PREEXIST,
    toBe<string | undefined>("new"),
  );
  vi.unstubAllEnvs();
  const restored = check(
    process.env.PLGG_PREEXIST,
    toBe<string | undefined>("old"),
  );
  delete process.env.PLGG_PREEXIST;
  return all([stubbed, restored]);
});

test("spyOn a non-function property returns a no-impl spy", () => {
  const obj: { n: unknown } = { n: 5 };
  const spy = vi.spyOn(obj, "n");
  const patched = check(
    typeof obj.n,
    toBe<string>("function"),
  );
  spy.mockRestore();
  return all([
    patched,
    check(obj.n, toBe<unknown>(5)),
  ]);
});
