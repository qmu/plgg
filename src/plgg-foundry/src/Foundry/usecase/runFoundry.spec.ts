import { test, assert } from "vitest";
import { pipe, isErr, isOk } from "plgg";
import { openai } from "plgg-kit";
import { runFoundry } from "plgg-foundry/Foundry/usecase";
import { makeTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("Run Character Image Generation", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: OPENAI_API_KEY not set",
    );
    return;
  }

  const provider = openai({
    apiKey,
    modelName: "gpt-5.1",
  });

  const spec = makeTestFoundrySpec();

  const result = await pipe(
    {
      prompt:
        "A fantasy character with a sword and shield",
    },
    runFoundry({ provider, spec }),
  );

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
