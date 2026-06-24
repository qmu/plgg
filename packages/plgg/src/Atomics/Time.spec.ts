import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { isTime, asTime } from "plgg/index";

test("Time.is type guard", () =>
  all([
    check(isTime(new Date()), toBe(true)),
    check(
      isTime(new Date("2023-01-01")),
      toBe(true),
    ),
    check(isTime("2023-01-01"), toBe(false)),
    check(isTime(1672531200000), toBe(false)),
    check(isTime(null), toBe(false)),
    check(isTime(undefined), toBe(false)),
    check(isTime({}), toBe(false)),
    check(isTime([]), toBe(false)),
  ]));

test("Time.cast validation with Date objects", () => {
  const date = new Date("2023-01-01");
  const currentDate = new Date();
  return all([
    check(asTime(date), okThen(toBe(date))),
    check(
      asTime(currentDate),
      okThen(toBe(currentDate)),
    ),
  ]);
});

test("Time.cast validation with date strings", () =>
  all([
    check(
      asTime("2023-01-01T00:00:00.000Z"),
      okThen(
        toEqual(
          new Date("2023-01-01T00:00:00.000Z"),
        ),
      ),
    ),
    check(
      asTime("2023-01-01"),
      okThen(
        toEqual(new Date("2023-01-01")),
      ),
    ),
    check(
      asTime("01/01/2023"),
      okThen(
        toEqual(new Date("01/01/2023")),
      ),
    ),
  ]));

test("Time.cast validation with invalid inputs", () =>
  all([
    check(
      asTime("not-a-date"),
      errThen((e) =>
        toBe("Value is not a Date")(
          e.content.message,
        ),
      ),
    ),
    check(
      asTime(1672531200000),
      errThen((e) =>
        toBe("Value is not a Date")(
          e.content.message,
        ),
      ),
    ),
    check(
      asTime(true),
      errThen((e) =>
        toBe("Value is not a Date")(
          e.content.message,
        ),
      ),
    ),
    check(
      asTime(null),
      errThen((e) =>
        toBe("Value is not a Date")(
          e.content.message,
        ),
      ),
    ),
    check(
      asTime(undefined),
      errThen((e) =>
        toBe("Value is not a Date")(
          e.content.message,
        ),
      ),
    ),
    check(
      asTime(""),
      errThen((e) =>
        toBe("Value is not a Date")(
          e.content.message,
        ),
      ),
    ),
  ]));
