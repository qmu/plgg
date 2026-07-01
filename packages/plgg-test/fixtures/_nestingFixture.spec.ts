// Fixture: suite nesting + skip path. Loaded by Runner.spec.ts.
// Expected: 2 passed, 1 skipped.
import {
  suite,
  test,
  it,
  check,
  toBe,
} from "plgg-test/index";

suite("outer", () => {
  test("top-level passes", () =>
    check(1, toBe(1)));

  suite("inner", () => {
    it("nested passes", () => check(2, toBe(2)));
  });

  test.skip("skipped test", () =>
    check(1, toBe(2)));
});
