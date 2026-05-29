import { test, expect } from "vitest";
import { SerializeError } from "plgg/index";

test("SerializeError basic usage", () => {
  const error = new SerializeError({ message: "test error" });
  expect(error.message).toBe("test error");
  expect(error.name).toBe("SerializeError");
});
