import { test, expect, assert } from "vitest";
import { isOk, isErr } from "plgg";
import {
  FoundrySpecArg,
  asFoundrySpec,
} from "autoplgg/index";

/**
 * Tests asFoundrySpec validation with a valid Foundry object.
 */
test("asFoundrySpec validation - valid foundry", () => {
  const validFoundry: FoundrySpecArg = {
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

  const result = asFoundrySpec(validFoundry);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(
    1,
  );
  expect(result.content.switchers).toHaveLength(
    1,
  );
  expect(
    result.content.processors[0]?.id.content,
  ).toBe("test-processor");
  expect(
    result.content.switchers[0]?.id.content,
  ).toBe("test-switcher");
});

/**
 * Tests asFoundrySpec validation with empty processors and switchers arrays.
 */
test("asFoundrySpec validation - empty processors and switchers", () => {
  const foundryArg: FoundrySpecArg = {
    description: "Empty foundry",
    processors: [],
    switchers: [],
  };

  const result = asFoundrySpec(foundryArg);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(
    0,
  );
  expect(result.content.switchers).toHaveLength(
    0,
  );
});

/**
 * Tests asFoundrySpec validation with multiple processors and switchers.
 */
test("asFoundrySpec validation - multiple processors and switchers", () => {
  const foundryArg: FoundrySpecArg = {
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

  const result = asFoundrySpec(foundryArg);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(
    2,
  );
  expect(result.content.switchers).toHaveLength(
    2,
  );
});

/**
 * Tests asFoundrySpec validation failure when description is missing.
 */
test("asFoundrySpec validation - missing description", () => {
  const invalidFoundry = {
    processors: [],
    switchers: [],
  };

  const result = asFoundrySpec(
    invalidFoundry as any,
  );
  assert(isErr(result));
  expect(result.content.message).toContain(
    "description",
  );
});

/**
 * Tests asFoundrySpec validation failure when processors is missing.
 */
test("asFoundrySpec validation - missing processors", () => {
  const invalidFoundry = {
    description: "Test foundry",
    switchers: [],
  };

  const result = asFoundrySpec(
    invalidFoundry as any,
  );
  assert(isErr(result));
  expect(result.content.message).toContain(
    "processors",
  );
});

/**
 * Tests asFoundrySpec validation failure when switchers is missing.
 */
test("asFoundrySpec validation - missing switchers", () => {
  const invalidFoundry = {
    description: "Test foundry",
    processors: [],
  };

  const result = asFoundrySpec(
    invalidFoundry as any,
  );
  assert(isErr(result));
  expect(result.content.message).toContain(
    "switchers",
  );
});

/**
 * Tests asFoundrySpec validation failure with invalid processor structure.
 */
test("asFoundrySpec validation - invalid processor", () => {
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

  const result = asFoundrySpec(foundryArg as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Array element",
  );
});

/**
 * Tests asFoundrySpec validation failure with invalid switcher structure.
 */
test("asFoundrySpec validation - invalid switcher", () => {
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

  const result = asFoundrySpec(foundryArg as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Array element",
  );
});

/**
 * Tests asFoundrySpec validation failure when processors is not an array.
 */
test("asFoundrySpec validation - processors not array", () => {
  const invalidFoundry = {
    description: "Test foundry",
    processors: "not an array",
    switchers: [],
  };

  const result = asFoundrySpec(
    invalidFoundry as any,
  );
  assert(isErr(result));
  expect(result.content.message).toContain(
    "array",
  );
});

/**
 * Tests asFoundrySpec validation failure when switchers is not an array.
 */
test("asFoundrySpec validation - switchers not array", () => {
  const invalidFoundry = {
    description: "Test foundry",
    processors: [],
    switchers: "not an array",
  };

  const result = asFoundrySpec(
    invalidFoundry as any,
  );
  assert(isErr(result));
  expect(result.content.message).toContain(
    "array",
  );
});
