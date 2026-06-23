import {
  test,
  expect,
  vi,
} from "plgg-test/index";

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
