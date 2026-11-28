# Distinguish values with Box

A book title and an author name can both be strings. Pass a tag to `box`, then supply the value. Read `__tag` to identify the variant and `content` to retrieve the value. See [match](/concepts/match/) for handling several variants.

```ts
import { box } from "plgg";

const title = box("Title")("Field notes");
console.log(title.__tag, title.content); // Title Field notes
```

## Keep an author out of the title slot

Two string arguments can trade places without a type error. Give each role a tag and centralize construction. The function below accepts a Title. Passing an `Author` would fail the typecheck.

Tagging and checking the payload are separate operations. A `box` preserves whitespace and accepts its argument unchanged. Apply `asStr` or a domain predicate before constructing one from external input.

```ts
import { box, type Box } from "plgg";

type Title = Box<"Title", string>;
const title = box("Title");
const heading = (t: Title) => t.content;

console.log(heading(title("Atlas")));
```

## Decode an already tagged value

A decoded value can cross another boundary. `asStr` preserves a valid `box` and wraps a raw string once. Checking just the tag would miss a `box` with an empty payload.

```ts
import { asStr, box, isStr } from "plgg";

const valid = box("Str")("Atlas");
console.log(isStr("Atlas"), isStr(valid));
console.log(
  asStr(valid).__tag,
  asStr(box("Str")("")).__tag,
);
```
