import { test, expect, assert } from "vitest";
import {
  isOk,
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
} from "plgg";
import { reqObjectGemini } from "plgg-foundry/LLMs/vendor/Google";

test.skip("Gemini API invocation works", async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: GEMINI_API_KEY not set",
    );
    return;
  }

  const result = await proc(
    {
      apiKey,
      model: "gemini-2.5-flash",
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
    reqObjectGemini,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );
  expect(isOk(result)).toBe(true);
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);
