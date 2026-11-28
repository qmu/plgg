# Sequence asynchronous steps with proc

`proc` waits for each promise and passes the contents of an `Ok` to the next step. An `Err` skips the remaining steps. Try an empty string here. The function that counts characters will never run.

```ts
import { asStr, proc } from "plgg";

const result = await proc(
  "Atlas",
  asStr,
  (title) =>
    Promise.resolve(title.content.length),
);
console.log(result); // Ok(5)
```

## Locate the stopping point

A step can return a value, a `Result` or a promise for either. An `Err` skips subsequent steps, including counting or saving. Await the pipeline before inspecting its tag.

The implementation awaits its initial input before entering its step-level exception handling. A rejected initial promise can therefore escape, as can a rejection returned by the final step. Convert foreign failures to Results where you call the API.

```ts
import { asStr, proc } from "plgg";

const size = (input: unknown) =>
  proc(input, asStr, (s) =>
    Promise.resolve(s.content.length),
  );

console.log(
  (await size("")).__tag,
  (await size("Map")).__tag,
);
```

## Capture a rejection where the promise is created

`tryCatch` wraps either a synchronous or an asynchronous function. Omitting its error mapper converts a foreign exception to Defect. A malformed URL below becomes an `Err` that the screen can handle.

```ts
import { tryCatch } from "plgg";

const hostname = tryCatch(
  async (raw: string) => new URL(raw).hostname,
);
console.log(
  await hostname("https://example.org"),
  await hostname("x"),
);
```
