import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
} from "plgg-test";
import {
  Box,
  forContent,
  asBox,
  asObj,
  forProp,
  asSoftStr,
  cast,
  unbox,
  box,
  pipe,
} from "plgg/index";

test("Box type structure", () => {
  // These are compile-time tests - if they compile, the types work correctly
  type TestBox = Box<"test", string>;
  type ExpectedStructure = {
    __tag: "test";
    content: string;
  };

  // Type-level assertion that Box has the correct structure
  const _typeTest: TestBox extends ExpectedStructure
    ? true
    : false = true;
  return check(_typeTest, toBe(true));
});

test("forContent - validates Box from unknown using cast", () => {
  const unknownValue: unknown = {
    __tag: "user",
    content: "john",
  };

  const result = cast(
    unknownValue,
    asBox,
    forContent("user", asSoftStr),
  );

  return check(
    result,
    okThen((c) =>
      all([
        check(c.__tag, toBe("user")),
        check(c.content, toBe("john")),
      ]),
    ),
  );
});

test("forContent - combined pattern with Obj validation", () => {
  const unknownValue: unknown = {
    userProfile: {
      __tag: "profile",
      content: {
        name: "Alice",
        email: "alice@example.com",
      },
    },
  };

  const asUserData = (value: unknown) =>
    cast(
      value,
      asObj,
      forProp("name", asSoftStr),
      forProp("email", asSoftStr),
    );

  const result = cast(
    unknownValue,
    asObj,
    forProp("userProfile", (profile: unknown) =>
      cast(
        profile,
        asBox,
        forContent("profile", asUserData),
      ),
    ),
  );

  return check(
    result,
    okThen((c) =>
      all([
        check(
          c.userProfile.__tag,
          toBe("profile"),
        ),
        check(
          c.userProfile.content.name,
          toBe("Alice"),
        ),
        check(
          c.userProfile.content.email,
          toBe("alice@example.com"),
        ),
      ]),
    ),
  );
});

test("unbox - unboxes single Box", () => {
  const result = pipe(
    "hello",
    box("test"),
    unbox,
  );
  return check(result, toBe("hello"));
});

test("unbox - unboxes nested Boxes", () => {
  const result = pipe(
    "value",
    box("inner"),
    box("outer"),
    unbox,
  );
  return check(result, toBe("value"));
});

test("unbox - unboxes deeply nested Boxes", () => {
  const result = pipe(
    42,
    box("c"),
    box("b"),
    box("a"),
    unbox,
  );
  return check(result, toBe(42));
});

test("unbox - returns non-Box value as-is", () => {
  const result = pipe("not a box", unbox);
  return check(result, toBe("not a box"));
});

test("unbox - returns object non-Box value as-is", () => {
  const result = pipe({ foo: "bar" }, unbox);
  return check(result, toEqual({ foo: "bar" }));
});
