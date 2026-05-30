import { test, expect } from "vitest";
import { Box, Icon, IsIcon, ICON_CONTENT } from "plgg/index";

test("Icon type structure", () => {
  // These are compile-time tests - if they compile, the types work correctly
  type TestIcon = Icon<"empty">;
  type ExpectedStructure = {
    __tag: "empty";
    content: typeof ICON_CONTENT;
  };

  // Type-level assertion that Icon has the correct structure
  const _typeTest: TestIcon extends ExpectedStructure ? true : false = true;
  expect(_typeTest).toBe(true);
});

test("IsIcon type predicate", () => {
  // Type-level tests for IsIcon
  type IconTest = IsIcon<Icon<"test">>;
  type BoxTest = IsIcon<Box<"test", string>>;
  type NonBoxTest = IsIcon<{ someOther: "prop" }>;

  const _iconTest: IconTest extends true ? true : false = true;
  const _boxTest: BoxTest extends false ? true : false = true;
  const _nonBoxTest: NonBoxTest extends false ? true : false = true;

  expect(_iconTest).toBe(true);
  expect(_boxTest).toBe(true);
  expect(_nonBoxTest).toBe(true);
});

test("Box and Icon relationship", () => {
  // Test that Icon is properly defined as Box<TAG, ICON_CONTENT>
  type TestIcon = Icon<"loading">;
  type ExpectedType = Box<"loading", typeof ICON_CONTENT>;

  const _typeTest: TestIcon extends ExpectedType ? true : false = true;
  expect(_typeTest).toBe(true);
});
