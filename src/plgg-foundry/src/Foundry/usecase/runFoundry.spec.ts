import { test, assert, expect } from "vitest";
import { proc, isErr, isOk } from "plgg";
import { runFoundry } from "plgg-foundry/Foundry/usecase";
import {
  todoFoundry,
  todos,
} from "plgg-foundry/Example/TodoFoundry";

test.skip("runFoundry with todoFoundry", async () => {
  // Clear todos before test
  todos.clear();

  const result = await proc(
    `Add todo A and todo B
state: ${JSON.stringify(Array.from(todos))}`,
    runFoundry(todoFoundry),
  );

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
  expect(todos.size).toBeGreaterThanOrEqual(1);
}, 30000);
