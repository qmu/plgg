---
type: Concern
origin_pr: 59
origin_pr_url: https://github.com/qmu/plgg/pull/59
origin_branch: work-20260704-015006
origin_commit: a75c984
created_at: 2026-07-04T11:02:58+09:00
last_seen: 2026-07-04T11:02:58+09:00
first_seen: 2026-07-04T11:02:58+09:00
concern_id: plgg-parser-concrete-s-pinning-is
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# plgg-parser concrete-S pinning is an ergonomic sharp edge

## Description

`plgg-parser`'s primitives are state-polymorphic (`Parser<A, S>` for any `S`). When a concrete grammar (fixed `S`, e.g. `LexState`) combines an S-polymorphic leaf through a generic combinator, TypeScript's inference defaults `S` to `unknown`, and the result then fails to assign to the concrete `Parser<A, LexState>` because `S` sits in a contravariant (state-parameter) position. The working pattern — used in both the demo and the plgg-highlight grammar — is to pin each leaf to the grammar's `S` once by direct annotation (`const chr = (c): Parser<SoftStr, LexState> => char(c)`), after which the combinators infer `S`. This is documented in code comments but is a non-obvious sharp edge for future plgg-parser consumers.

## How to Fix

Consider a `specialize<S>()` helper that returns an S-fixed facade of the primitive set in one call, or document the pinning idiom in the plgg-parser README's "writing a grammar" section. Low priority — the pattern is a one-liner per leaf and is already followed in both existing grammars.
