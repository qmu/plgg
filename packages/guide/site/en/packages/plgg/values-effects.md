# Values and transformations

Decide whether an empty string is meaningful before measuring the text. `asSoftStr` accepts empty strings. `asStr` rejects them and wraps valid input in a `Str`. With `mapResult`, the transformation runs only when validation succeeds.

```ts
import { asStr, mapResult, pipe } from "plgg";

import type { Str } from "plgg";

const titleLength = (input: unknown) =>
  pipe(
    asStr(input),
    mapResult(
      (title: Str) => title.content.length,
    ),
  );
console.log(titleLength("Atlas")); // Ok(5)
```

## Choose a fallback at the display boundary

A length label could say “missing” whenever validation fails. That would also mask a number sent in place of a title. Keep the reason through the transformation and turn it into text only when rendering the label.

```ts
import {
  asStr,
  matchResult,
  pipe,
  type InvalidError,
  type Str,
} from "plgg";

const label = (v: unknown) =>
  pipe(
    asStr(v),
    matchResult(
      (e: InvalidError): string =>
        e.content.message,
      (s: Str): string =>
        String(s.content.length),
    ),
  );

console.log(label("Atlas"), label(42));
```
