# plgg-router — Read parameters from a URL

Compile a pattern once with `compilePattern`, then pass a pathname to `matchSegments`. A match returns captured parameters inside `Some`, and a miss returns `None`. Use [plgg-view](/packages/plgg-view/) to reflect the result in the browser.

```ts
import { compilePattern, matchSegments } from "plgg-router";

const book = compilePattern("/books/:id");
console.log(matchSegments(book, "/books/42")); // Some({ id: "42" })
```
