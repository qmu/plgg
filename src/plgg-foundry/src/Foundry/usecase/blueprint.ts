import { Result, isErr } from "plgg";
import {
  Alignment,
  Foundry,
  Order,
  asAlignment,
  explainFoundry,
} from "plgg-foundry/index";
import { generateJson } from "plgg-foundry/Foundry/vendor/OpenAI";

export const blueprint =
  (foundry: Foundry) =>
  async (
    _order: Order,
  ): Promise<Result<Alignment, Error>> => {
    const res = await generateJson({
      apiKey: foundry.apiKey.content,
      model: "gpt-5-nano-2025-08-07",
      input: `Compose function call chain to contact the following user request:
<foundry-explanation>
${explainFoundry(foundry)}
</foundry-explanation>
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
                  function_name: {
                    type: "string",
                  },
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
    if (isErr(res)) {
      return res;
    }

    console.log(res);

    return asAlignment(res.content);
  };
