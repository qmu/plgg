import {
  test,
  expect,
  assert,
} from "plgg-test/index";
import { AssertionError } from "plgg-test/Core/AssertionError";

const caught = (
  fn: () => void,
): AssertionError | undefined => {
  try {
    fn();
    return undefined;
  } catch (e) {
    return e instanceof AssertionError
      ? e
      : undefined;
  }
};

test("assert passes on a truthy condition", () => {
  // No throw; also narrows in TS (compile-time check).
  const v: number | undefined = 1;
  assert(v !== undefined);
  expect(v).toBe(1);
});

test("assert throws with the default message on falsy", () => {
  const e = caught(() => assert(false));
  expect(e?.message).toBe(
    "assertion failed: value is falsy",
  );
});

test("assert throws with a custom message", () => {
  const e = caught(() => assert(false, "boom"));
  expect(e?.message).toBe("boom");
});

test("assert.fail throws the default message", () => {
  const e = caught(() => assert.fail());
  expect(e?.message).toBe("assert.fail()");
});

test("assert.fail throws a custom message", () => {
  const e = caught(() => assert.fail("nope"));
  expect(e?.message).toBe("nope");
});
