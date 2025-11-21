import { test, expect } from "vitest";
import { isOk } from "plgg";
import { reqObjectGemini } from "plgg-foundry/LLMs/vendor/Google";

test.skip("Gemini API invocation works", async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: GEMINI_API_KEY not set",
    );
    return;
  }

  const res = await reqObjectGemini({
    apiKey,
    model: "gemini-2.5-flash",
    instructions:
      "Compose function call chain to fulfill the user request.",
    input: `Compose function call chain to contact the following user request:
<user-request>
Generate me a mascot character of lion x durian fruit.
</user-request>
`,
    schema: {
      type: "object",
      properties: {
        function_call_chain: {
          type: "array",
          items: {
            type: "object",
            properties: {
              function_name: { type: "string" },
            },
            required: ["function_name"],
            additionalProperties: false,
          },
        },
      },
      required: ["function_call_chain"],
      additionalProperties: false,
    },
  });
  expect(isOk(res)).toBe(true);
}, 20000);
