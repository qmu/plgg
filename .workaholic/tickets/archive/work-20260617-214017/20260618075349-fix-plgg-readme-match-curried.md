---
created_at: 2026-06-18T07:53:49+09:00
author: a@qmu.jp
type: housekeeping
layer: [Domain]
effort: 0.1h
commit_hash: 3472906
category: Changed
depends_on:
---

# Fix stale `match` example in plgg README (curried form)

## Overview

`packages/plgg/README.md` documents `match` in a **non-curried** form that no
longer compiles against the shipped API:

```typescript
match(
  r,
  [ok$("hello"), () => "Greeting"],
  [err$(404), () => "Not found"],
  [otherwise, () => "Something else"],
);
```

The shipped `match` is **curried** — `match(value)(...cases)` — where the value
fixes the matched type and the case list follows in a second call. Update the
README's "Pattern Matching with match" example (and any other `match(` usages in
the README) to the current curried form, so a reader copying it gets compiling
code.

This was discovered while writing the VitePress guide (`packages/guide`), which
already uses the correct curried form on its
[Exhaustive match](packages/guide/concepts/match.md) and core-API pages; this
ticket brings the canonical package README in line with both the source and the
guide.

## Key Files

- `packages/plgg/README.md` — the "### Pattern Matching with match" section
  (~lines 79–98) holds the stale example; this is the file to fix.
- `packages/plgg/src/Flowables/match.ts` — the source of truth: `match<A>(a: A):
  MatchCont<A>` (the curried signature) plus the `MatchCont` call overloads that
  accept the `[pattern, handler]` cases.
- `packages/plgg/src/Flowables/match.spec.ts` — tested usages (`match(a)(...)`,
  `match(r)([ok$(), …], …)`); lift the corrected example from here so it cannot
  drift again.

## Implementation Steps

1. Rewrite the README "Pattern Matching with match" example to the curried form,
   e.g.:
   ```typescript
   const describe = (r: Result<string, number>): string =>
     match(r)(
       [ok$("hello"), () => "Greeting"],
       [err$(404), () => "Not found"],
       [otherwise, () => "Something else"],
     );
   ```
2. Scan the rest of `README.md` for any other non-curried `match(` call and
   correct it the same way.
3. Verify the corrected snippet against `match.spec.ts` so the shape matches a
   tested call exactly.

## Considerations

- Documentation-only change; no source edits and no behavior change
  (`packages/plgg/README.md`).
- Keep the surrounding prose (exhaustiveness, `otherwise` as the trailing
  catch-all) intact — only the call shape is wrong.
- Samples must match the real, tested API (the house "code samples come from
  real code" rule); pull from `match.spec.ts`, not memory.

## Final Report

Development completed as planned. Changed the single `match(r, ...)` call in
`packages/plgg/README.md` to the curried `match(r)(...)` form, matching the
shipped `MatchCont` signature and the `match.spec.ts` usages. The surrounding
prose and the `ok$`/`err$`/`otherwise` cases were already correct.

### Discovered Insights

- **Insight**: The README had exactly one `match(` occurrence, so the fix was a
  one-line edit (the `match(r,` → `match(r)(` split). No other non-curried call
  existed in the file.
