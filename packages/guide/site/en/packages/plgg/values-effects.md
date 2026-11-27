# Values and transformations

Decide whether an empty string is meaningful before measuring the text. `asSoftStr` accepts empty strings. `asStr` rejects them and wraps valid input in a `Str`. With `mapResult`, the transformation runs only when validation succeeds.

```ts
import { asStr, mapResult, pipe } from "plgg";

import type { Str } from "plgg";

const titleLength = (input: unknown) =>
  pipe(asStr(input), mapResult((title: Str) => title.content.length));
console.log(titleLength("Atlas")); // Ok(5)
```
