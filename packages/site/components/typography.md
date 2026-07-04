# Typography

Two components carry the type system: `heading` and `prose`.

## Recorded rule

The heading `level` is a semantic prop that maps 1:1 to a real `h1`–`h4` element, and its visual size is drawn from the font-size token scale by that same level — so the document outline and the type scale never drift apart. There is no "looks like an h2 but is a div."

`prose` is a typographic container that establishes the reading baseline once: themed body ink and a capped readable measure (48rem). Per-element prose rules (link underline weight, code badges, list rhythm) are added one at a time as real documents demand them, not pre-built.

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
