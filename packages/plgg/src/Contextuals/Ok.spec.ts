import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { ok, err, asOk, pipe } from "plgg/index";

test("asOk - safe casting to Ok type", () => {
  const okValue = ok(42);
  const result1 = pipe(okValue, asOk);

  // Test with non-Ok value
  const errValue = err("error");
  const result2 = pipe(errValue, asOk);

  // Test with non-Result value
  const result3 = pipe(42, asOk);

  // Test with null/undefined
  const result4 = pipe(null, asOk);
  const result5 = pipe(undefined, asOk);

  return all([
    check(result1, okThen(toBe(okValue))),
    check(
      result2,
      errThen((e) =>
        toBe("Value is not an Ok")(
          e.content.message,
        ),
      ),
    ),
    check(
      result3,
      errThen((e) =>
        toBe("Value is not an Ok")(
          e.content.message,
        ),
      ),
    ),
    check(
      result4,
      errThen((e) =>
        toBe("Value is not an Ok")(
          e.content.message,
        ),
      ),
    ),
    check(
      result5,
      errThen((e) =>
        toBe("Value is not an Ok")(
          e.content.message,
        ),
      ),
    ),
  ]);
});
