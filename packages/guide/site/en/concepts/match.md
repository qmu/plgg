# Cover each case with match

Give `match` a handler for each variant. Remove either branch below and TypeScript reports the missing case. To handle several remaining cases the same way, use `otherwise` as the final pattern.

```ts
import { box, match, pattern } from "plgg";
import type { Box } from "plgg";

type Entry =
  | Box<"Title", string>
  | Box<"Count", number>;
const label = (entry: Entry): string =>
  match(entry)(
    [pattern("Title")(), (b) => b.content],
    [
      pattern("Count")(),
      (b) => String(b.content),
    ],
  );
console.log(
  label(box("Title")("Atlas")),
  label(box("Count")(2)),
);
```

## Make a new case visible

Adding a tag to `Entry` requires label to say how it should appear. An `otherwise` branch would silently absorb that new case. List branches explicitly when each case deserves its own rendering or behavior.

Use `defineVariant` when construction and matching need to share a tag. Supply the payload to make. A pattern handler receives the entire box.

```ts
import { defineVariant, match } from "plgg";

const Copies = defineVariant("Copies")<number>();
const Missing =
  defineVariant("Missing")<string>();
type Count =
  | ReturnType<typeof Copies.make>
  | ReturnType<typeof Missing.make>;
const display = (count: Count): string =>
  match(count)(
    [Copies.pattern(), (b) => String(b.content)],
    [Missing.pattern(), (b) => b.content],
  );
console.log(
  display(Copies.make(3)),
  display(Missing.make("unknown")),
);
```

## Use a catch-all deliberately

When the screen needs only two outcomes, it need not name every status separately. The example singles out the reservable state and groups the remaining values. Revisit this decision if a new status is introduced.

```ts
import { match, otherwise } from "plgg";

const ready: "ready" = "ready";
type State = typeof ready | "lent" | "repair";
const label = (state: State): string =>
  match(state)(
    [ready, () => "Reserve"],
    [otherwise, () => "Unavailable"],
  );
console.log(label("repair"));
```
