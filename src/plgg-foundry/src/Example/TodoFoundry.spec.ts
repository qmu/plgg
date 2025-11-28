import { test, assert } from "vitest";
import {
  bind,
  proc,
  isErr,
  isOk,
  env,
} from "plgg";
import { openai } from "plgg-kit";
import { buildSpec } from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

test.skip("Run Character Image Generation", async () => {
  const result = await proc(
    bind(
      ["apiKey", () => env("OPENAI_API_KEY")],
      ["spec", () => buildSpec()],
      [
        "provider",
        ({ apiKey }) =>
          openai({
            apiKey,
            modelName: "gpt-5.1",
          }),
      ],
    ),
    ({ spec, provider }) =>
      proc(
        {
          prompt:
            "A fantasy character with a sword and shield",
        },
        runFoundry({
          provider,
          spec,
        }),
      ),
  );

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  console.log(result.content);
  assert(isOk(result));
}, 30000);
