# plgg-foundry — Plan a sequence of operations

Register the operations your application provides with `makeFoundry`, then pass a request to `runFoundry(foundry)`. `blueprint` produces an execution plan called an `Alignment`, and `operate` runs its operations. Use `beforeOperations` to inspect the plan and `afterOperations` to inspect the resulting output.

## Working with the API

`runFoundry(foundry)(input: string or OrderSpec)`

Register the available apparatuses with makeFoundry. Execution validates the order, plans an alignment and then applies its operations. The default `maxOperationLimit` is 10. Stop at `blueprint` if you need only the plan.

```ts
import { makeFoundry } from "plgg-foundry";

const plan = makeFoundry({
  description: "Catalog books",
  apparatuses: [],
});
console.log(plan.maxOperationLimit); // 10
```

## Inspect the plan and its output

`blueprint`(foundry)(order) yields an Alignment. Pass it to `operate`(foundry)(order) to execute sequential operations and obtain a `Medium` containing the plan and named output params. A failure skips the completion hook. Use plgg-kit directly for one predetermined model call.
