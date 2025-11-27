import { test, assert } from "vitest";
import { isOk, proc, env } from "plgg";
import { openai } from "plgg-kit";
import {
  asFoundry,
  asOrder,
} from "plgg-foundry/index";
import { blueprint } from "plgg-foundry/Foundry/usecase";
import { makeTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("Blueprint generation with test foundry", async () => {
  const result = await proc(
    env("OPENAI_API_KEY"),
    (apiKey) =>
      proc(
        openai({
          apiKey,
          modelName: "gpt-5.1",
        }),
        (provider) =>
          proc(
            {
              provider,
              spec: makeTestFoundrySpec(),
            },
            asFoundry,
            (foundry) =>
              proc(
                {
                  prompt:
                    "Create a fantasy warrior character",
                },
                asOrder,
                blueprint(foundry),
              ),
          ),
      ),
  );

  assert(
    isOk(result),
    "Blueprint should generate valid alignment",
  );

  console.log(result.content.operations);
}, 30000);
