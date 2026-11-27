---
layout: sheet
description: Change the values of A and B. Sum adds the connected inputs, so removing an incoming edge also changes the result.
---

# Sum two inputs

```plgg-flow fill dsl tools=computed
node A at -192 -80 value 3
node B at -192 80 value 5
node Sum at 128 16
A -> Sum
B -> Sum
```
