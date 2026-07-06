# Typography

Two components carry the type system: `heading` and `prose`.

## Recorded rule

The heading `level` is a semantic prop that maps 1:1 to a real `h1`–`h4` element, and its size, leading, and weight are drawn from the prose type scale (the shared [`typeStyle`](/design-tokens) token) by that same level — so the document outline and the type scale never drift apart. There is no "looks like an h2 but is a div."

The shipped scale is the guide's: level 1 renders `1.875rem` at line-height `1.25` and **weight 400** (not the old generic `2xl`/600), level 2 `1.5rem`/400, level 3 `1.1875rem`/400, level 4 `1.0625rem`/400.

`prose` is a typographic container that establishes the reading baseline once: themed body ink, the `body` type role (`1rem` at line-height `1.75`), and the capped readable `measure` (the `48rem` shell metric, via its `--pm-measure` custom property). Per-element prose rules (link underline weight, code badges, list rhythm) are added one at a time as real documents demand them, not pre-built.

## Usage

```ts
import { heading, prose } from "plggmatic";
import { p, text } from "plgg-view";

const title = heading(1, "Color scheme");

const body = prose([
  p([], [text("Tokens resolve through custom properties.")]),
]);
```

`heading` accepts levels `1` through `4`; an out-of-range level is a compile error.
