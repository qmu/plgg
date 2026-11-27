# Represent an optional value

An optional subtitle can be missing. `fromNullable` turns `null` and `undefined` into `None` and wraps every other value in `Some`, including the empty string. Supply a default with `getOr` when you display the subtitle.

```ts
import { fromNullable, getOr, pipe } from "plgg";

const subtitle = (value: string | undefined) =>
  pipe(fromNullable(value), getOr("—"));

console.log(subtitle(undefined)); // —
```
