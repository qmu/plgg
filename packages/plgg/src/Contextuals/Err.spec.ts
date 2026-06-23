import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { ok, err, asErr, pipe } from "plgg/index";

test("asErr - safe casting to Err type", () => {
  const errValue = err("error");
  const result1 = pipe(errValue, asErr);

  // Test with non-Err value
  const okValue = ok(42);
  const result2 = pipe(okValue, asErr);

  // Test with non-Result value
  const result3 = pipe("hello", asErr);

  // Test with null/undefined
  const result4 = pipe(null, asErr);
  const result5 = pipe(undefined, asErr);

  return all([
    check(result1, okThen(toBe(errValue))),
    check(
      result2,
      errThen((e) =>
        toBe("Value is not an Err")(
          e.content.message,
        ),
      ),
    ),
    check(
      result3,
      errThen((e) =>
        toBe("Value is not an Err")(
          e.content.message,
        ),
      ),
    ),
    check(
      result4,
      errThen((e) =>
        toBe("Value is not an Err")(
          e.content.message,
        ),
      ),
    ),
    check(
      result5,
      errThen((e) =>
        toBe("Value is not an Err")(
          e.content.message,
        ),
      ),
    ),
  ]);
});
