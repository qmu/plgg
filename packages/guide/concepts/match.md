# Exhaustive `match`

`match` folds a value — a literal, an
[`Option`](/concepts/option)/[`Result`](/concepts/result),
or any [tagged union](/concepts/tagged-data) — into a
single result, and the compiler checks that the cases are
**exhaustive**: a missing variant is a type error, not a
runtime surprise.

It is curried — `match(value)(...cases)` — where the
value fixes the matched type and each case is a
`[pattern, handler]` pair:

```typescript
import { match } from "plgg";

const s1 = 1 as const,
  s2 = 2 as const,
  s3 = 3 as const;
type Status = typeof s1 | typeof s2 | typeof s3;

const describe = (a: Status): string =>
  match(a)(
    [s1, () => "one"],
    [s2, () => "two"],
    [s3, () => "three"],
  );
// Dropping a case makes the call a compile error.
```

## Matching tagged variants

For boxed unions, the `$`-matchers build patterns by tag,
and the handler receives the matched variant with its
content typed — no `as`, no `.content` guesswork:

```typescript
import { match, ok$, err$, otherwise } from "plgg";
import type { Result } from "plgg";

const render = (r: Result<string, number>): string =>
  match(r)(
    [ok$(), (b) => `ok: ${b.content}`],
    [err$(404), () => "not found"],
    [otherwise, () => "other error"],
  );
```

`some$()`/`none$()` match `Option`; `pattern("Tag")()`
matches any box by tag for your own unions:

```typescript
import { match, pattern, box } from "plgg";
import type { Box } from "plgg";

type HttpError =
  | Box<"NotFound", string>
  | Box<"ServerError", string>;

const status = (e: HttpError): string =>
  match(e)(
    [pattern("NotFound")(), (b) => `404 ${b.content}`],
    [pattern("ServerError")(), (b) => `500 ${b.content}`],
  );
```

## otherwise and non-exhaustive matches

Pass `otherwise` as the **last** pattern for a catch-all.
Without it, the cases must cover the union. If a `match`
is somehow reached at runtime with no matching case (an
untyped call, or a value outside the declared union), it
returns a `CoverageError` value carrying the input —
detectable with `isCoverageError` — rather than throwing.

For the common error types there are ergonomic folds
built on `match`: `matchResult`, `matchOption`, and
`matchPlggError`.
