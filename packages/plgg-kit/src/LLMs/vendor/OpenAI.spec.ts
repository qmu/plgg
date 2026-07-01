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
import { reqObjectGPT } from "plgg-kit/LLMs/vendor/OpenAI";

test.skip("OpenAI API invocation works", async () => {
  const result = await proc(
    env(box("Str")("OPENAI_API_KEY")),
    (apiKey) =>
      proc(
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
