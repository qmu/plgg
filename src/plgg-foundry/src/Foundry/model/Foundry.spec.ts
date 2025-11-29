import { test, expect } from "vitest";
import { filter, pipe } from "plgg";
import {
  makeFoundry,
  makeProcessor,
  makeSwitcher,
  makePacker,
  isProcessor,
  isSwitcher,
  explainFoundry,
} from "plgg-foundry/index";
import { todoFoundry } from "plgg-foundry/Example/TodoFoundry";

/**
 * Tests makeFoundry creates valid foundry with apparatuses.
 */
test("makeFoundry - valid foundry with apparatuses", () => {
  const foundry = makeFoundry({
    description: "Test foundry description",
    apparatuses: [
      makeProcessor({
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
      makeSwitcher({
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
      makePacker({
        result: { type: "string" },
      }),
    ],
  });

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
 * Tests makeFoundry with empty apparatuses array.
 */
test("makeFoundry - empty apparatuses", () => {
  const foundry = makeFoundry({
    description: "Empty foundry",
    apparatuses: [],
  });
  expect(foundry.apparatuses).toHaveLength(0);
});

/**
 * Tests makeFoundry with multiple processors and switchers.
 */
test("makeFoundry - multiple apparatuses", () => {
  const foundry = makeFoundry({
    description: "Multi-component foundry",
    apparatuses: [
      makeProcessor({
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
      makeProcessor({
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
      makeSwitcher({
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
      makeSwitcher({
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

  expect(foundry.apparatuses).toHaveLength(4);
  const processors = pipe(
    foundry.apparatuses,
    filter(isProcessor),
  );
  const switchers = pipe(
    foundry.apparatuses,
    filter(isSwitcher),
  );
  expect(processors).toHaveLength(2);
  expect(switchers).toHaveLength(2);
});

/**
 * Tests explainFoundry generates comprehensive markdown documentation.
 */
test("explainFoundry with todoFoundry", () => {
  const explanation = explainFoundry(todoFoundry);

  // Check foundry description section
  expect(explanation).toContain(
    "## 1. Foundry Description",
  );
  expect(explanation).toContain("A foundry of TODOs");

  // Check processors section
  expect(explanation).toContain(
    "## 2. Processors",
  );
  expect(explanation).toContain("### 2-1. add");
  expect(explanation).toContain("### 2-2. remove");

  // Check apparatus details are included
  expect(explanation).toContain("Inserts new todo");
  expect(explanation).toContain(
    "Removes a todo by todo id",
  );
});
