import { test, expect } from "plgg-test";
import { deserializeError } from "plgg/index";

test("DeserializeError basic usage", () => {
  const error = deserializeError({ message: "test error" });
  expect(error.content.message).toBe("test error");
  expect(error.__tag).toBe("DeserializeError");
});
