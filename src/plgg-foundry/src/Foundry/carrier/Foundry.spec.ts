import { test, expect, assert } from "vitest";
import { isOk, isErr } from "plgg";
import {
  FoundrySpec,
  asFoundry,
  newFoundrySpec,
  newProcessorSpec,
  newSwitcherSpec,
  newPackerSpec,
} from "plgg-foundry/index";

/**
 * Tests asFoundrySpec validation with a valid Foundry object.
 */
test("asFoundrySpec validation - valid foundry", () => {
  const validFoundry: FoundrySpec =
    newFoundrySpec({
      apiKey: "test-api-key",
      description: "Test foundry description",
      processors: [
        newProcessorSpec({
          name: "test-processor",
          description: "A test processor",
          arguments: {
            arg: { type: "string" },
          },
          returns: {
            result: { type: "string" },
          },
          process: async () => ({
            result: "test-result",
          }),
        }),
      ],
      switchers: [
        newSwitcherSpec({
          name: "test-switcher",
          description: "A test switcher",
          arguments: {
            arg: { type: "string" },
          },
          returnsWhenTrue: {
            result: { type: "string" },
          },
          returnsWhenFalse: {
            error: { type: "error" },
          },
          check: async () => [
            true,
            {
              result: "test-result",
            },
          ],
        }),
      ],
      packers: [
        newPackerSpec({
          name: "testResult",
          processedBy: "test-processor",
        }),
      ],
    });

  const result = asFoundry(validFoundry);
  assert(isOk(result));
  expect(result.content.processors).toHaveLength(
    1,
  );
  expect(result.content.switchers).toHaveLength(
    1,
  );
  expect(
    result.content.processors[0]?.name.content,
  ).toBe("test-processor");
  expect(
    result.content.switchers[0]?.name.content,
  ).toBe("test-switcher");
});

/**
 * Tests asFoundrySpec validation with empty processors and switchers arrays.
 */
test("asFoundrySpec validation - empty processors and switchers", () => {
  const foundryArg: FoundrySpec = newFoundrySpec({
    apiKey: "test-api-key",
    description: "Empty foundry",
    processors: [],
    switchers: [],
    packers: [],
  });

  const result = asFoundry(foundryArg);
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
  const foundryArg: FoundrySpec = newFoundrySpec({
    apiKey: "test-api-key",
    description: "Multi-component foundry",
    processors: [
      newProcessorSpec({
        name: "processor-1",
        description: "First processor",
        arguments: {
          arg: { type: "string" },
        },
        returns: {
          result: { type: "number" },
        },
        process: async () => ({
          result: 1,
        }),
      }),
      newProcessorSpec({
        name: "processor-2",
        description: "Second processor",
        arguments: {
          arg: { type: "number" },
        },
        returns: {
          result: { type: "string" },
        },
        process: async () => ({
          result: "result",
        }),
      }),
    ],
    switchers: [
      newSwitcherSpec({
        name: "switcher-1",
        description: "First switcher",
        arguments: {
          arg: { type: "string" },
        },
        returnsWhenTrue: {
          result: { type: "string" },
        },
        returnsWhenFalse: {
          error: { type: "error" },
        },
        check: async () => [
          true,
          {
            result: "test-result",
          },
        ],
      }),
      newSwitcherSpec({
        name: "switcher-2",
        description: "Second switcher",
        arguments: {
          value: { type: "number" },
        },
        returnsWhenTrue: {
          result: { type: "number" },
        },
        returnsWhenFalse: {
          error: { type: "error" },
        },
        check: async () => [
          false,
          { error: "error" },
        ],
      }),
    ],
    packers: [],
  });

  const result = asFoundry(foundryArg);
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

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
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

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
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

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
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

  const result = asFoundry(foundryArg as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
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

  const result = asFoundry(foundryArg as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
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

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
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

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});
