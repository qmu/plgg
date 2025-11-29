import { test, assert, expect } from "vitest";
import { proc, isErr, isOk } from "plgg";
import {
  todoFoundry,
  todos,
} from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

test("TodoFoundry", async () => {
  // Clear todos before test
  todos.length = 0;

  // Step 1: Add tasks A and B
  const result1 = await proc(
    {
      text: `Add task A and B
---------------
current todos:
${JSON.stringify(todos, null, 2)}
`,
    },
    runFoundry(todoFoundry),
  );

  if (isErr(result1)) {
    assert.fail(
      `Step 1 failed: ${result1.content.message}`,
    );
  }

  // Step 2: Remove task B and add task C
  const result2 = await proc(
    {
      text: `Remove task B and add task C
---------------
current todos:
${JSON.stringify(todos, null, 2)}
`,
    },
    runFoundry(todoFoundry),
  );

  console.log("Final todos:", todos);

  if (isErr(result2)) {
    assert.fail(
      `Step 2 failed: ${result2.content.message}`,
    );
  }
  assert(isOk(result2));

  // Verify only A and C remain
  expect(todos).toHaveLength(2);
  expect(
    todos.map((t) => t.todo),
  ).toContain("A");
  expect(
    todos.map((t) => t.todo),
  ).toContain("C");
  expect(
    todos.map((t) => t.todo),
  ).not.toContain("B");
}, 60000);
