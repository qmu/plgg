import {
  test,
  expect,
  assert,
} from "plgg-test/index";
import { ok, some, none } from "plgg";
import { AssertionError } from "plgg-test/Core/AssertionError";

const throws = (fn: () => void): boolean => {
  try {
    fn();
    return false;
  } catch (e) {
    return e instanceof AssertionError;
  }
};

test("toBe passes on Object.is equality", () => {
  expect(1).toBe(1);
  expect("x").toBe("x");
  expect(throws(() => expect(1).toBe(2))).toBe(
    true,
  );
});

test("toEqual deep-equals nested structures", () => {
  expect({ a: [1, 2] }).toEqual({
    a: [1, 2],
  });
  expect(ok(some(3))).toEqual(ok(some(3)));
  expect(
    throws(() =>
      expect({ a: 1 }).toEqual({
        a: 2,
      }),
    ),
  ).toBe(true);
});

test("toEqual ignores undefined-valued props", () => {
  expect({ a: 1, b: undefined }).toEqual({
    a: 1,
  });
});

test("toContain on strings and arrays", () => {
  expect("hello").toContain("ell");
  expect([1, 2, 3]).toContain(2);
  expect(
    throws(() => expect([1]).toContain(9)),
  ).toBe(true);
});

test("toHaveLength", () => {
  expect([1, 2]).toHaveLength(2);
  expect("ab").toHaveLength(2);
});

test("toHaveProperty with and without value", () => {
  expect({ a: { b: 1 } }).toHaveProperty("a.b");
  expect({ a: { b: 1 } }).toHaveProperty(
    "a.b",
    1,
  );
  expect(
    throws(() => expect({}).toHaveProperty("x")),
  ).toBe(true);
});

test("toBeInstanceOf", () => {
  expect(new Error("x")).toBeInstanceOf(Error);
});

test("toBeUndefined / toBeDefined / toBeNull", () => {
  expect(undefined).toBeUndefined();
  expect(1).toBeDefined();
  expect(null).toBeNull();
});

test("toBeGreaterThan / OrEqual", () => {
  expect(3).toBeGreaterThan(2);
  expect(3).toBeGreaterThanOrEqual(3);
});

test("toThrow with no arg, string, and ctor", () => {
  expect(() => {
    throw new Error("boom");
  }).toThrow();
  expect(() => {
    throw new Error("boom");
  }).toThrow("boom");
  expect(() => {
    throw new TypeError("t");
  }).toThrow(TypeError);
  expect(() => undefined).not.toThrow();
});

test(".not inverts", () => {
  expect(1).not.toBe(2);
  expect([1]).not.toContain(9);
  expect(
    throws(() => expect(1).not.toBe(1)),
  ).toBe(true);
});

test(".resolves awaits then applies matcher", async () => {
  await expect(Promise.resolve(5)).resolves.toBe(
    5,
  );
  await expect(
    Promise.resolve(ok(1)),
  ).resolves.toEqual(ok(1));
});

test(".rejects applies the matcher to the rejection reason", async () => {
  // `.rejects.<m>` passes the rejection reason to the inner matcher.
  await expect(
    Promise.reject("nope"),
  ).rejects.toBe("nope");
});

test("assert narrows (asserts cond)", () => {
  const r = ok(42);
  assert(r.__tag === "Ok");
  // After the assertion, `r` is narrowed to Ok and `.content` is
  // reachable without a cast.
  expect(r.content).toBe(42);
});

test("assert.fail always throws", () => {
  expect(throws(() => assert.fail("x"))).toBe(
    true,
  );
});

test("matchers distinguish Option variants", () => {
  expect(some(1)).not.toEqual(none());
});
