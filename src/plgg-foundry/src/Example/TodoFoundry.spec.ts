import { test, assert } from "vitest";
import { proc, isErr, isOk } from "plgg";
import {
  todoFoundrySpec,
  todos,
} from "plgg-foundry/Example";
import { runFoundry } from "plgg-foundry/Foundry/usecase";

test.skip("TodoFoundry", async () => {
  console.log("todos:", todos);
  const result = await proc(
    {
      text: "Add task A and B",
    },
    runFoundry({
      spec: todoFoundrySpec,
    }),
  );
  console.log("todos:", todos);

  if (isErr(result)) {
    assert.fail(
      `Process failed: ${result.content.message}`,
    );
  }
  assert(isOk(result));
}, 30000);
