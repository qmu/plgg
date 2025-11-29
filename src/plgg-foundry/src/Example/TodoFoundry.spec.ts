import { test, assert, expect } from "vitest";
import { proc, isOk } from "plgg";
import {
  todoFoundry,
  todos,
} from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

test.skip("TodoFoundry", async () => {
  // Clear todos before test
  todos.clear();

  // Step 1: Add todos A and B
  await proc(
    `Add todo A and B
state: ${JSON.stringify(Array.from(todos))}`,
    runFoundry(todoFoundry),
  );
  // Step 2: Remove todo B and add todo C
  const result = await proc(
    `Remove todo B and add todo C
state: ${JSON.stringify(Array.from(todos))}`,
    runFoundry(todoFoundry),
  );

  assert(isOk(result));
  expect(todos.size).toBe(2);
  expect([...todos.values()]).toContain("A");
  expect([...todos.values()]).toContain("C");
  expect([...todos.values()]).not.toContain("B");
}, 60000);
