import { test, expect, vi } from "vitest";
import { debug } from "plgg/index";

test("debug logs values without changing them", () => {
  // Example: Debugging values in processing pipeline
  const consoleSpy = vi
    .spyOn(console, "debug")
    .mockImplementation(() => {});

  const result = debug("test-value");
  expect(result).toBe("test-value");
  expect(consoleSpy).toHaveBeenCalledWith(
    "test-value",
  );

  consoleSpy.mockRestore();
});
