# plgg — values & effects

A **guided** tour of the half of the `plgg` core you reach
for most — the value types and the composition
combinators — and **how that vocabulary is organized**.
This page teaches the shape; it does not enumerate every
symbol.

It assumes the [Core concepts](/concepts/) —
[`Option`](/concepts/option), [`Result`](/concepts/result),
[`cast`](/concepts/validation), [`proc`](/concepts/async),
and [`match`](/concepts/match) are explained there and only
used here. Its companion,
[Structures & errors](/packages/plgg/structures-errors),
covers records, collections, the error model, and the
typeclass abstracts.

## How the vocabulary is organized

`plgg` is one flat import surface (`import { … } from "plgg"`),
but it is organized into categories. The ones you reach for
when handling **values and effects**:

| Category | What it is for |
|----------|----------------|
| **Atomics** | validated bare primitives — native types (`Num`, `SoftStr`, `Time`, `Bool`, …) given an `asX`/`isX` validation seam |
| **Basics** | refined **branded** types — proof-carrying values (`Str`, `Float`, the ranged ints `I8`…`U128`, the case-strings) each with `asX`/`isX` |
| **Disjunctives** | the union types everything flows through: [`Option`](/concepts/option) and [`Result`](/concepts/result), with their `map`/`chain`/`match`/`getOr` combinators |
| **Contextuals** | the tagged carriers behind the unions — `box`/`pattern`/`isBox`/`hasTag`, `Ok`/`Err`, `Some`/`None` |
| **Flowables** | the composition core — `pipe`, `flow`, `cast`, `proc`, `match` |
| **Functionals** | small `proc`-friendly effect helpers — `tryCatch`, `env`, `refine`, `bind`, `conclude`, `atProp`/`atIndex`, `decodeJson`/`encodeJson` |

The per-category symbol lists (every Atomic, every
Functional, exact signatures) live in the `plgg` source.

## Atomics vs Basics — the one distinction worth learning

The two value categories differ structurally, and that
difference is the whole idea:

- An **Atomic** *is* the native type — `Num` is `number`.
  `asNum` validates `unknown` into it; nothing is branded.
- A **Basic** is a **branded box** — `Str` is
  `Box<"Str", string>`. A value only becomes a `Str` by
  passing `asStr`, so the type itself is proof of
  refinement and an unvalidated `string` won't fit.

```typescript
import { asNum, asStr, isOk } from "plgg";

asNum("42"); // Err — asNum does not coerce strings
isOk(asNum(42)); // true
// asStr(x): Result<Str, InvalidError>, Str = Box<"Str", string>
```

## Prefer `Str` for strings

For string values, reach for the branded **`Str`** (a
Basic), not the bare **`SoftStr`** (an Atomic). This is a
deliberate convention:

- **`Str`** (`Box<"Str", string>`) is the **robust,
  recommended** string type — distinct at the type level
  *and* in its runtime structure (a tagged box), so a value
  only becomes a `Str` by passing `asStr`. Use it for your
  domain's string fields.
- **`SoftStr`** is just `string` — the bare primitive. Its
  name is **intentionally long and redundant** to nudge you
  *away* from it, the same way the codebase avoids raw
  `string`. Reach for it only at a boundary where a value
  genuinely is an unrefined string.

So default to `Str`/`asStr`; treat `SoftStr` as the
low-level escape hatch, not the everyday choice. (Some
shipped APIs do type fields as `SoftStr` — e.g. HTTP
header/param maps — and those are described as-is on their
pages; the preference here is for *your* new code.)

## Effects — compose, don't enumerate

The Flowables and Functionals are meant to be **composed**,
so the concepts pages carry the worked examples:
[Validation with cast](/concepts/validation),
[Async with proc](/concepts/async),
[Exhaustive match](/concepts/match), and
[Data-last composition](/concepts/composition). The one
property to keep in mind: **`proc` infers the precise error
union** — each step contributes its own error type and
`Defect` is appended for unexpected throws, so you get
`Result<Out, E₁ | … | Defect>`, never `Result<Out, Error>`.

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
collections, the error model, and the typeclass abstracts.
