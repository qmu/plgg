import { test, expect, assert } from "vitest";
import { isOk, isErr, filter, pipe } from "plgg";
import { openai } from "plgg-kit";
import {
  asFoundry,
  makeFoundrySpec,
  makeProcessorSpec,
  makeSwitcherSpec,
  makePackerSpec,
  isProcessor,
  isSwitcher,
  explainFoundry,
} from "plgg-foundry/index";
import { makeTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

const provider = openai({
  apiKey: "no key",
  modelName: "gpt-5.1",
});
/**
 * Tests asFoundrySpec validation with a valid Foundry object.
 */
test("asFoundrySpec validation - valid foundry", () => {
  const spec = makeFoundrySpec({
    description: "Test foundry description",
    apparatuses: [
      makeProcessorSpec({
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
      makeSwitcherSpec({
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
      makePackerSpec({
        result: { type: "string" },
      }),
    ],
  });

  const result = asFoundry({ provider, spec });
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
  const spec = makeFoundrySpec({
    description: "Empty foundry",
    apparatuses: [],
  });
  const result = asFoundry({ provider, spec });
  assert(isOk(result));
  expect(result.content.apparatuses).toHaveLength(
    0,
  );
});

/**
 * Tests asFoundrySpec validation with multiple processors and switchers.
 */
test("asFoundrySpec validation - multiple apparatuses", () => {
  const spec = makeFoundrySpec({
    description: "Multi-component foundry",
    apparatuses: [
      makeProcessorSpec({
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
      makeProcessorSpec({
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
      makeSwitcherSpec({
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
      makeSwitcherSpec({
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

  const result = asFoundry({ provider, spec });
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
  const spec = {
    apparatuses: [],
  };
  const result = asFoundry({
    provider,
    spec: spec as any,
  });
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});

/**
 * Tests asFoundrySpec validation failure when apparatuses is missing.
 */
test("asFoundrySpec validation - missing apparatuses", () => {
  const spec = {
    description: "Test foundry",
  };
  const result = asFoundry({
    provider,
    spec: spec as any,
  });
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});

/**
 * Tests asFoundrySpec validation failure with invalid apparatus structure.
 */
test("asFoundrySpec validation - invalid apparatus", () => {
  const spec = {
    description: "Test foundry",
    apparatuses: [
      {
        id: "test",
        description: "test",
        // missing required fields
      },
    ],
  };
  const result = asFoundry({
    provider,
    spec: spec as any,
  });
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});

/**
 * Tests asFoundrySpec validation failure when apparatuses is not an array.
 */
test("asFoundrySpec validation - apparatuses not array", () => {
  const spec = {
    description: "Test foundry",
    apparatuses: "not an array",
  };
  const result = asFoundry({
    provider,
    spec: spec as any,
  });
  assert(isErr(result));
  expect(result.content.message).toContain(
    "Cast failed",
  );
});

/**
 * Tests explainFoundry generates comprehensive markdown documentation.
 */
test("explainFoundry with makeTestFoundrySpec", () => {
  const spec = makeTestFoundrySpec();
  const result = asFoundry({ provider, spec });
  assert(isOk(result));
  const foundry = result.content;

  const explanation = explainFoundry(foundry);

  // Check foundry description section
  expect(explanation).toContain(
    "## 1. Foundry Description",
  );
  expect(explanation).toContain(
    "generating character designs",
  );

  // Check processors section
  expect(explanation).toContain("## 2. Processors");
  expect(explanation).toContain("### 2-1. plan");
  expect(explanation).toContain("### 2-2. analyze");
  expect(explanation).toContain("### 2-3. gen-main");
  expect(explanation).toContain("### 2-4. gen-spread");

  // Check switchers section
  expect(explanation).toContain("## 3. Switchers");
  expect(explanation).toContain(
    "### 3-1. check-validity",
  );

  // Check packers section
  expect(explanation).toContain("## 4. Packers");
  expect(explanation).toContain("### 4-1. Packer 1");

  // Check apparatus details are included
  expect(explanation).toContain(
    "Plans the character design",
  );
  expect(explanation).toContain(
    "Analyzes reference images",
  );
  expect(explanation).toContain(
    "Generates the main character image",
  );
  expect(explanation).toContain(
    "Generates spread images",
  );
  expect(explanation).toContain(
    "Checks for inappropriate content",
  );
});
