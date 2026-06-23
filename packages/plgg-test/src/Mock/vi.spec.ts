import {
  test,
  expect,
  vi,
} from "plgg-test/index";

test("vi.fn mockImplementation swaps the body", () => {
  const fn = vi.fn(() => 1);
  expect(fn()).toBe(1);
  fn.mockImplementation(() => 2);
  expect(fn()).toBe(2);
  expect(fn).toHaveBeenCalledTimes(2);
});

test("vi.spyOn records, calls original, and restores", () => {
  const obj = {
    greet: (n: unknown) => `hi ${n}`,
  };
  const spy = vi.spyOn(obj, "greet");
  const out = obj.greet("x");
  expect(out).toBe("hi x");
  expect(spy).toHaveBeenCalledWith("x");
  spy.mockRestore();
  // After restore the original is back (spy no longer records).
  obj.greet("y");
  expect(spy).toHaveBeenCalledTimes(1);
});

test("vi.spyOn mockImplementation overrides the original", () => {
  const obj = { f: () => "real" };
  const spy = vi
    .spyOn(obj, "f")
    .mockImplementation(() => "fake");
  expect(obj.f()).toBe("fake");
  spy.mockRestore();
  expect(obj.f()).toBe("real");
});

test("vi.fn records calls and returns impl result", () => {
  const fn = vi.fn(
    (a: unknown, b: unknown) =>
      Number(a) + Number(b),
  );
  expect(fn(2, 3)).toBe(5);
  expect(fn).toHaveBeenCalled();
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(2, 3);
});

test("vi.fn without impl returns undefined", () => {
  const fn = vi.fn();
  expect(fn("x")).toBeUndefined();
  expect(fn).toHaveBeenCalledWith("x");
});

test("not.toHaveBeenCalled on a fresh spy", () => {
  const fn = vi.fn();
  expect(fn).not.toHaveBeenCalled();
});

test("stubGlobal then unstubAllGlobals restores", () => {
  vi.stubGlobal("__plggTestProbe", 123);
  expect("__plggTestProbe" in globalThis).toBe(
    true,
  );
  vi.unstubAllGlobals();
  expect("__plggTestProbe" in globalThis).toBe(
    false,
  );
});

test("stubEnv then unstubAllEnvs restores", () => {
  vi.stubEnv("PLGG_TEST_PROBE", "on");
  expect(process.env.PLGG_TEST_PROBE).toBe("on");
  vi.unstubAllEnvs();
  expect(
    process.env.PLGG_TEST_PROBE,
  ).toBeUndefined();
});

test("stubEnv restores a pre-existing env value", () => {
  process.env.PLGG_PREEXIST = "old";
  vi.stubEnv("PLGG_PREEXIST", "new");
  expect(process.env.PLGG_PREEXIST).toBe("new");
  vi.unstubAllEnvs();
  expect(process.env.PLGG_PREEXIST).toBe("old");
  delete process.env.PLGG_PREEXIST;
});

test("spyOn a non-function property returns a no-impl spy", () => {
  const obj: { n: unknown } = { n: 5 };
  const spy = vi.spyOn(obj, "n");
  expect(typeof obj.n).toBe("function");
  spy.mockRestore();
  expect(obj.n).toBe(5);
});
