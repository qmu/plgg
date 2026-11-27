# Return a reason for failure

When splitting a batch of books equally, the count may be odd. In `Result<T, E>`, `T` is the success value and `E` explains the failure. Use `mapResult` to transform just the success value. To display either outcome, pass the failure handler first and the success handler second to `matchResult`.

```ts
import { err, matchResult, ok } from "plgg";
import type { Result } from "plgg";

const half = (n: number): Result<number, string> =>
  n % 2 === 0 ? ok(n / 2) : err("odd count");

const label = matchResult(
  (reason: string) => reason,
  (n: number) => String(n),
);
console.log(label(half(3))); // odd count
```
