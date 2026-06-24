import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  Result,
  conclude,
  pipe,
  ok,
  err,
} from "plgg/index";

test("conclude - success case with all valid results", () => {
  const parseNumber = (
    s: string,
  ): Result<number, Error> => {
    const num = Number(s);
    return isNaN(num)
      ? err(new Error("Invalid number"))
      : ok(num);
  };

  return all([
    check(
      pipe([], conclude(parseNumber)),
      okThen(toEqual([])),
    ),
    check(
      pipe(
        ["1", "2", "3"],
        conclude(parseNumber),
      ),
      okThen(toEqual([1, 2, 3])),
    ),
    check(
      pipe(
        ["42", "3.14", "0"],
        conclude(parseNumber),
      ),
      okThen(toEqual([42, 3.14, 0])),
    ),
  ]);
});

test("conclude - failure case with first error returned", () => {
  const parsePositiveNumber = (
    s: string,
  ): Result<number, Error> => {
    const num = Number(s);
    if (isNaN(num)) {
      return err(
        new Error("Invalid number: " + s),
      );
    }
    if (num <= 0) {
      return err(
        new Error("Non-positive number: " + s),
      );
    }
    return ok(num);
  };

  return all([
    check(
      pipe(
        ["invalid"],
        conclude(parsePositiveNumber),
      ),
      errThen((e) =>
        all([
          check(e.length, toBe(1)),
          check(
            e[0]?.message,
            toBe("Invalid number: invalid"),
          ),
        ]),
      ),
    ),
    check(
      pipe(
        ["1", "invalid", "3"],
        conclude(parsePositiveNumber),
      ),
      errThen((e) =>
        all([
          check(e.length, toBe(1)),
          check(
            e[0]?.message,
            toBe("Invalid number: invalid"),
          ),
        ]),
      ),
    ),
    check(
      pipe(
        ["1", "-5", "3"],
        conclude(parsePositiveNumber),
      ),
      errThen((e) =>
        all([
          check(e.length, toBe(1)),
          check(
            e[0]?.message,
            toBe("Non-positive number: -5"),
          ),
        ]),
      ),
    ),
    check(
      pipe(
        ["-1", "invalid", "0"],
        conclude(parsePositiveNumber),
      ),
      errThen((e) =>
        all([
          check(e.length, toBe(3)),
          check(
            e[0]?.message,
            toBe("Non-positive number: -1"),
          ),
          check(
            e[1]?.message,
            toBe("Invalid number: invalid"),
          ),
          check(
            e[2]?.message,
            toBe("Non-positive number: 0"),
          ),
        ]),
      ),
    ),
  ]);
});

test("conclude - mixed types transformation", () => {
  const processValue = (
    x: number,
  ): Result<string, Error> => {
    if (x < 0) {
      return err(
        new Error("Negative value not allowed"),
      );
    }
    if (x === 0) {
      return ok("zero");
    }
    if (x === 1) {
      return ok("one");
    }
    return ok(`number: ${x}`);
  };

  return all([
    check(
      pipe(
        [0, 1, 2, 10],
        conclude(processValue),
      ),
      okThen(
        toEqual([
          "zero",
          "one",
          "number: 2",
          "number: 10",
        ]),
      ),
    ),
    check(
      pipe([1, -1, 2], conclude(processValue)),
      errThen((e) =>
        all([
          check(e.length, toBe(1)),
          check(
            e[0]?.message,
            toBe("Negative value not allowed"),
          ),
        ]),
      ),
    ),
  ]);
});

test("conclude - processes all elements but returns first error", () => {
  let callCount = 0;
  const trackingFunction = (
    x: number,
  ): Result<number, Error> => {
    callCount++;
    if (x === 2) {
      return err(new Error("Error at 2"));
    }
    return ok(x * 10);
  };

  callCount = 0;
  const r1 = pipe(
    [1, 2, 3, 4],
    conclude(trackingFunction),
  );
  const a1 = all([
    check(
      r1,
      errThen((e) =>
        all([
          check(e.length, toBe(1)),
          check(
            e[0]?.message,
            toBe("Error at 2"),
          ),
        ]),
      ),
    ),
    check(callCount, toBe(4)),
  ]);

  callCount = 0;
  const r2 = pipe(
    [1, 3, 4],
    conclude(trackingFunction),
  );
  const a2 = all([
    check(r2, okThen(toEqual([10, 30, 40]))),
    check(callCount, toBe(3)),
  ]);

  return all([a1, a2]);
});
