# Option, not null

An `Option<T>` is a value that may be absent — `Some<T>`
or `None` — modeled as [tagged data](/concepts/tagged-data)
so absence is something the compiler forces you to
handle, never a `null` that slips through:

```typescript
export type Option<T> = Some<T> | None;
```

## Building an Option

Lift a possibly-nullish value with `fromNullable` —
`null`/`undefined` become `None`, anything else `Some`:

```typescript
import { fromNullable, some, none } from "plgg";

fromNullable(process.env.PORT); // Some<string> | None
fromNullable(null); // None
some(42); // Some<number>
none(); // None
```

## Folding an Option

Prefer the eliminators over reaching into `.content`.
`getOr` supplies a fallback; `matchOption` folds both
cases into one value; `okOr` turns absence into a typed
[`Result`](/concepts/result) failure. All are data-last,
so they drop straight into a
[pipe](/concepts/composition):

```typescript
import { pipe, fromNullable, getOr } from "plgg";

const port = pipe(
  fromNullable(process.env.PORT),
  getOr("3000"),
);
```

```typescript
import { matchOption } from "plgg";

const label = matchOption(
  () => "anonymous",
  (name: string) => `hello, ${name}`,
);
// label(some("ada")) -> "hello, ada"
// label(none())      -> "anonymous"
```

`mapOption`/`chainOption` transform the value when it is
present and pass `None` through untouched, so a whole
chain stays absence-safe without a single `if`.
