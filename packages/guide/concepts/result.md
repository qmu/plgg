# Result, not throw

A `Result<T, E>` is either success (`Ok<T>`) or failure
(`Err<E>`) — both [tagged data](/concepts/tagged-data):

```typescript
export type Result<T, F> = Ok<T> | Err<F>;
```

Expected failures travel as **values** on the error
channel instead of unwinding the stack, so a function's
signature tells you exactly how it can fail and the
compiler makes you account for it.

## Errors are tagged data, not exceptions

plgg's errors are `Box` unions, not `Error` subclasses.
The shipped vocabulary (`PlggError`) is:

```typescript
export type PlggError =
  | InvalidError
  | SerializeError
  | DeserializeError
  | Defect;
```

`InvalidError` is a validation failure (see
[`cast`](/concepts/validation)); `Defect` is the
**bottom** — an *unexpected* throw normalized to data at
a boundary, carrying a serializable `Cause`
(`{ name, message, stack }`). Domain code returns
`err(typedError)` and never throws; only a genuine bug
becomes a `Defect`. Because errors are plain data, they
fold by tag through [`match`](/concepts/match) and
survive a wire boundary.

## Working with Result

`ok`/`err` construct; `isOk`/`isErr` narrow. Prefer the
data-last combinators in a [pipe](/concepts/composition):

```typescript
import { ok, err } from "plgg";
import type { Result } from "plgg";

const half = (n: number): Result<number, string> =>
  n % 2 === 0 ? ok(n / 2) : err("odd number");
```

```typescript
import { pipe, mapResult, mapErr, matchResult } from "plgg";

// transform the success channel, leave errors untouched
pipe(half(10), mapResult((n) => n + 1)); // Ok(6)

// rewrite the error type at a seam
pipe(half(3), mapErr((msg) => ({ reason: msg })));

// fold both channels into one value (error-first)
const describe = matchResult(
  (e: string) => `failed: ${e}`,
  (n: number) => `got ${n}`,
);
```

The `mapErr`-at-the-edge pattern is how the family keeps
error handling honest: each layer returns its own typed
error, and one `mapErr` at the boundary folds them to a
single vocabulary (e.g. an `HttpError` in
[plgg-server](/packages/plgg-server)).
