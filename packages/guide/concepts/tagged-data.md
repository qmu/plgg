# Tagged data (`Box`)

Almost every plgg value is a **`Box`** — a tag plus a
content payload:

```typescript
export type Box<TAG extends string, CONTENT> = Readonly<{
  __tag: TAG;
  content: CONTENT;
}>;
```

`Ok`, `Err`, `Some`, and the error types
(`InvalidError`, `Defect`, …) are all just boxes with a
known tag. Because the tag is a string literal in the
type, the compiler can tell the variants apart, and
[`match`](/concepts/match) can fold them exhaustively.

Build one with the curried `box`:

```typescript
import { box } from "plgg";

const notFound = box("NotFound")("/missing");
// { __tag: "NotFound", content: "/missing" }
```

A variant with **no** payload (like `None`) is an
`Icon` — a tag on its own. Together, `Box` and `Icon`
give plgg tagged unions that are plain, serializable
data: no classes, no `instanceof`, no hidden prototype.

This matters for the rest of the ethos:

- **Errors are boxes**, not `Error` subclasses — see
  [Result, not throw](/concepts/result).
- **Pattern matching is by tag** — see
  [Exhaustive `match`](/concepts/match), where
  `pattern("NotFound")()` matches the box above.
