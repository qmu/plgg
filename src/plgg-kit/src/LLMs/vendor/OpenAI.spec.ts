import { test, expect, assert } from "vitest";
import {
  isOk,
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
} from "plgg";
import { reqObjectGPT } from "plgg-kit/LLMs/vendor/OpenAI";

test.skip("OpenAI API invocation works", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: OPENAI_API_KEY not set",
    );
    return;
  }

  const result = await proc(
    {
      apiKey,
      model: "gpt-5.1",
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
    reqObjectGPT,
    atProp("fruits"),
    asReadonlyArray(asSoftStr),
  );
  expect(isOk(result)).toBe(true);
  assert(isOk(result));
  expect(result.content.length).toBe(3);
  expect(result.content).toContain("pineapple");
}, 20000);
