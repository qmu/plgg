---
type: Concern
origin_pr: 59
origin_pr_url: https://github.com/qmu/plgg/pull/59
origin_branch: work-20260704-015006
origin_commit: a75c984
created_at: 2026-07-04T11:02:58+09:00
last_seen: 2026-07-16T15:11:50+09:00
first_seen: 2026-07-04T11:02:58+09:00
concern_id: plgg-parser-omits-attempt-by-design
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# plgg-parser omits attempt by design (stateless-failure backtracking)

## Description

The `create-plgg-parser` ticket's implementation-steps prose listed an `attempt` (backtracking) combinator. It was deliberately NOT shipped: in this design a failed parser returns no state (the `Err` channel carries only an `InvalidError`, no position), so whoever holds the pre-attempt `ParseState` still owns it and backtracking is automatic — `or`, `optional`, and `many` backtrack for free. An `attempt` combinator would therefore be a no-op. The library ships `lookahead` and `notFollowedBy` (the PEG `&`/`!` predicates) instead, which the stateless model cannot express for free. This is recorded so a future reader does not "add the missing combinator" without understanding why it is absent (documented in `Parser.ts`).

## How to Fix

No fix needed — this is a recorded design decision. Only revisit if plgg-parser later adopts consumed-input tracking (Parsec-style), at which point `attempt` would regain meaning.
