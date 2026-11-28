# Validate fields with cast

Accept the input as `unknown`. Check the object with `asObj`, then validate its fields with `forProp`. On success, `title` is a `Str` containing a nonempty string and `copies` is a `Num`. Change the title to `""` and the count to `"2"` to see both field failures in the `InvalidError` value’s `content.sibling` array.

```ts
import {
  asNum,
  asObj,
  asStr,
  cast,
  forProp,
} from "plgg";

const readBook = (input: unknown) =>
  cast(
    input,
    asObj,
    forProp("title", asStr),
    forProp("copies", asNum),
  );

console.log(
  readBook({ title: "Field notes", copies: 2 }),
);
```

## Required keys and optional keys

`forProp` reports a missing key and passes a present value to the supplied caster. `forOptionProp` supplies `None` for a missing key and wraps a successfully decoded value in Some. An explicit `null` still counts as present. Omit the subtitle key in JSON if the subtitle is unknown.

Keep validators pure. Following a failure, `cast` can call later steps on the original input to collect other problems. Save to the database only after the final result succeeds.

```ts
import {
  asObj,
  asStr,
  cast,
  forOptionProp,
} from "plgg";

const subtitle = (input: unknown) =>
  cast(
    input,
    asObj,
    forOptionProp("subtitle", asStr),
  );

console.log(
  subtitle({}),
  subtitle({ subtitle: "North" }),
);
console.log(subtitle({ subtitle: null }).__tag); // Err
```

## Recognize a Str or construct one

`isStr` never converts its argument. Valid text from a form still fails this guard because it has no tag. Use `asStr` at an input boundary and `isStr` when branching on the existing representation. `refine` adds a predicate while preserving the input type. For each new condition, try both a valid input and one that violates just that condition to isolate the failure.

```ts
import {
  asStr,
  cast,
  isStr,
  refine,
  type Str,
} from "plgg";

const short = (v: unknown) =>
  cast(
    v,
    asStr,
    refine(
      (s: Str) => s.content.length < 4,
      "Too long",
    ),
  );

console.log(
  isStr("Map"),
  short("Map").__tag,
  short("Atlas").__tag,
);
```
