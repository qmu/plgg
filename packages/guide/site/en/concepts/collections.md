# Records, dictionaries and sequences

A book has known fields such as title and copies, each with a different validator. Use `Obj` with `forProp` for that case. A catalog indexed by accession number can have arbitrarily many keys, all with the same value rule. Pass that one caster to asDictOf.

## Read a failed collection decode

`asDictOf` rejects arrays and reports the first failing key when a value is invalid. Use `asVecOf` for a sequence whose order matters. A valid dictionary still might lack the requested key. Wrap an indexed lookup with `fromNullable` to preserve absence.

```ts
import { asDictOf, asStr, asVecOf } from "plgg";

const catalog = asDictOf(asStr);
console.log(
  catalog({ A1: "Atlas", B2: "" }).__tag,
);
console.log(
  asVecOf(asStr)(["Atlas", "Maps"]).__tag,
);
```

## Decode elements before transforming a sequence

Recognizing an array says nothing about applying string operations to its elements. `asVecOf`(`asStr`) checks each element and reports the first bad index. An empty list is valid. Add a separate refinement if you require at least one entry.

```ts
import { asStr, asVecOf, isErr } from "plgg";

const titles = asVecOf(asStr);
const invalid = titles(["Atlas", 42]);
if (isErr(invalid))
  console.log(invalid.content.content.message);
console.log(titles([]).__tag);
```
