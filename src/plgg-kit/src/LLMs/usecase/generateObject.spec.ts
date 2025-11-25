import { test, expect, assert } from "vitest";
import {
  isOk,
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
} from "plgg";
import {
  openai,
  anthropic,
  google,
} from "plgg-kit/index";
import { generateObject } from "plgg-kit/LLMs/usecase/generateObject";

const testSchema = {
  type: "object",
  properties: {
    fruits: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "strawberry",
          "pineapple",
          "banana",
          "mango",
          "kiwi",
        ],
      },
    },
  },
  required: ["fruits"],
  additionalProperties: false,
};

test.skip("generateObject with OpenAI provider works", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: OPENAI_API_KEY not set",
    );
    return;
  }

  const result = await proc(
    {
      provider: openai({
        apiKey,
        modelName: "gpt-5.1",
      }),
      systemPrompt:
        "You are an expert cake maker.",
      userPrompt:
        "Choose 3 fruits for a pineapple cake.",
      schema: testSchema,
    },
    generateObject,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );

  expect(isOk(result)).toBe(true);
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);

test.skip("generateObject with Anthropic provider works", async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: ANTHROPIC_API_KEY not set",
    );
    return;
  }

  const result = await proc(
    {
      provider: anthropic({
        apiKey,
        modelName: "claude-sonnet-4-5",
      }),
      systemPrompt:
        "You are an expert cake maker.",
      userPrompt:
        "Choose 3 fruits for a pineapple cake.",
      schema: testSchema,
    },
    generateObject,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );

  expect(isOk(result)).toBe(true);
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);

test.skip("generateObject with Google provider works", async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: GEMINI_API_KEY not set",
    );
    return;
  }

  const result = await proc(
    {
      provider: google({
        apiKey,
        modelName: "gemini-2.5-flash",
      }),
      systemPrompt:
        "You are an expert cake maker.",
      userPrompt:
        "Choose 3 fruits for a pineapple cake.",
      schema: testSchema,
    },
    generateObject,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );

  expect(isOk(result)).toBe(true);
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);
