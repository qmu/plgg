import { test, expect } from "plgg-test";
import { serializeError } from "plgg/index";

test("SerializeError basic usage", () => {
  const error = serializeError({ message: "test error" });
  expect(error.content.message).toBe("test error");
  expect(error.__tag).toBe("SerializeError");
});
