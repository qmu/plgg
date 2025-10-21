import { test, expect, assert } from "vitest";
import {
  Box,
  EmptyBox,
  IsBox,
  forContent,
  asBox,
  asObj,
  forProp,
  asStr,
  isOk,
  cast,
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

test("IsBox type predicate", () => {
  // Type-level tests for IsBox
  type BoxTest = IsBox<Box<"test", string>>;
  type EmptyBoxTest = IsBox<EmptyBox<"test">>;
  type NonBoxTest = IsBox<{ someOther: "prop" }>;

  const _boxTest: BoxTest extends true
    ? true
    : false = true;
  const _emptyBoxTest: EmptyBoxTest extends false
    ? true
    : false = true;
  const _nonBoxTest: NonBoxTest extends false
    ? true
    : false = true;

  expect(_boxTest).toBe(true);
  expect(_emptyBoxTest).toBe(true);
  expect(_nonBoxTest).toBe(true);
});

test("forContent - validates Box from unknown using cast", () => {
  const unknownValue: unknown = {
    __tag: "user",
    content: "john",
  };

  const result = cast(
    unknownValue,
    asBox,
    forContent("user", asStr),
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
      forProp("name", asStr),
      forProp("email", asStr),
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
