# Getting started

`plgg` ("Pipeline Utility") is a functional programming
toolkit for TypeScript: type-safe pipelines,
`Result`/`Option` instead of exceptions and `null`,
validated primitive types, and exhaustive pattern
matching. It is the core every other package in the
**plgg family** is built on — `plgg-http`,
`plgg-server`, `plgg-fetch`, `plgg-router`,
`plgg-view`, `plgg-sql`, `plgg-kit`, and
`plgg-foundry` — so the patterns you learn here hold
across the whole stack.

## Install

```bash
npm install plgg
```

Every package in this repo is **standalone** — there is
no npm workspace root. The family packages depend on
`plgg` (and on each other) through `file:` links to each
package's built `dist`, so when you work inside the
monorepo you build `plgg` first and the dependents
resolve it from disk. In your own project, a plain
`npm install plgg` is all you need.

All exports are top-level — import what you need
directly from `"plgg"`:

```typescript
import { cast, proc, pipe, match } from "plgg";
```

## Your first pipeline

Two ideas carry most of plgg. **`cast`** validates
untrusted input into a typed value, returning a
`Result` instead of throwing. **`proc`** chains sync and
async steps, short-circuiting on the first failure.

Validate an unknown payload into a typed record — note
`asNum`/`asStr`/`asTime` each return a `Result`, and
`forProp` threads them onto the object, accumulating
sibling errors rather than failing on the first. Use the
branded [`Str`](/packages/plgg/values-effects#prefer-str-for-strings)
for string fields (not the bare `SoftStr`):

```typescript
import {
  cast, asObj, forProp,
  asNum, asStr, asTime,
  isOk,
} from "plgg";
import type {
  Num, Str, Time,
  Result, InvalidError,
} from "plgg";

type UserProfile = {
  id: Num;
  email: Str;
  createdAt: Time;
};

const asUserProfile = (
  data: unknown,
): Result<UserProfile, InvalidError> =>
  cast(
    data,
    asObj,
    forProp("id", asNum),
    forProp("email", asStr),
    forProp("createdAt", asTime),
  );

const result = asUserProfile({
  id: 1,
  email: "user@example.com",
  createdAt: "2025-01-01T00:00:00Z",
});

if (isOk(result)) {
  console.log(result.content);
}
```

Chain async work with `proc` — each step receives the
previous step's unwrapped value, a returned `Result`
short-circuits the rest, and the whole thing resolves to
one `Result`:

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

## Where to go next

The [Core concepts](/concepts/) section is the shared
vocabulary the rest of the guide assumes — read it once,
and every package page builds on it instead of
re-explaining the basics. The
[example tutorial](/packages/example) is the family's
end-to-end demo (one program, rendered both server-side
and in the browser).
