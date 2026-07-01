# Async with `proc`

`proc` is the async sibling of [`cast`](/concepts/validation):
it chains sync **and** async steps, automatically
unwrapping promises and [`Result`](/concepts/result)
values between steps and short-circuiting on the first
`Err`. It always resolves to a single `Result`:

```typescript
import { proc, isOk } from "plgg";

const result = await proc(
  5,
  (x: number) => x + 1,
  (x: number) => Promise.resolve(x * 2),
  (x: number) => `Result: ${x}`,
);

if (isOk(result)) {
  console.log(result.content); // "Result: 12"
}
```

## What each step receives

Each step is handed the **unwrapped** output of the one
before it — a bare value, the awaited value of a
`Promise`, or the `Ok` content of a `Result`. If a step
returns `err(...)`, the remaining steps are skipped and
that error becomes the result. So a step can be any of:

```typescript
(x: T) => U
(x: T) => Promise<U>
(x: T) => Result<U, E>
(x: T) => Promise<Result<U, E>>
```

## Precise error inference

The result's error channel is the **union of every
step's error type**, plus `Defect`:

```typescript
// proc(seed, f, g) : Promise<Result<Out, Ef | Eg | Defect>>
```

`Defect` appears because `proc` wraps the whole chain in
a try/catch: domain code returns typed errors, but if a
step *throws* unexpectedly, `proc` catches it and turns
it into a `Defect` (a thrown `PlggError` keeps its
identity). You get an exhaustive, accurate error type
without writing it by hand — fold it with
[`match`](/concepts/match) or `matchResult`.

The related type aliases are `Procedural<T, E>` (a step's
possibly-promised, possibly-result return) and
`PromisedResult<T, E>` (`Promise<Result<T, E>>`), used
throughout the family's async APIs.
