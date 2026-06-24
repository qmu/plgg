import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
  someThen,
  shouldBeNone,
} from "plgg-test";
import {
  isObj,
  asObj,
  forOptionProp,
  forProp,
  asSoftStr,
  asNum,
} from "plgg/index";

/**
 * Validates isObj type guard for various value types.
 */
test("isObj type guard", () =>
  all([
    check(isObj({}), toBe(true)),
    check(isObj({ a: 1 }), toBe(true)),
    check(
      isObj({ a: "test", b: 123, c: true }),
      toBe(true),
    ),
    check(isObj([]), toBe(true)), // Arrays are records in JavaScript runtime
    check(isObj(null), toBe(false)),
    check(isObj(undefined), toBe(false)),
    check(isObj("string"), toBe(false)),
    check(isObj(123), toBe(false)),
    check(isObj(true), toBe(false)),
  ]));

/**
 * Tests asObj validation for records and non-record types.
 */
test("asObj validation", async () =>
  all([
    check(asObj({}), okThen(toEqual({}))),
    check(
      asObj({ a: 1, b: "test" }),
      okThen(toEqual({ a: 1, b: "test" })),
    ),
    check(
      asObj([1, 2, 3]),
      okThen(toEqual([1, 2, 3])),
    ),
    check(
      asObj(null),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
    check(
      asObj(undefined),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
    check(
      asObj("test"),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
    check(
      asObj(123),
      errThen((e) =>
        toBe("Not record")(e.content.message),
      ),
    ),
  ]));

/**
 * Validates property extraction from records with successful cases.
 */
test("Obj.prop validation - success cases", async () => {
  const rec = { name: "John", age: 30 };

  return all([
    check(
      forProp("name", asSoftStr)(rec),
      okThen(toEqual({ name: "John", age: 30 })),
    ),
    check(
      forProp("age", asNum)(rec),
      okThen(toEqual({ name: "John", age: 30 })),
    ),
  ]);
});

/**
 * Tests property validation error handling for missing properties.
 */
test("Obj.prop validation - missing property", async () => {
  const rec = { name: "John" };

  return check(
    forProp("age", asNum)(rec),
    errThen((e) =>
      toBe("Property 'age' not found")(
        e.content.message,
      ),
    ),
  );
});

/**
 * Validates error handling when property types don't match expected types.
 */
test("Obj.prop validation - invalid property type", async () => {
  const rec = { name: "John", age: "thirty" };

  return check(
    forProp("age", asNum)(rec),
    errThen((e) =>
      toBe("Value is not a number")(
        e.content.message,
      ),
    ),
  );
});

/**
 * Tests that property validation preserves existing properties in record.
 */
test("Obj.prop validation - adds property to record type", async () => {
  const rec = { existing: "value" };
  const newKey = "newProp";

  return check(
    forProp(
      newKey,
      asSoftStr,
    )({ ...rec, [newKey]: "test" }),
    okThen(
      toEqual({
        existing: "value",
        newProp: "test",
      }),
    ),
  );
});

/**
 * Validates optional property extraction when properties exist.
 */
test("Obj.optional validation - property exists", async () => {
  const rec = { name: "John", age: 30 };

  return all([
    check(
      forOptionProp("name", asSoftStr)(rec),
      okThen((c) =>
        all([
          check(
            c.name,
            someThen(toBe("John")),
          ),
          check(c.age, toBe(30)),
        ]),
      ),
    ),
    check(
      forOptionProp("age", asNum)(rec),
      okThen((c) =>
        check(c.age, someThen(toBe(30))),
      ),
    ),
  ]);
});

/**
 * Tests optional property handling when properties are absent.
 */
test("Obj.optional validation - property missing", async () => {
  const rec = { name: "John" };

  return check(
    forOptionProp("age", asNum)(rec),
    okThen((c) =>
      all([
        check(c.age, shouldBeNone()),
        check(c.name, toBe("John")),
      ]),
    ),
  );
});

/**
 * Validates error handling for optional properties with invalid types.
 */
test("Obj.optional validation - invalid property type", async () => {
  const rec = { name: "John", age: "thirty" };

  return check(
    forOptionProp("age", asNum)(rec),
    errThen((e) =>
      toBe("Value is not a number")(
        e.content.message,
      ),
    ),
  );
});

/**
 * Tests optional property validation with absent properties in record.
 */
test("Obj.optional validation - adds optional property to record type", async () => {
  const rec = { existing: "value" };

  return check(
    forOptionProp("optionalProp", asSoftStr)(rec),
    okThen((c) =>
      all([
        check(
          c.optionalProp,
          shouldBeNone(),
        ),
        check(c.existing, toBe("value")),
      ]),
    ),
  );
});

/**
 * Validates complex record structures with chained property validations.
 */
test("Complex record validation with multiple properties", async () => {
  const rec = {
    name: "John",
    age: 30,
    email: "john@example.com",
  };

  // Demonstrates chained property validation workflow
  return check(
    forProp("name", asSoftStr)(rec),
    okThen((named) =>
      check(
        forProp("age", asNum)(named),
        okThen((aged) =>
          check(
            forOptionProp(
              "email",
              asSoftStr,
            )(aged),
            okThen((c) =>
              check(
                c.email,
                someThen(
                  toBe("john@example.com"),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
});
