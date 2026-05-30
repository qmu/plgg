import { test, assert } from "vitest";
import { proc, isOk } from "plgg";
import { profileFoundry } from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

/**
 * This test demonstrates AI assigning JSON objects through Assign.
 *
 * The AI will:
 * 1. Extract user profile from the prompt
 * 2. Assign it as a JSON-encoded string: '{"name":"Alice","interests":["coding","music"]}'
 * 3. The greet processor decodes it (asProfile) and returns the greeting, which
 *    flows out as the egress output of the run.
 */
test.skip("ProfileFoundry - AI assigns JSON object", async () => {
  const result = await proc(
    `Greet Alice who likes coding and music`,
    runFoundry(profileFoundry),
  );

  assert(isOk(result));
}, 60000);
