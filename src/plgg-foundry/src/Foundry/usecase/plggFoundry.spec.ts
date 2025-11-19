import { test, assert } from "vitest";
import { pipe, isErr, isOk } from "plgg";
import { FoundrySpec } from "plgg-foundry/index";
import { plggFoundry } from "plgg-foundry/Foundry/usecase";
import { newTestFoundrySpec } from "plgg-foundry/Foundry/usecase/testFoundrySpec";

test.skip("Run Character Image Generation", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(
      "Skipping test: OPENAI_API_KEY not set",
    );
    return;
  }

  const foundrySpec: FoundrySpec =
    newTestFoundrySpec(apiKey);

  const result = await pipe(
    {
      prompt:
        "A fantasy character with a sword and shield",
    },
    plggFoundry(foundrySpec),
  );

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
