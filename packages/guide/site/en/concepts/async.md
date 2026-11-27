# Sequence asynchronous steps with proc

`proc` waits for each promise and passes the contents of an `Ok` to the next step. An `Err` skips the remaining steps, and an unexpected exception becomes a `Defect`. Try an empty string here. The function that counts characters will never run.

```ts
import { asStr, proc } from "plgg";

const result = await proc(
  "Atlas",
  asStr,
  (title) => Promise.resolve(title.content.length),
);
console.log(result); // Ok(5)
```
