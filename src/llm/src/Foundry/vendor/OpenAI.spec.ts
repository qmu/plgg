import { test } from "vitest";
import { generateJson } from "./OpenAI";

test.skip("OpenAI API invocation works", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: OPENAI_API_KEY not set",
    );
    return;
  }

  const response = await generateJson({
    apiKey,
    model: "gpt-5-nano-2025-08-07",
    input: `Compose function call chain to contact the following user request:
<user-request>
Generate me a mascot character of lion x durian fruit.
</user-request>
`,
    responseFormat: {
      name: "function_call_chain",
      description:
        "A chain of function calls to fulfill the user request",
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
  console.log(response);
}, 20000);
