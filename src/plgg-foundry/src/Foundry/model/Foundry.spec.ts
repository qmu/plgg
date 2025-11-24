import { test, expect, assert } from "vitest";
import { isOk, isErr, filter, pipe } from "plgg";
import {
  FoundrySpec,
  asFoundry,
  newFoundrySpec,
  newProcessorSpec,
  newSwitcherSpec,
  newPackerSpec,
  isProcessor,
  isSwitcher,
} from "plgg-foundry/index";

/**
 * Tests asFoundrySpec validation with a valid Foundry object.
 */
test("asFoundrySpec validation - valid foundry", () => {
  const validFoundry: FoundrySpec =
    newFoundrySpec({
      apiKey: "test-api-key",
      description: "Test foundry description",
      apparatuses: [
        newProcessorSpec({
          name: "test-processor",
          description: "A test processor",
          arguments: {
            arg: { type: "string" },
          },
          returns: {
            result: { type: "string" },
          },
          fn: async () => ({
            result: "test-result",
          }),
        }),
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
          fn: async () => [
            true,
            {
              result: "test-result",
            },
          ],
        }),
        newPackerSpec({
          result: { type: "string" },
        }),
      ],
    });

  const result = asFoundry(validFoundry);
  assert(isOk(result));
  const foundry = result.content;
  expect(foundry.apparatuses).toHaveLength(3);
  const processors = pipe(
    foundry.apparatuses,
    filter(isProcessor),
  );
  const switchers = pipe(
    foundry.apparatuses,
    filter(isSwitcher),
  );
  expect(processors).toHaveLength(1);
  expect(switchers).toHaveLength(1);
  expect(
    processors[0]?.content.name.content,
  ).toBe("test-processor");
  expect(switchers[0]?.content.name.content).toBe(
    "test-switcher",
  );
});

/**
 * Tests asFoundrySpec validation with empty apparatuses array.
 */
test("asFoundrySpec validation - empty apparatuses", () => {
  const foundryArg: FoundrySpec = newFoundrySpec({
    apiKey: "test-api-key",
    description: "Empty foundry",
    apparatuses: [],
  });

  const result = asFoundry(foundryArg);
  assert(isOk(result));
  expect(result.content.apparatuses).toHaveLength(
    0,
  );
});

/**
 * Tests asFoundrySpec validation with multiple processors and switchers.
 */
test("asFoundrySpec validation - multiple apparatuses", () => {
  const foundryArg: FoundrySpec = newFoundrySpec({
    apiKey: "test-api-key",
    description: "Multi-component foundry",
    apparatuses: [
      newProcessorSpec({
        name: "processor-1",
        description: "First processor",
        arguments: {
          arg: { type: "string" },
        },
        returns: {
          result: { type: "number" },
        },
        fn: async () => ({
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
        fn: async () => ({
          result: "result",
        }),
      }),
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
        fn: async () => [
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
        fn: async () => [
          false,
          { error: "error" },
        ],
      }),
    ],
  });

  const result = asFoundry(foundryArg);
  assert(isOk(result));
  expect(result.content.apparatuses).toHaveLength(
    4,
  );
  const processors = pipe(
    result.content.apparatuses,
    filter(isProcessor),
  );
  const switchers = pipe(
    result.content.apparatuses,
    filter(isSwitcher),
  );
  expect(processors).toHaveLength(2);
  expect(switchers).toHaveLength(2);
});

/**
 * Tests asFoundrySpec validation failure when description is missing.
 */
test("asFoundrySpec validation - missing description", () => {
  const invalidFoundry = {
    apparatuses: [],
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});

/**
 * Tests asFoundrySpec validation failure when apparatuses is missing.
 */
test("asFoundrySpec validation - missing apparatuses", () => {
  const invalidFoundry = {
    description: "Test foundry",
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});

/**
 * Tests asFoundrySpec validation failure with invalid apparatus structure.
 */
test("asFoundrySpec validation - invalid apparatus", () => {
  const foundryArg = {
    description: "Test foundry",
    apparatuses: [
      {
        id: "test",
        description: "test",
        // missing required fields
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
 * Tests asFoundrySpec validation failure when apparatuses is not an array.
 */
test("asFoundrySpec validation - apparatuses not array", () => {
  const invalidFoundry = {
    description: "Test foundry",
    apparatuses: "not an array",
  };

  const result = asFoundry(invalidFoundry as any);
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});
