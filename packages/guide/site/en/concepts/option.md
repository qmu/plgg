# Represent an optional value

An optional subtitle can be missing. `fromNullable` turns `null` and `undefined` into `None` and wraps every other value in `Some`, including the empty string. Supply a default with `getOr` when you display the subtitle.

```ts
import { fromNullable, getOr, pipe } from "plgg";

const subtitle = (value: string | undefined) =>
  pipe(fromNullable(value), getOr("—"));

console.log(subtitle(undefined)); // —
```

## Decide what a blank field means

Use `mapOption` to trim a subtitle only when present. It wraps the transformed value in Some. Use `chainOption` when the transformation can itself return None. Mapping such a function would leave an `Option` inside an Option.

Choose a display fallback at the end. Substituting an empty string earlier would lose the distinction between a missing subtitle and one supplied empty. Only the first call below displays a dash.

```ts
import {
  fromNullable,
  getOr,
  mapOption,
  pipe,
} from "plgg";

const display = (raw?: string) =>
  pipe(
    fromNullable(raw),
    mapOption((s: string) => s.trim()),
    getOr("—"),
  );

console.log(
  display(),
  display("   "),
  display(" Atlas "),
);
```

## Turn absence into a failure at the point of use

No selection is ordinary while searching, but placing a reservation requires a book. Give `okOr` a reason to convert absence at that point. The reverse conversion, `toOption`, discards the reason. Keep the `Result` if the screen must explain the failure.

```ts
import { fromNullable, okOr, pipe } from "plgg";

const reserve = (id?: string) =>
  pipe(
    fromNullable(id),
    okOr("Choose a book first"),
  );

console.log(reserve(), reserve("A1"));
```
