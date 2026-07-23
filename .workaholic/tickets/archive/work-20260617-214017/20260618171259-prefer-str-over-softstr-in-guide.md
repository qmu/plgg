---
created_at: 2026-06-18T17:12:59+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.5h
commit_hash: a53f7d1
category: Changed
depends_on:
---

# Prefer `Str` over `SoftStr` in the guide, and teach why

## Overview

The guide leans on `SoftStr` / `asSoftStr` in its examples and framing — but that
is backwards relative to the design intent. The naming is deliberate:

- **`SoftStr`** is intentionally **long and redundant**. It is the *bare* string
  primitive (`type SoftStr = string`), and its verbose name is a **deliberate
  nudge away from it** — the same way the project avoids raw `string`.
- **`Str`** is the **recommended** string type: a short, **branded** type
  (`Box<"Str", string>`) that is more robust — distinct not just at the type
  level but in its **runtime structure** (a tagged box, not a bare string). It is
  the one developers should reach for.

So the guide should **actively encourage `Str`** (and `asStr`) and present
`SoftStr` as the low-level/escape primitive it is — explaining the naming
rationale rather than modelling `asSoftStr` as the default for string fields.

## Key Files

- `packages/guide/packages/plgg/values-effects.md` — the "Atomics vs Basics"
  section currently presents `SoftStr` (Atomic) and `Str` (Basic) fairly
  neutrally; reframe to recommend `Str` and explain *why* `SoftStr`'s name is
  long. This is the natural home for the guidance.
- `packages/guide/concepts/validation.md` — the `cast`/`forProp` examples use
  `asSoftStr` for a user's `email`/`name` field; switch the *user-modelled*
  examples to `asStr` so the docs lead by example.
- `packages/guide/getting-started.md` — the first-pipeline `UserProfile` example
  (`email: SoftStr`, `forProp("email", asSoftStr)`); switch to `Str`/`asStr`.
- `packages/guide/packages/plgg/structures-errors.md` — the `asNamed` example
  uses `forProp("name", asSoftStr)`; switch to `asStr`.
- `packages/guide/packages/{plgg-http,plgg-server,plgg-router,plgg-sql,plgg-fetch,plgg-view}.md`
  — **audit, don't blanket-replace**: many `SoftStr` mentions here describe
  *shipped* types (e.g. `Dict<string, SoftStr>` for header/param maps,
  `InvalidError`'s `message: SoftStr`). Those are accurate and must stay; only
  change places where the guide writes a *new* user example that should model
  `Str`.
- `packages/plgg/README.md` — its Quick Start `UserProfile` example also uses
  `asSoftStr`; worth aligning so the canonical README and guide agree (optional,
  same edit).

## Implementation Steps

1. **Add the guidance.** In `values-effects.md` (and/or `concepts/validation.md`),
   state plainly: prefer `Str` for string values; `SoftStr` is the bare primitive,
   named verbosely on purpose to discourage casual use (just like raw `string`).
   Note `Str` is branded — different at the type *and* runtime level.
2. **Switch user-modelled examples** from `asSoftStr`/`SoftStr` to `asStr`/`Str`
   in `getting-started.md`, `concepts/validation.md`, and
   `structures-errors.md` (the `asNamed` example), keeping the snippets accurate
   against the real `asStr` signature (`asStr(x): Result<Str, InvalidError>`).
3. **Audit the per-package pages**: leave `SoftStr` where it names a shipped type
   (header/param/query `Dict<string, SoftStr>`, error `message: SoftStr`, router
   `Location` string values); do not misrepresent shipped signatures.
4. **Rebuild** (`npm run build` in `packages/guide`) and confirm no dead links and
   the examples still read correctly.

## Considerations

- **Don't misrepresent shipped APIs.** Several packages genuinely type fields as
  `SoftStr` (e.g. `HttpRequest`/`Dict<string, SoftStr>`, `InvalidError.message`).
  The guide must keep describing those as `SoftStr`; the "prefer `Str`" guidance
  is about **new user code**, not a rename of existing signatures.
  (`packages/plgg-http`, `packages/plgg/src/Exceptionals/InvalidError.ts`)
- **Bigger, separate question (out of scope).** Whether the *packages themselves*
  should migrate their public string fields from `SoftStr` to `Str` to lead by
  example is a much larger, breaking change to plgg core and the HTTP stack — it
  deserves its own design ticket, not this docs-focused one.
- **Design lens (`standards:design`).** This is about *reach* and good defaults:
  steer developers to the robust branded type by default, while leaving the bare
  primitive available (and clearly labelled) for when it is genuinely needed.
- **Samples from real code** (doc-conventions rule): verify the `asStr`/`Str`
  snippets against `packages/plgg/src/Basics/Str.ts` so they stay correct.

## Final Report

Development completed. Added a **"Prefer `Str` for strings"** section to
`values-effects.md` explaining the design intent (`SoftStr` named verbosely on
purpose; `Str` is the recommended branded type, distinct at type *and* runtime
level), and switched the user-modelled examples to `Str`/`asStr` in
`getting-started.md`, `concepts/validation.md`, and `structures-errors.md`
(the `asNamed` example), plus aligned the canonical `plgg/README.md` Quick Start.
Verified `asStr(x): Result<Str, InvalidError>` against `Basics/Str.ts`.

### Discovered Insights

- **Insight**: The `Str`-over-`SoftStr` preference is a deliberate design lever,
  not a style nit — `SoftStr`'s verbose name *is* the nudge. Recorded as a
  persistent memory so future doc/code work defaults to `Str`.
- **Insight**: Per-package pages legitimately keep `SoftStr` where it names a
  shipped type (`Dict<string, SoftStr>` for HTTP header/param maps,
  `ResponseBody`'s `SoftStr | Bytes | Stream`, `InvalidError.message: SoftStr`,
  router `Location` strings). Those were left as-is — the preference is for *new
  user code*, and misrepresenting shipped signatures would be wrong.
- **Insight (still open)**: leading by example fully would mean migrating the
  packages' own public string fields from `SoftStr` to `Str` — a larger breaking
  change across plgg core and the HTTP stack. Deliberately left as a separate
  design ticket; this one is docs-only.
