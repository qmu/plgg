import { test, expect } from "vitest";
import { isOk } from "plgg";
import { generateJsonClaude } from "plgg-foundry/Foundry/vendor/Claude";

test("Claude API invocation works", async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: ANTHROPIC_API_KEY not set",
    );
    return;
  }

  const res = await generateJsonClaude({
    apiKey,
    model: "claude-sonnet-4-5",
    instructions:
      "Compose function call chain to fulfill the user request.",
    input: `Compose function call chain to contact the following user request:
<user-request>
Generate me a mascot character of lion x durian fruit.
</user-request>
`,
    responseFormat: {
      type: "json_schema",
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
    },
  });
  console.log(res);
  expect(isOk(res)).toBe(true);
  console.log(res.content);
}, 20000);
