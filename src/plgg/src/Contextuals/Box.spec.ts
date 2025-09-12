import { test, expect } from "vitest";
import { Box, EmptyBox, IsBox, IsEmptyBox } from "plgg/index";

test("Box type structure", () => {
  // These are compile-time tests - if they compile, the types work correctly
  type TestBox = Box<"test", string>;
  type ExpectedStructure = {
    __tag: "test";
    content: string;
  };

  // Type-level assertion that Box has the correct structure
  const _typeTest: TestBox extends ExpectedStructure ? true : false = true;
  expect(_typeTest).toBe(true);
});

test("EmptyBox type structure", () => {
  // These are compile-time tests - if they compile, the types work correctly
  type TestEmptyBox = EmptyBox<"empty">;
  type ExpectedStructure = {
    __tag: "empty";
    content: undefined;
  };

  // Type-level assertion that EmptyBox has the correct structure
  const _typeTest: TestEmptyBox extends ExpectedStructure ? true : false = true;
  expect(_typeTest).toBe(true);
});

test("IsBox type predicate", () => {
  // Type-level tests for IsBox
  type BoxTest = IsBox<Box<"test", string>>;
  type EmptyBoxTest = IsBox<EmptyBox<"test">>;
  type NonBoxTest = IsBox<{ someOther: "prop" }>;

  const _boxTest: BoxTest extends true ? true : false = true;
  const _emptyBoxTest: EmptyBoxTest extends false ? true : false = true;
  const _nonBoxTest: NonBoxTest extends false ? true : false = true;

  expect(_boxTest).toBe(true);
  expect(_emptyBoxTest).toBe(true);
  expect(_nonBoxTest).toBe(true);
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
  // Test that EmptyBox is properly defined as Box<TAG, undefined>
  type TestEmptyBox = EmptyBox<"loading">;
  type ExpectedType = Box<"loading", undefined>;

  const _typeTest: TestEmptyBox extends ExpectedType ? true : false = true;
  expect(_typeTest).toBe(true);
});
