# plgg-foundry — Plan a sequence of operations

Register the operations your application provides with `makeFoundry`, then pass a request to `runFoundry(foundry)`. `blueprint` produces an execution plan called an Alignment, and `operate` runs its operations. Use `beforeOperations` to inspect the plan and `afterOperations` to inspect the resulting output.
