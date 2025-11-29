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

  // Step 1: Add tasks A and B
  await proc(
    `Add task A and B
state: ${JSON.stringify(Array.from(todos))}`,
    runFoundry(todoFoundry),
  );
  // Step 2: Remove task B and add task C
  const result = await proc(
    `Remove task B and add task C
state: ${JSON.stringify(Array.from(todos))}`,
    runFoundry(todoFoundry),
  );

  assert(isOk(result));
  expect(todos.size).toBe(2);
  expect([...todos.values()]).toContain("A");
  expect([...todos.values()]).toContain("C");
  expect([...todos.values()]).not.toContain("B");
}, 60000);
