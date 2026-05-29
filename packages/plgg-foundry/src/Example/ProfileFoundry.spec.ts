import { test, assert, expect } from "vitest";
import { proc, isOk } from "plgg";
import {
  profileFoundry,
  lastGreeting,
} from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

/**
 * This test demonstrates AI assigning JSON objects through Assign.
 *
 * The AI will:
 * 1. Extract user profile from the prompt
 * 2. Assign it as a JSON-encoded string: '{"name":"Alice","interests":["coding","music"]}'
 * 3. The greet processor receives the parsed object
 */
test.skip("ProfileFoundry - AI assigns JSON object", async () => {
  const result = await proc(
    `Greet Alice who likes coding and music`,
    runFoundry(profileFoundry),
  );

  assert(isOk(result));
  expect(lastGreeting).toContain("Alice");
  expect(lastGreeting).toContain("coding");
  expect(lastGreeting).toContain("music");
}, 60000);
