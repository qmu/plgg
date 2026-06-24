import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  some,
  none,
  asNone,
  pipe,
} from "plgg/index";

test("asNone - safe casting to None type", () => {
  const noneValue = none();
  const result1 = pipe(noneValue, asNone);

  // Test with non-None value
  const someValue = some(42);
  const result2 = pipe(someValue, asNone);

  // Test with non-Option value
  const result3 = pipe(42, asNone);

  // Test with null/undefined
  const result4 = pipe(null, asNone);
  const result5 = pipe(undefined, asNone);

  return all([
    check(result1, okThen(toBe(noneValue))),
    check(
      result2,
      errThen((e) =>
        toBe("Value is not a None")(
          e.content.message,
        ),
      ),
    ),
    check(
      result3,
      errThen((e) =>
        toBe("Value is not a None")(
          e.content.message,
        ),
      ),
    ),
    check(
      result4,
      errThen((e) =>
        toBe("Value is not a None")(
          e.content.message,
        ),
      ),
    ),
    check(
      result5,
      errThen((e) =>
        toBe("Value is not a None")(
          e.content.message,
        ),
      ),
    ),
  ]);
});
