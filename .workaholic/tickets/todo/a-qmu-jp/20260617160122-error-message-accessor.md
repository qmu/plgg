---
created_at: 2026-06-17T16:01:22+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Error-message accessor + put the `$`-matchers to work (ergonomics)

## Overview

P2 ergonomics finding from the higher-perspective review. After the
errors-as-data migration, reading a failed `Result`'s message is
`result.content.content.message` (Err box → error box → payload) — two identical
`.content` hops, appearing in 40+ sites (`cast.ts`, `Vec.ts`, foundry
`operate.ts`, dozens of specs). It is exactly the manual `.content`-reaching the
house eliminators exist to forbid, and TS won't catch stopping one level short
(both levels are objects). Meanwhile the `$`-matchers
(`invalidError$`/`serializeError$`/`deserializeError$`/`defect$`) have **zero
callers** — the intended ergonomic path is unused, so the double-`.content` read
is the de-facto public API.

## Key Files

- `packages/plgg/src/Exceptionals/PlggError.ts` (or a new `usecase` module) -
  add a data-last `plggErrorMessage(e: PlggError): SoftStr` and a
  `matchPlggError` that dispatches on `__tag`.
- `packages/plgg/src/Disjunctives/Result.ts` (or Exceptionals) - add a
  `resultErrorMessage`/`errMessage` that folds a `Result<_, PlggError>` to its
  message via `matchResult` + `plggErrorMessage`.
- Representative library sites to route through it: `packages/plgg/src/Flowables/cast.ts`,
  `packages/plgg/src/Collectives/Vec.ts`,
  `packages/plgg-foundry/src/Foundry/usecase/operate.ts`.

## Implementation Steps

1. Add `plggErrorMessage` + `matchPlggError` (built on the existing `$`-matchers,
   giving them their first real callers) + `errMessage` for `Result`. Specs.
2. Route the library sites that currently do `*.content.content.message` through
   the accessor. Do **not** churn all existing specs — convert library code and
   require new code to use the accessor.
3. Decide the fate of the `$`-matchers: now exercised by `matchPlggError` (keep),
   or if a different shape is chosen, delete the dead surface.
4. `scripts/tsc-plgg.sh` clean, `scripts/check-all.sh` green; coverage >90%.

## Considerations

- **Don't flatten the data shape.** The `Err<Box>` nesting is structurally
  correct; a small named accessor is the right-sized fix, not re-modelling.
  (review: type-soundness lens)
- **Scope discipline.** This is ergonomics polish, not a bug — keep the diff
  focused on the accessor + a few representative library conversions so it stays
  reviewable. Pairs naturally with the SSG ticket, which should read SSG errors
  through the new accessor from the start.
- **Possible follow-up (nice-to-have, separate ticket):** factor a shared
  "boundary error" primitive in core — a tagged `{ message, cause: Option<unknown> }`
  constructor + a single `liftThrow(tag)(cause)` helper — so `Defect`/`SqlError`
  (and future `HttpError`/`ClientError`) stop re-implementing the same
  `instanceof Error ? …` lifter. (review: design-altitude lens; "don't clone
  garbage".)
