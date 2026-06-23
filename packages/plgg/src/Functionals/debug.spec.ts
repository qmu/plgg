import {
  test,
  check,
  all,
  toBe,
  vi,
} from "plgg-test";
import { deepEqual } from "plgg-test/Expect/equals";
import { debug } from "plgg/index";

test("debug logs values without changing them", () => {
  // Example: Debugging values in processing pipeline
  const consoleSpy = vi
    .spyOn(console, "debug")
    .mockImplementation(() => {});

  const result = debug("test-value");
  const assertion = all([
    check(result, toBe("test-value")),
    check(
      consoleSpy.mock.calls.some((c) =>
        deepEqual(c, ["test-value"]),
      ),
      toBe(true),
    ),
  ]);

  consoleSpy.mockRestore();
  return assertion;
});
