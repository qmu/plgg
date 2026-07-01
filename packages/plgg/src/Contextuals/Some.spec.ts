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
  asSome,
  pipe,
} from "plgg/index";

test("asSome - safe casting to Some type", () => {
  const someValue = some(42);
  const result1 = pipe(someValue, asSome);

  // Test with non-Some value
  const noneValue = none();
  const result2 = pipe(noneValue, asSome);

  // Test with non-Option value
  const result3 = pipe(42, asSome);

  // Test with null/undefined
  const result4 = pipe(null, asSome);
  const result5 = pipe(undefined, asSome);

  return all([
    check(result1, okThen(toBe(someValue))),
    check(
      result2,
      errThen((e) =>
        toBe("Value is not a Some")(
          e.content.message,
        ),
      ),
    ),
    check(
      result3,
      errThen((e) =>
        toBe("Value is not a Some")(
          e.content.message,
        ),
      ),
    ),
    check(
      result4,
      errThen((e) =>
        toBe("Value is not a Some")(
          e.content.message,
        ),
      ),
    ),
    check(
      result5,
      errThen((e) =>
        toBe("Value is not a Some")(
          e.content.message,
        ),
      ),
    ),
  ]);
});
