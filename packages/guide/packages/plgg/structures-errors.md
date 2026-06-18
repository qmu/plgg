# plgg — structures & errors

The other half of plgg core: the structured collections,
the **error model** (plgg's flagship decision), and the
type-level/typeclass layers. This page teaches the model;
the per-symbol vocabulary lives in the reference.

::: tip Full API reference
For the complete, signature-level vocabulary of `plgg`,
see the **[plgg API reference](/api/plgg/)**.
:::

## Structures — Collectives & Conjunctives

Two more categories of the core vocabulary:

- **Collectives** — arrays: `Vec<A>` (readonly), `MutVec`,
  and `asVecOf(caster)` to validate every element.
- **Conjunctives** — objects: `Obj` (validated record),
  `Dict<K, V>` (string-keyed map), `RawObj` (unvalidated).

Both are decoded with the same
[`cast`](/concepts/validation) vocabulary you already
know — there is nothing new to learn, just new shapes.
`conclude` maps a `Result`-returning function across an
array while **accumulating** all successes or all errors:

```typescript
import { conclude, asNum } from "plgg";

const allNums = conclude(asNum);
// allNums([1, 2, 3])     -> Ok([1, 2, 3])
// allNums([1, "x", "y"]) -> Err([InvalidError, InvalidError])
```

```typescript
import { cast, asObj, forProp, asStr } from "plgg";

const asNamed = (data: unknown) =>
  cast(data, asObj, forProp("name", asStr));
```

(Exact types and the full `asVecOf`/`asDictOf`/`forProp`
surface are in the [API reference](/api/plgg/).)

## The error model — errors as data

plgg's flagship decision: **errors are tagged
[`Box`](/concepts/tagged-data) data, not `Error`
subclasses.** An expected failure is a value on a
`Result`'s error channel; it folds by tag and survives a
wire boundary. The union is `PlggError`:

```typescript
export type PlggError =
  | InvalidError      // Box<"InvalidError", { message; sibling; cause }>
  | SerializeError    // Box<"SerializeError", { message }>
  | DeserializeError  // Box<"DeserializeError", { message }>
  | Defect;           // Box<"Defect", { message; cause }>
```

- **`InvalidError`** — validation failure; `sibling` holds
  the per-field failures `cast` accumulates.
- **`SerializeError` / `DeserializeError`** — encode /
  decode failures.
- **`Defect`** — the **bottom**: an *unexpected* throw
  normalized to data at a boundary, carrying a serializable
  `Cause` (`{ name, message, stack }`).

**Decision A — typed errors are stackless.** Expected
failures are control flow and carry no stack; only a
`Defect` (an actual bug) snapshots a `Cause`. This keeps
normal failures cheap and serializable.

Fold a `PlggError` with the named accessors
(`plggErrorMessage`, `matchPlggError`, `resultErrorMessage`,
`printPlggError`) instead of reaching into
`error.content.message` by hand:

```typescript
import { matchPlggError } from "plgg";

const explain = matchPlggError({
  invalid: (e) => `bad input: ${e.content.message}`,
  serialize: (e) => `encode failed: ${e.content.message}`,
  deserialize: (e) => `decode failed: ${e.content.message}`,
  defect: (e) => `bug: ${e.content.message}`,
});
```

At an outer boundary that *demands* a thrown `Error`,
convert at the edge with `toError(value)` / `panic(value)`
— the **only sanctioned throw**; domain code inward always
returns `err(...)`.

## The type-level & typeclass layers (advanced)

::: tip Optional reading
You never need these to use plgg, and they are intentionally
kept **out of the API reference** as internal/advanced
machinery.
:::

- **Grammaticals** — the type-level constructs that shape
  the combinator signatures (`Procedural<T, E>`,
  `PromisedResult<T, E>`, `Brand<T, U>`, `NonNeverFn`).
  They are why `proc` accepts a step returning a bare
  value, a `Promise`, a `Result`, or a `Promise<Result>`
  interchangeably.
- **Abstracts** — higher-kinded types (a `Kind` registry)
  and the standard typeclass **instances** for the
  containers, seen most legibly through `Option`/`Result`
  (`Functor` = `mapOption`/`mapResult`, `Monad` =
  `chainOption`/`chainResult`, etc.). The `Castable` /
  `Refinable` service interfaces are what the `asX`/`isX`
  pairs implement.

A few grandfathered escape-hatch seams exist inside the
abstract layer for HKT encoding — intentional and internal,
**not** a pattern to emulate; application code follows the
strict no-`as`/`any` rule.
