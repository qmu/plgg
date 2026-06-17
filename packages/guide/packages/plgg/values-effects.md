# plgg — values & effects

This is a **guided** tour of the half of the `plgg` core
API you reach for most: the value types and the
composition combinators. It curates the surface by
module category; the exhaustive symbol-by-symbol listing
is the auto-generated [API reference](/api/) (T8).

It assumes the [Core concepts](/concepts/) — `Option`,
`Result`, `cast`, `proc`, `match` are explained there and
only used here. Its companion page,
[Structures & errors](/packages/plgg/structures-errors),
covers records, collections, the error types, and the
typeclass abstracts.

All symbols are top-level imports from `"plgg"`.

## Atomics — validated bare primitives

Atomics are plain TypeScript primitives given a
**validation seam**: the type is the native type, and an
`asX` caster turns `unknown` into a `Result`, with an
`isX` guard alongside. Define the type first, then parse
into it at the boundary.

| Type | Underlying | Caster / guard |
|------|-----------|----------------|
| `Num` | `number` | `asNum` / `isNum` |
| `Int` | `number` (integral) | `asInt` / `isInt` |
| `SoftStr` | `string` | `asSoftStr` / `isSoftStr` |
| `Bool` | `boolean` | `asBool` / `isBool` |
| `Time` | `Date` | `asTime` / `isTime` |
| `BigInt` | `bigint` | `asBigInt` / `isBigInt` |
| `Bin` | `Uint8Array` | `asBin` / `isBin` |

```typescript
import { asNum, isOk } from "plgg";

const r = asNum("42"); // Result<Num, InvalidError>
isOk(r); // false — asNum does not coerce strings
```

## Basics — refined branded types

Basics are **branded** [boxes](/concepts/tagged-data)
(`Box<"Str", string>`, `Box<"Float", number>`, …): a
value that has passed a refinement carries proof of it in
its type, so an unvalidated `string` cannot be used where
a `Str` is required. They include the refined strings
(`Str`, `Alphabet`, `Alphanumeric`, `CamelCase`,
`PascalCase`, `KebabCase`, `SnakeCase`, `CapitalCase`),
`Float`, and the ranged integers (`I8`…`I128`,
`U8`…`U128`), each with its own `asX`/`isX`.

```typescript
import { asStr, asFloat } from "plgg";
// asStr(x): Result<Str, InvalidError>
// Str = Box<"Str", string>
```

## Disjunctives — Option & Result

The two union types the whole family flows through. See
[Option](/concepts/option) and [Result](/concepts/result)
for the narrative; the combinators:

| `Option<T>` | `Result<T, E>` |
|-------------|----------------|
| `some` / `none` | `ok` / `err` |
| `isSome` / `isNone` | `isOk` / `isErr` |
| `fromNullable`, `getOr` | `mapErr` |
| `mapOption`, `chainOption` | `mapResult`, `chainResult` |
| `matchOption` | `matchResult` |
| `okOr`, `toOption` | `foldlResult`, `foldrResult` |

Both expose typeclass instances (`Functor`, `Apply`,
`Applicative`, `Chain`, `Monad`; `Result` also
`Foldable`/`Traversable`) — see
[Structures & errors](/packages/plgg/structures-errors#abstracts).

## Contextuals — the tagged carriers

The concrete box/icon constructors behind the unions:
`box(tag)(content)`, `pattern(tag)(body?)` for matching,
`isBox`/`hasTag`/`isBoxWithTag`, and `unbox` to extract
nested content. `Ok`/`Err` and `Some`/`None` are the
specializations, with `ok$`/`err$`/`some$`/`none$` as
their match patterns.

```typescript
import { box, pattern, hasTag } from "plgg";

const e = box("NotFound")("/x"); // Box<"NotFound", string>
hasTag("NotFound")(e); // true
```

## Flowables — the composition core

| Combinator | Purpose |
|-----------|---------|
| `pipe(v, …fns)` | thread a value through functions |
| `flow(…fns)` | point-free composition |
| `cast(v, …)` | sync validation chain → `Result<_, InvalidError>` |
| `proc(v, …)` | async pipeline → `Promise<Result<_, E… \| Defect>>` |
| `match(v)(…cases)` | exhaustive pattern match |
| `hold(fn)` | wrap a unary fn (composition helper) |

The detail and tested examples live in
[Validation with cast](/concepts/validation),
[Async with proc](/concepts/async),
[Exhaustive match](/concepts/match), and
[Data-last composition](/concepts/composition). The key
property to remember: **`proc` infers the precise error
union** — each step contributes its own error type and
`Defect` is appended for unexpected throws, so you get
`Result<Out, E₁ | … | Defect>` rather than
`Result<Out, Error>` or `unknown`.

## Functionals — effect utilities

Small, `proc`-friendly helpers. Each returns data
(`Result`/`Option`), never throws:

| Function | Signature (abbreviated) | Notes |
|----------|------------------------|-------|
| `tryCatch(fn, onErr?)` | `(arg) => Result<U, Defect>` | throw → `Result`; defaults the error to `Defect`, or maps it with `onErr` |
| `env(key)` | `Result<string, Defect>` | read an environment variable as data |
| `refine(pred, msg?)` | `(a) => Result<T, InvalidError>` | lift a predicate into a validator |
| `bind(...entries)` | `Promise<Result<Record<…>, unknown>>` | accumulate a context object step by step |
| `conclude(fn)` | `(vec) => Result<U[], F[]>` | map a `Result`-returning fn over an array, collecting all oks or all errs |
| `atProp(key)` / `atIndex(i)` | `(x) => Result<unknown, InvalidError>` | safe property / index access |
| `decodeJson` / `encodeJson` | `Result<unknown \| string, InvalidError>` | `JSON.parse`/`stringify` as a `Result` |

```typescript
import { tryCatch } from "plgg";

const parse = tryCatch(
  (s: string): number => JSON.parse(s),
);
// parse("not json") -> Err(Defect)
// parse("42")       -> Ok(42)
```

`bind` is the readable way to assemble a context across
async steps — each entry sees the keys bound before it:

```typescript
import { proc, bind, env } from "plgg";

const result = await proc(
  bind(
    ["apiKey", () => env("OPENAI_API_KEY")],
    ["greeting", ({ apiKey }) => `key len ${apiKey.length}`],
  ),
  ({ greeting }) => greeting,
);
```

## Next

[Structures & errors](/packages/plgg/structures-errors)
covers the other half of plgg core: records and
collections, the error vocabulary, and the typeclass
abstracts.
