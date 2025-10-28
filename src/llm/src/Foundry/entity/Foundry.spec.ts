import { test, expect, assert } from "vitest";
import { isOk, isErr } from "plgg";
import { asFoundry } from "./Foundry";
import type { FoundryArg } from "./Foundry";

/**
 * Tests asFoundry validation with a valid Foundry object.
 */
test("asFoundry validation - valid foundry", () => {
  const validFoundry: FoundryArg = {
    description: "Test foundry description",
    processors: [
      {
        id: "test-processor",
        description: "A test processor",
        inputType: "string",
        outputType: "string",
        process: (input) => input.value,
      },
    ],
    switchers: [
      {
        id: "test-switcher",
        description: "A test switcher",
        input: "string",
        outputWhenTrue: "string",
        outputWhenFalse: "error",
        check: (input) => [true, input.value],
      },
    ],
  };

  const result = asFoundry(validFoundry);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(1);
  expect(result.content.switchers).toHaveLength(1);
  expect(result.content.processors[0]?.id).toBe("test-processor");
  expect(result.content.switchers[0]?.id).toBe("test-switcher");
});

/**
 * Tests asFoundry validation with empty processors and switchers arrays.
 */
test("asFoundry validation - empty processors and switchers", () => {
  const foundryArg: FoundryArg = {
    description: "Empty foundry",
    processors: [],
    switchers: [],
  };

  const result = asFoundry(foundryArg);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(0);
  expect(result.content.switchers).toHaveLength(0);
});

/**
 * Tests asFoundry validation with multiple processors and switchers.
 */
test("asFoundry validation - multiple processors and switchers", () => {
  const foundryArg: FoundryArg = {
    description: "Multi-component foundry",
    processors: [
      {
        id: "processor-1",
        description: "First processor",
        inputType: "string",
        outputType: "number",
        process: () => 1,
      },
      {
        id: "processor-2",
        description: "Second processor",
        inputType: "number",
        outputType: "string",
        process: () => "result",
      },
    ],
    switchers: [
      {
        id: "switcher-1",
        description: "First switcher",
        input: "string",
        outputWhenTrue: "string",
        outputWhenFalse: "error",
        check: (input) => [true, input.value],
      },
      {
        id: "switcher-2",
        description: "Second switcher",
        input: "number",
        outputWhenTrue: "number",
        outputWhenFalse: "error",
        check: () => [false, "error"],
      },
    ],
  };

  const result = asFoundry(foundryArg);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(2);
  expect(result.content.switchers).toHaveLength(2);
});

/**
 * Tests asFoundry validation failure when description is missing.
 */
test("asFoundry validation - missing description", () => {
  const invalidFoundry = {
    processors: [],
    switchers: [],
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain("description");
});

/**
 * Tests asFoundry validation failure when processors is missing.
 */
test("asFoundry validation - missing processors", () => {
  const invalidFoundry = {
    description: "Test foundry",
    switchers: [],
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain("processors");
});

/**
 * Tests asFoundry validation failure when switchers is missing.
 */
test("asFoundry validation - missing switchers", () => {
  const invalidFoundry = {
    description: "Test foundry",
    processors: [],
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain("switchers");
});

/**
 * Tests asFoundry validation failure with invalid processor structure.
 */
test("asFoundry validation - invalid processor", () => {
  const foundryArg = {
    description: "Test foundry",
    processors: [
      {
        id: "test",
        description: "test",
        // missing inputType, outputType, and process
      },
    ],
    switchers: [],
  };

  const result = asFoundry(foundryArg as any);
  assert(isErr(result));
  expect(result.content.message).toContain("Array element");
});

/**
 * Tests asFoundry validation failure with invalid switcher structure.
 */
test("asFoundry validation - invalid switcher", () => {
  const foundryArg = {
    description: "Test foundry",
    processors: [],
    switchers: [
      {
        id: "test",
        description: "test",
        // missing input, outputWhenTrue, outputWhenFalse, and check
      },
    ],
  };

  const result = asFoundry(foundryArg as any);
  assert(isErr(result));
  expect(result.content.message).toContain("Array element");
});

/**
 * Tests asFoundry validation failure when processors is not an array.
 */
test("asFoundry validation - processors not array", () => {
  const invalidFoundry = {
    description: "Test foundry",
    processors: "not an array",
    switchers: [],
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain("array");
});

/**
 * Tests asFoundry validation failure when switchers is not an array.
 */
test("asFoundry validation - switchers not array", () => {
  const invalidFoundry = {
    description: "Test foundry",
    processors: [],
    switchers: "not an array",
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain("array");
});
