import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
  shouldBeOk,
} from "plgg-test";
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

  if (!isOk(result)) {
    return check(result, shouldBeOk());
  }
  return all([
    check(todos.size, toBe(2)),
    check([...todos.values()], toContain("A")),
    check([...todos.values()], toContain("C")),
    check(
      [...todos.values()],
      not(toContain("B")),
    ),
  ]);
});
