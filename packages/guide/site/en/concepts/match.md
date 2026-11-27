# Cover each case with match

Give `match` a handler for each variant. Remove either branch below and TypeScript reports the missing case. To handle several remaining cases the same way, use `otherwise` as the final pattern.

```ts
import { match, pattern } from "plgg";
import type { Box } from "plgg";

type Entry = Box<"Title", string> | Box<"Count", number>;
const label = (entry: Entry): string =>
  match(entry)(
    [pattern("Title")(), (b) => b.content],
    [pattern("Count")(), (b) => String(b.content)],
  );
```
