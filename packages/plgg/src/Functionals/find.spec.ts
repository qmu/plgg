import {
  test,
  check,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { find } from "plgg/index";

test("find with predicate function returns Ok when found", () => {
  const numbers = [1, 2, 3, 4, 5];
  const findEven = find(
    (n: number) => n % 2 === 0,
  );

  return check(
    findEven(numbers),
    okThen(toBe(2)),
  );
});

test("find with predicate function returns Err when not found", () => {
  const numbers = [1, 3, 5];
  const findEven = find(
    (n: number) => n % 2 === 0,
  );

  return check(
    findEven(numbers),
    errThen((e) =>
      toBe(
        "No element found matching the predicate",
      )(e.message),
    ),
  );
});

test("find with object and custom error message", () => {
  const numbers = [1, 2, 3];
  const findNegative = find({
    predicate: (n: number) => n < 0,
    errMessage: "No negative number found",
  });

  return check(
    findNegative(numbers),
    errThen((e) =>
      toBe("No negative number found")(
        e.message,
      ),
    ),
  );
});

test("find with object without custom error message", () => {
  const numbers = [1, 2, 3];
  const findLarge = find<number>({
    predicate: (n) => n > 100,
  });

  return check(
    findLarge(numbers),
    errThen((e) =>
      toBe(
        "No element found matching the predicate",
      )(e.message),
    ),
  );
});

test("find with object returns Ok when found", () => {
  const numbers = [1, 2, 3];
  const findTwo = find<number>({
    predicate: (n) => n === 2,
    errMessage: "Two not found",
  });

  return check(
    findTwo(numbers),
    okThen(toBe(2)),
  );
});
