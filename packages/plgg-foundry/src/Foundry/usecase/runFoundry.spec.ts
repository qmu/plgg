import {
  test,
  check,
  shouldBeOk,
  toBeGreaterThanOrEqual,
} from "plgg-test";
import { proc, isOk } from "plgg";
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

  if (!isOk(result)) {
    return check(result, shouldBeOk());
  }
  return check(
    todos.size,
    toBeGreaterThanOrEqual(1),
  );
});
