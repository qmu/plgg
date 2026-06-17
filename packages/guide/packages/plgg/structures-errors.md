# plgg — structures & errors

The second half of the `plgg` core reference: structured
collections, the **error model**, the type-level
vocabulary, and the abstract typeclass layer. It
completes the guided coverage begun in
[Values & effects](/packages/plgg/values-effects) and
follows the same shape — curated, with the exhaustive
listing deferred to the [API reference](/api/) (T8).

All symbols are top-level imports from `"plgg"`.

## Collectives — arrays

| Type | Meaning | Caster / guard |
|------|---------|----------------|
| `Vec<A>` | readonly array of `Datum` | `asVec` / `isVec`, `asVecOf(asA)` |
| `MutVec<T>` | mutable array | `asMutVec` |
| `ReadonlyArray` | the TS built-in, re-exported in type roles | — |

`asVecOf(caster)` validates every element, and
`conclude` (from [Functionals](/packages/plgg/values-effects#functionals-effect-utilities))
maps a `Result`-returning function across an array while
**accumulating** — collecting either all successes or all
failures:

```typescript
import { conclude, asNum } from "plgg";

const allNums = conclude(asNum);
// allNums([1, 2, 3])     -> Ok([1, 2, 3])
// allNums([1, "x", "y"]) -> Err([InvalidError, InvalidError])
```

## Conjunctives — objects

| Type | Meaning |
|------|---------|
| `Obj<T>` | readonly validated record (all values are `Datum`) |
| `Dict<K, V>` | string-keyed map; `asDictOf(asV)` validates values |
| `RawObj<T>` | an unvalidated object shape |

Decode an object shape by piping `asObj` into `forProp` /
`forOptionProp` steps — the aggregation pattern from
[Validation with cast](/concepts/validation):

```typescript
import { cast, asObj, forProp, asSoftStr } from "plgg";

const asNamed = (data: unknown) =>
  cast(data, asObj, forProp("name", asSoftStr));
```

## Exceptionals — the error model

This is plgg's flagship decision: **errors are tagged
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

- **`InvalidError`** — validation failure; `sibling`
  holds the per-field failures `cast` accumulates.
- **`SerializeError` / `DeserializeError`** — encode /
  decode failures.
- **`Defect`** — the **bottom**: an *unexpected* throw
  normalized to data at a boundary, carrying a
  serializable `Cause` (`{ name, message, stack }`).

**Decision A — typed errors are stackless.** Expected
failures are control flow and carry no stack; only a
`Defect` (an actual bug) snapshots a `Cause` with the
stack. This keeps normal failures cheap and serializable.

### Accessors — fold without the double-hop

Use the named accessors instead of reaching into
`error.content.message` (or worse,
`result.content.content.message`):

| Accessor | Returns |
|----------|---------|
| `plggErrorMessage(e)` | the `message` of any `PlggError` |
| `matchPlggError({ invalid, serialize, deserialize, defect })` | fold by variant |
| `resultErrorMessage(result)` | `Option<SoftStr>` of a failed `Result`'s message |
| `printPlggError(e)` | a formatted, colorized string |
| `isPlggError(value)` | type guard |

```typescript
import { matchPlggError } from "plgg";

const explain = matchPlggError({
  invalid: (e) => `bad input: ${e.content.message}`,
  serialize: (e) => `encode failed: ${e.content.message}`,
  deserialize: (e) => `decode failed: ${e.content.message}`,
  defect: (e) => `bug: ${e.content.message}`,
});
```

### The `Error`-interop seam

At an outer boundary that *demands* a thrown `Error` (a
framework that catches exceptions), convert at the edge:

- **`toError(value)`** — turn any value/box into an
  `Error`.
- **`panic(value)`** — `throw toError(value)`. This is the
  **only sanctioned throw**; domain code inward always
  returns `err(...)`.

## Grammaticals — the type-level vocabulary

The type constructs that shape the combinator signatures:

| Type | Role |
|------|------|
| `Procedural<T, E>` | a `proc` step's return: `PossiblyPromise<PossiblyResult<T, E>>` |
| `PromisedResult<T, E>` | `Promise<Result<T, E>>` |
| `NonNeverFn<F>` | excludes functions returning `never` (keeps `pipe`/`cast`/`proc` honest) |
| `Brand<T, U>` | nominal typing — the basis of the [Basics](/packages/plgg/values-effects#basics-refined-branded-types) brands |
| `Function` | the general function type used in composition |

These are why `proc` can accept a step that returns a
bare value, a `Promise`, a `Result`, or a
`Promise<Result>` interchangeably.

## Abstracts — the typeclass layer (optional)

::: tip Advanced, optional reading
You never need this layer to use plgg. It is here for
those who want the lawful structure behind the
combinators.
:::

plgg models higher-kinded types via a `Kind` registry and
exposes the standard typeclass **instances** for its
containers — most legibly through `Option` and `Result`:

- `Functor` (`mapOption` / `mapResult`)
- `Apply` / `Applicative` (`applyOption`, `ofResult`, …)
- `Chain` / `Monad` (`chainOption` / `chainResult`)
- `Foldable` / `Traversable` (`Result`: `foldlResult`,
  `traverseResult`, `sequenceResult`)

The service interfaces `Castable` / `Refinable` are what
the `asX` / `isX` pairs implement.

::: warning
A few grandfathered escape-hatch seams exist inside the
abstract layer for HKT encoding. They are intentional and
internal — **not** a pattern to emulate. Application code
follows the strict no-`as`/`any` rule.
:::
