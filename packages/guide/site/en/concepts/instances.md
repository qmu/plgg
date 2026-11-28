# Pass a capability as a value

A function that only needs one caster can take `asStr` directly. For an algorithm shared by several types, accept an object with the operations the algorithm needs. A `Refinable` supplies an is guard. A `Castable` supplies an as function returning a Result. Both keep methods off the domain data.

## Preserve the narrowed type

This filter needs only a guard. Supplying `strRefinable` determines the output element type as Str. A raw string undergoes no conversion, so just one element remains. Use `strCastable` for conversion.

```ts
import {
  box,
  strCastable,
  strRefinable,
  type Refinable,
} from "plgg";

const select =
  <T>(rule: Refinable<T>) =>
  (values: readonly unknown[]) =>
    values.filter(rule.is);

console.log(
  select(strRefinable)([
    "Atlas",
    box("Str")("Maps"),
  ]),
);
console.log(strCastable.as("Atlas").__tag);
```

## Supply an ordering

To order titles by length, give the caller a `Comparable` with just the comparison rule. Titles acquire no new methods. The possible results are -1, 0 and 1. Equal-length titles compare equal under this rule.

```ts
import type { Comparable } from "plgg";

const byLength: Comparable<string> = {
  compare: (a, b) =>
    a.length === b.length
      ? 0
      : a.length < b.length
        ? -1
        : 1,
};
console.log(
  ["Atlas", "Map"].toSorted(byLength.compare),
);
```
