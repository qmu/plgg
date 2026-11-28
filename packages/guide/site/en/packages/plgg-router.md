# plgg-router — Read parameters from a URL

Compile a pattern once with `compilePattern`, then pass a pathname to `matchSegments`. A `match` returns captured parameters inside `Some`, and a miss returns `None`. Use [plgg-view](/packages/plgg-view/) to reflect the result in the browser.

```ts
import {
  compilePattern,
  matchSegments,
} from "plgg-router";

const book = compilePattern("/books/:id");
console.log(matchSegments(book, "/books/42")); // Some({ id: "42" })
```

## Working with the API

`matchSegments(segments, pathname) → Option<Captured>`

Reuse the compiled segments for repeated matches. Pass the pathname. A captured id is still text, so a numeric-only constraint belongs to the caller.

## Capture the rest of a path

:id captures one segment and *path captures the remaining segments together. Use the latter for a nested document name. Captures are percent-decoded, with malformed escapes retained literally. A `match` still says nothing about whether that document exists.

```ts
import {
  compilePattern,
  matchSegments,
} from "plgg-router";

const route = compilePattern("/docs/*path");
console.log(
  matchSegments(
    route,
    "/docs/books/field%20notes",
  ),
);
```
