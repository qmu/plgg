import { test, assert, expect } from "vitest";
import { proc, isOk } from "plgg";
import {
  todoFoundry,
  todos,
} from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

test("TodoFoundry", async () => {
  // Clear todos before test
  todos.length = 0;

  // Step 1: Add tasks A and B
  await proc(
    `Add task A and B
state: ${JSON.stringify(todos)}`,
    runFoundry(todoFoundry),
  );
  // Step 2: Remove task B and add task C
  const result = await proc(
    `Remove task B and add task C
state: ${JSON.stringify(todos)}`,
    runFoundry(todoFoundry),
  );

  assert(isOk(result));
  expect(todos).toHaveLength(2);
  expect(todos.map((t) => t.todo)).toContain("A");
  expect(todos.map((t) => t.todo)).toContain("C");
  expect(todos.map((t) => t.todo)).not.toContain(
    "B",
  );
}, 60000);
