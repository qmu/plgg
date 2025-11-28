import { test, assert } from "vitest";
import { isErr, isOk } from "plgg";
import { runTocoFoundry } from "plgg-foundry/Example";

test.skip("Run Character Image Generation", async () => {
  const result = await runTocoFoundry();

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
