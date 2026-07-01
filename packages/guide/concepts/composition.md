# Data-last composition

plgg builds behavior by passing a value through a chain
of functions. Two primitives do this for plain values
(for `Result`/async chains, reach for
[`cast`](/concepts/validation) and
[`proc`](/concepts/async)).

## `pipe` — value first

`pipe(value, f, g, …)` threads `value` left-to-right
through each function, fully typed at every step:

```typescript
import { pipe } from "plgg";

const wordCount = pipe(
  "hello world",
  (s: string) => s.split(" "),
  (words: string[]) => words.length,
); // 2
```

## `flow` — compose without the value

`flow(f, g, …)` is the same composition but **point-free**
— it returns a new function, useful when you have the
steps before the input:

```typescript
import { flow } from "plgg";

const wordCount = flow(
  (s: string) => s.split(" "),
  (words: string[]) => words.length,
);

wordCount("hello world"); // 2
```

## Config-first, data-last

This is the idiom behind the whole library: a combinator
takes its **configuration first** and returns a function
awaiting the **data last**. That trailing-data shape is
exactly what `pipe`/`flow`/`cast`/`proc` consume, so
combinators compose without adapters:

```typescript
import { pipe, mapResult, mapErr } from "plgg";

// forProp("id", asNum), mapResult(f), mapErr(g), getOr(x)
// are all "config now, data later" — they slot directly
// into a pipe.
pipe(
  someResult,
  mapResult((n: number) => n + 1),
  mapErr((e) => ({ reason: e })),
);
```

Reading a pipeline top-to-bottom tells you the data's
journey; each line is one well-typed transformation.
That same shape scales from a two-line helper to a whole
HTTP handler in [plgg-server](/packages/plgg-server).
