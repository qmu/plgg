import {
  test,
  check,
  toBe,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { atProp, isErr } from "plgg/index";

test("atProp returns Ok for existing property", () =>
  check(
    atProp("name")({
      name: "Alice",
      age: 30,
    }),
    okThen(toBe("Alice")),
  ));

test("atProp returns nested object value", () => {
  const nested = { a: 1 };
  return check(
    atProp("data")({ data: nested }),
    okThen(toBe(nested)),
  );
});

test("atProp returns Err for missing property", () =>
  check(
    atProp("missing")({ present: 1 }),
    errThen((e) =>
      toContain(
        "Cannot access property 'missing'",
      )(e.content.message),
    ),
  ));

test("atProp returns Err for non-object value", () =>
  check(
    atProp("name")("not-object"),
    errThen((e) =>
      toContain(
        "Cannot access property 'name'",
      )(e.content.message),
    ),
  ));

test("atProp returns Err for null", () =>
  check(
    isErr(atProp("name")(null)),
    toBe(true),
  ));

test("atProp returns Err for undefined", () =>
  check(
    isErr(atProp("name")(undefined)),
    toBe(true),
  ));
