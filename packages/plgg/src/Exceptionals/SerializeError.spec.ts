import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { serializeError } from "plgg/index";

test("SerializeError basic usage", () => {
  const error = serializeError({
    message: "test error",
  });
  return all([
    check(
      error.content.message,
      toBe("test error"),
    ),
    check(error.__tag, toBe("SerializeError")),
  ]);
});
