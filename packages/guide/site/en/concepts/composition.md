# Compose functions with pipe and flow

`pipe` processes its first argument immediately. `flow` builds a function you can reuse on other inputs. Both expressions below return `5`. When the input is a [Result](/concepts/result/), follow it with a function that accepts a `Result`, such as `mapResult`.

```ts
import { flow, pipe } from "plgg";

const trim = (s: string) => s.trim();
const length = (s: string) => s.length;
console.log(pipe(" Atlas ", trim, length));
console.log(flow(trim, length)(" Atlas "));
```

## Configure a step before the data arrives

Fix the prefix first and the remaining argument is exactly what the previous step produces. A function assembled with `flow` can then process several rows. `pipe` passes a `Result` intact. Use `mapResult` for a function that needs the successful payload, or `cast` for a sequence of validation steps.

```ts
import { flow } from "plgg";

const prefix = (label: string) => (s: string) =>
  label + s;
const caption = flow(
  (s: string) => s.trim(),
  prefix("Book: "),
);
console.log([" Atlas", "Maps "].map(caption));
```

## Decide whether the next step can fail

`pipe` establishes evaluation order. Computing a length is a plain transformation, while enforcing a maximum can fail. Passing that check to `mapResult` would place another `Result` inside the success box. `chainResult` keeps the output one `Result` deep.

```ts
import {
  asStr,
  chainResult,
  pipe,
  refine,
  type Str,
} from "plgg";

const short = refine(
  (s: Str) => s.content.length <= 4,
  "Too long",
);
console.log(
  pipe(asStr("Atlas"), chainResult(short)).__tag,
);
```
