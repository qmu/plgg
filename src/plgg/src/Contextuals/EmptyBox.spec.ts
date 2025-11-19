import { test, expect } from "vitest";
import { Box, EmptyBox, IsEmptyBox, EMPTY_BOX_CONTENT } from "plgg/index";

test("EmptyBox type structure", () => {
  // These are compile-time tests - if they compile, the types work correctly
  type TestEmptyBox = EmptyBox<"empty">;
  type ExpectedStructure = {
    __tag: "empty";
    content: typeof EMPTY_BOX_CONTENT;
  };

  // Type-level assertion that EmptyBox has the correct structure
  const _typeTest: TestEmptyBox extends ExpectedStructure ? true : false = true;
  expect(_typeTest).toBe(true);
});

test("IsEmptyBox type predicate", () => {
  // Type-level tests for IsEmptyBox
  type EmptyBoxTest = IsEmptyBox<EmptyBox<"test">>;
  type BoxTest = IsEmptyBox<Box<"test", string>>;
  type NonBoxTest = IsEmptyBox<{ someOther: "prop" }>;

  const _emptyBoxTest: EmptyBoxTest extends true ? true : false = true;
  const _boxTest: BoxTest extends false ? true : false = true;
  const _nonBoxTest: NonBoxTest extends false ? true : false = true;

  expect(_emptyBoxTest).toBe(true);
  expect(_boxTest).toBe(true);
  expect(_nonBoxTest).toBe(true);
});

test("Box and EmptyBox relationship", () => {
  // Test that EmptyBox is properly defined as Box<TAG, EMPTY_BOX_CONTENT>
  type TestEmptyBox = EmptyBox<"loading">;
  type ExpectedType = Box<"loading", typeof EMPTY_BOX_CONTENT>;

  const _typeTest: TestEmptyBox extends ExpectedType ? true : false = true;
  expect(_typeTest).toBe(true);
});