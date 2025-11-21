import { test, expect, assert } from "vitest";
import {
  isOk,
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
} from "plgg";
import { reqObjectClaude } from "plgg-foundry/LLMs/vendor/Anthropic";

test.skip("Claude API invocation works", async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: ANTHROPIC_API_KEY not set",
    );
    return;
  }
  const result = await proc(
    {
      apiKey,
      model: "claude-sonnet-4-5",
      instructions:
        "You are an expert cake maker.",
      input: `Choose 3 fruits for a pineapple cake.`,
      schema: {
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
      },
    },
    reqObjectClaude,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);
