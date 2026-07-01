import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
} from "plgg-test";
import {
  proc,
  atProp,
  asReadonlyArray,
  asSoftStr,
  env,
  box,
} from "plgg";
import { reqObjectClaude } from "plgg-kit/LLMs/vendor/Anthropic";

test.skip("Claude API invocation works", async () => {
  const result = await proc(
    env(box("Str")("ANTHROPIC_API_KEY")),
    (apiKey) =>
      proc(
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
      ),
  );
  return check(
    result,
    okThen((fruits) =>
      all([
        check(fruits.length, toBe(3)),
        check(fruits, toContain("pineapple")),
      ]),
    ),
  );
});
