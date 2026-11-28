# Return a reason for failure

When splitting a batch of books equally, the count may be odd. In `Result<T, E>`, `T` is the success value and `E` explains the failure. Use `mapResult` to transform just the success value. To display either outcome, pass the failure handler first and the success handler second to `matchResult`.

```ts
import { err, matchResult, ok } from "plgg";
import type { Result } from "plgg";

const half = (
  n: number,
): Result<number, string> =>
  n % 2 === 0 ? ok(n / 2) : err("odd count");

const label = matchResult(
  (reason: string) => reason,
  (n: number) => String(n),
);
console.log(label(half(3))); // odd count
```

## Keep the reason until you know who needs it

`InvalidError` describes validation failures. SerializeError and DeserializeError are also available, but each function chooses its error type. For instance, malformed input to `decodeJson` returns InvalidError. The error itself is tagged and carries a message inside its content.

Use `mapErr` to change only the failure. Keeping the original value until the presentation boundary lets callers inspect sibling failures. Use `chainResult` when a successful transformation can itself fail.

```ts
import {
  asStr,
  chainResult,
  decodeJson,
  mapErr,
  pipe,
  type InvalidError,
} from "plgg";

const readTitle = (s: string) =>
  pipe(
    decodeJson(s),
    chainResult(asStr),
    mapErr(
      (e: InvalidError) => e.content.message,
    ),
  );

console.log(
  readTitle('"Atlas"'),
  readTitle("42"),
  readTitle("{"),
);
```

## Expected failure and unexpected exceptions

For ordinary validation failures, return invalidError with a message. For a foreign operation that throws, `tryCatch` defaults to Defect. Its cause can retain serializable details of the original exception. Choose what to display separately from what to retain for diagnosis.

```ts
import {
  err,
  invalidError,
  ok,
  type InvalidError,
  type Result,
} from "plgg";

const shelf = (
  n: number,
): Result<number, InvalidError> =>
  Number.isInteger(n) && n > 0
    ? ok(n)
    : err(
        invalidError({
          message:
            "Expected a positive shelf number",
        }),
      );

console.log(shelf(1), shelf(0));
```
