import { test, expect, assert } from "vitest";
import { isOk, proc, atProp, asReadonlyArray, asSoftStr, env } from "plgg";
import { reqObjectClaude } from "plgg-kit/LLMs/vendor/Anthropic";

test.skip("Claude API invocation works", async () => {
  const result = await proc(env("ANTHROPIC_API_KEY"), (apiKey) =>
    proc(
      {
        apiKey,
        model: "claude-sonnet-4-5",
        instructions: "You are an expert cake maker.",
        input: `Choose 3 fruits for a pineapple cake.`,
        schema: {
          type: "object",
          properties: {
            fruits: {
              type: "array",
              items: {
                type: "string",
                enum: ["strawberry", "pineapple", "banana", "mango", "kiwi"],
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
    ),
  );
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);
