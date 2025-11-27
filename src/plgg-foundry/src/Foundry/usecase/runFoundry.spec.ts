import { test, assert } from "vitest";
import { proc, isErr, isOk, env } from "plgg";
import { openai } from "plgg-kit";
import { runFoundry } from "plgg-foundry/Foundry/usecase";
import { makeTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("Run Character Image Generation", async () => {
  const result = await proc(
    "OPENAI_API_KEY",
    env,
    (apiKey) =>
      proc(
        openai({
          apiKey,
          modelName: "gpt-5.1",
        }),
        (provider) =>
          proc(
            {
              prompt:
                "A fantasy character with a sword and shield",
            },
            runFoundry({
              provider,
              spec: makeTestFoundrySpec(),
            }),
          ),
      ),
  );

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
