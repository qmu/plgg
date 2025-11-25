import { test, expect, assert } from "vitest";
import {
  Box,
  forContent,
  asBox,
  asObj,
  forProp,
  asSoftStr,
  isOk,
  cast,
  unbox,
  newBox,
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
  expect(_typeTest).toBe(true);
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

  assert(isOk(result));
  expect(result.content.__tag).toBe("user");
  expect(result.content.content).toBe("john");
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

  assert(isOk(result));
  expect(result.content.userProfile.__tag).toBe(
    "profile",
  );
  expect(
    result.content.userProfile.content.name,
  ).toBe("Alice");
  expect(
    result.content.userProfile.content.email,
  ).toBe("alice@example.com");
});

test("unbox - unboxes single Box", () => {
  const result = pipe(
    "hello",
    newBox("test"),
    unbox,
  );
  expect(result).toBe("hello");
});

test("unbox - unboxes nested Boxes", () => {
  const result = pipe(
    "value",
    newBox("inner"),
    newBox("outer"),
    unbox,
  );
  expect(result).toBe("value");
});

test("unbox - unboxes deeply nested Boxes", () => {
  const result = pipe(
    42,
    newBox("c"),
    newBox("b"),
    newBox("a"),
    unbox,
  );
  expect(result).toBe(42);
});

test("unbox - returns non-Box value as-is", () => {
  const result = pipe("not a box", unbox);
  expect(result).toBe("not a box");
});

test("unbox - returns object non-Box value as-is", () => {
  const result = pipe({ foo: "bar" }, unbox);
  expect(result).toEqual({ foo: "bar" });
});
