import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { refine } from "plgg/index";

test("refine validates values with custom predicates", () => {
  // Example: Custom validation rules
  const isPositive = (n: number) => n > 0;
  const validatePositive = refine(
    isPositive,
    "Number must be positive",
  );

  return all([
    check(
      validatePositive(5),
      okThen(toBe(5)),
    ),
    check(
      validatePositive(-3),
      errThen((e) =>
        toBe("Number must be positive")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("refine with default error message", () => {
  // Test refine function without custom error message
  const isPositive = (n: number) => n > 0;
  const validatePositive = refine(isPositive);

  return check(
    validatePositive(-5),
    errThen((e) =>
      toBe(
        "The value -5 is not valid according to the predicate",
      )(e.content.message),
    ),
  );
});
