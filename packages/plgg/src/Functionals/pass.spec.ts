import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { pass } from "plgg/index";

test("pass returns its argument unchanged (identity function)", () => {
  // Test with objects (should return same reference)
  const obj = { foo: "bar" };
  // Test with arrays (should return same reference)
  const arr = [1, 2, 3];
  // Test with functions
  const fn = () => "test";

  return all([
    // Test with different types
    check(pass(42), toBe(42)),
    check(pass("hello"), toBe("hello")),
    check(pass(true), toBe(true)),
    check(pass(false), toBe(false)),
    check(pass(null), toBe(null)),
    check(pass(undefined), toBe(undefined)),
    check(pass(obj), toBe(obj)),
    check(pass(arr), toBe(arr)),
    check(pass(fn), toBe(fn)),
  ]);
});
