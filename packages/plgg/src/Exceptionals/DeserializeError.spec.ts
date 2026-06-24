import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { deserializeError } from "plgg/index";

test("DeserializeError basic usage", () => {
  const error = deserializeError({
    message: "test error",
  });
  return all([
    check(
      error.content.message,
      toBe("test error"),
    ),
    check(error.__tag, toBe("DeserializeError")),
  ]);
});
