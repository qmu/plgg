# Choose a core function

Import the core functions directly from `plgg`. Use `cast` for validation, `pipe` and `flow` for synchronous composition, and `proc` for asynchronous steps.

See [Values and transformations](/packages/plgg/values-effects/) to work with a validated string, or [Structures and errors](/packages/plgg/structures-errors/) to inspect a failed record validation.

## What core can do on its own

Measuring a validated title needs neither HTTP nor SQL. An unknown input lets tests exercise values of the wrong type without making a false claim to the compiler. Here `mapResult` runs its callback only for a successfully decoded title.

| Task | Function and output |
| --- | --- |
| Recognize an existing `Str` | `isStr`(value) is a type guard |
| Construct a `Str` from external input | `asStr`(value) returns `Result`<`Str`, `InvalidError`> |
| Transform the success value | `mapResult`(f)(result) produces a new success or preserves the failure |
| Choose one display value | `matchResult`(onErr, onOk)(result) returns the common branch type |

```ts
import { asStr, mapResult, type Str } from "plgg";

const measure = (v: unknown) =>
  mapResult((s: Str) => s.content.length)(
    asStr(v),
  );

console.log(measure("Atlas"), measure(5));
```
