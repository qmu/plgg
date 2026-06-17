# Validation with `cast`

`cast` turns `unknown` into a typed value by running it
through a chain of validators, each returning a
[`Result`](/concepts/result). The chain short-circuits on
failure and yields `Result<T, InvalidError>` — parsing
at the boundary, never `as`:

```typescript
import {
  cast, asObj, forProp,
  asNum, asSoftStr, asTime,
} from "plgg";
import type {
  Num, SoftStr, Time,
  Result, InvalidError,
} from "plgg";

type UserProfile = {
  id: Num;
  email: SoftStr;
  createdAt: Time;
};

const asUserProfile = (
  data: unknown,
): Result<UserProfile, InvalidError> =>
  cast(
    data,
    asObj,
    forProp("id", asNum),
    forProp("email", asSoftStr),
    forProp("createdAt", asTime),
  );
```

## Casters, props, and refinements

- **`asX` casters** — `asNum`, `asSoftStr`, `asTime`,
  `asObj`, … each take `unknown` and return a `Result`.
  They come from plgg's validated primitive types (see
  [Structures & errors](/packages/plgg/structures-errors)).
- **`forProp(key, caster)`** validates one property and
  threads it onto the record; `forOptionProp` does the
  same but yields an [`Option`](/concepts/option) for a
  field that may be absent.
- **`refine(predicate, message?)`** lifts an arbitrary
  predicate into a validator:

```typescript
import { cast, asNum, refine } from "plgg";

const asPort = (data: unknown) =>
  cast(
    data,
    asNum,
    refine((n) => n > 0 && n < 65536, "out of range"),
  );
```

## Error accumulation

When several `forProp` steps fail, `cast` does not stop
at the first — it collects the per-field failures into
the `sibling` array of a single `InvalidError`, so the
caller sees *every* invalid field at once. An
`InvalidError` is tagged data:

```typescript
export type InvalidError = Box<
  "InvalidError",
  {
    message: SoftStr;
    sibling: ReadonlyArray<InvalidError>;
    cause: Option<Cause>;
  }
>;
```

Need async steps too (an existence check against a DB,
say)? Reach for [`proc`](/concepts/async), which composes
both sync and async work.
