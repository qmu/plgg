import {
  test,
  check,
  shouldBeOk,
} from "plgg-test";
import { proc, isOk } from "plgg";
import {
  asAlignment,
  asOrder,
} from "plgg-foundry/index";
import { operate } from "plgg-foundry/Foundry/usecase";
import {
  todoFoundry,
  todos,
} from "plgg-foundry/Example/TodoFoundry";

test.skip("OperationContext: assemble -> operate with todoFoundry alignment", async () => {
  // Clear todos before test
  todos.clear();

  const maybeAlignment = asAlignment({
    analysis: "User wants to add task A",
    ingress: {
      type: "ingress",
      next: "assign-todo",
    },
    operations: [
      {
        type: "assign",
        name: "assign-todo",
        address: "r0",
        value: "task A",
        next: "add",
      },
      {
        type: "process",
        name: "add",
        action: "add",
        input: [
          {
            variableName: "todo",
            address: "r0",
          },
        ],
        output: [],
        next: "egress",
      },
    ],
    egress: {
      type: "egress",
      result: [],
    },
  });

  if (!isOk(maybeAlignment)) {
    return check(maybeAlignment, shouldBeOk());
  }

  const maybeOrder = asOrder({
    text: "Add task A",
  });
  if (!isOk(maybeOrder)) {
    return check(maybeOrder, shouldBeOk());
  }

  // Test the flow: assemble -> operate
  const result = await proc(
    maybeAlignment.content,
    operate(todoFoundry)(maybeOrder.content),
  );

  return check(result, shouldBeOk());
});
