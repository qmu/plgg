// Fixture: describe nesting + skip path. Loaded by Runner.spec.ts.
// Expected: 2 passed, 1 skipped.
import {
  describe,
  test,
  it,
  expect,
} from "plgg-test/index";

describe("outer", () => {
  test("top-level passes", () => {
    expect(1).toBe(1);
  });

  describe("inner", () => {
    it("nested passes", () => {
      expect(2).toBe(2);
    });
  });

  test.skip("skipped test", () => {
    expect(1).toBe(2);
  });
});
