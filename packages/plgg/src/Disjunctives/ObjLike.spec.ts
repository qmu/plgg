import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
  someThen,
  shouldBeNone,
} from "plgg-test";
import {
  isObjLike,
  forProp,
  forOptionProp,
  hasProp,
  asNum,
  asStr,
} from "plgg/index";

test("isObjLike accepts plain objects", () =>
  all([
    check(isObjLike({}), toBe(true)),
    check(isObjLike({ a: 1 }), toBe(true)),
  ]));

test("isObjLike rejects primitives and null", () =>
  all([
    check(isObjLike(null), toBe(false)),
    check(isObjLike(undefined), toBe(false)),
    check(isObjLike("str"), toBe(false)),
    check(isObjLike(42), toBe(false)),
    check(isObjLike(true), toBe(false)),
  ]));

test("forProp validates and preserves other fields", () => {
  const result = forProp(
    "age",
    asNum,
  )({
    age: 30,
    name: "alice",
  });
  return check(
    result,
    okThen((c) =>
      all([
        check(c.age, toBe(30)),
        check(c.name, toBe("alice")),
      ]),
    ),
  );
});

test("forProp fails for missing property", () => {
  const result = forProp(
    "missing",
    asNum,
  )({
    present: 1,
  });
  return check(
    result,
    errThen((e) =>
      toContain("Property 'missing' not found")(
        e.content.message,
      ),
    ),
  );
});

test("forProp fails for non-object input", () => {
  const result = forProp(
    "key",
    asNum,
  )("not an object");
  return check(
    result,
    errThen((e) =>
      toBe("Not an object")(e.content.message),
    ),
  );
});

test("forProp fails for null input", () => {
  const result = forProp("key", asNum)(null);
  return check(
    result,
    errThen((e) =>
      toBe("Not an object")(e.content.message),
    ),
  );
});

test("forOptionProp wraps present values in Some", () => {
  const result = forOptionProp(
    "label",
    asStr,
  )({
    label: "hi",
    age: 10,
  });
  return check(
    result,
    okThen((c) =>
      check(
        c.label,
        someThen(
          toEqual({
            __tag: "Str",
            content: "hi",
          }),
        ),
      ),
    ),
  );
});

test("forOptionProp yields None for missing property", () => {
  const result = forOptionProp(
    "label",
    asStr,
  )({ other: 1 });
  return check(
    result,
    okThen((c) => check(c.label, shouldBeNone())),
  );
});

test("forOptionProp fails for non-object input", () => {
  const result = forOptionProp(
    "key",
    asStr,
  )("scalar");
  return check(
    result,
    errThen((e) =>
      toBe("Not an object")(e.content.message),
    ),
  );
});

test("forOptionProp fails for null input", () => {
  const result = forOptionProp(
    "key",
    asStr,
  )(null);
  return check(
    result,
    errThen((e) =>
      toBe("Not an object")(e.content.message),
    ),
  );
});

test("hasProp checks property existence", () =>
  all([
    check(hasProp({ a: 1 }, "a"), toBe(true)),
    check(hasProp({ a: 1 }, "b"), toBe(false)),
  ]));
