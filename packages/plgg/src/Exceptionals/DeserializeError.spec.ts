import { test, expect } from "vitest";
import { DeserializeError } from "plgg/index";

test("DeserializeError basic usage", () => {
  const error = new DeserializeError({ message: "test error" });
  expect(error.message).toBe("test error");
  expect(error.name).toBe("DeserializeError");
});
