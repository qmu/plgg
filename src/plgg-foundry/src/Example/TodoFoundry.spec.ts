import { test, assert } from "vitest";
import { proc, isErr, isOk } from "plgg";
import { openai } from "plgg-kit";
import { todoFoundrySpec } from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

test.skip("TodoFoundry", async () => {
  const result = await proc(
    todoFoundrySpec,
    (spec) =>
      proc(
        {
          text: "I need to go super market to buy milk also check postal mail.",
        },
        runFoundry({
          provider: openai({
            model: "gpt-5.1",
          }),
          spec,
        }),
      ),
  );

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
