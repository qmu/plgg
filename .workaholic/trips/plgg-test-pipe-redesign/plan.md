---
instruction: "Redesign plgg-test FROM THE DESIGN PHASE so its public authoring/assertion API embodies plgg's pipe-style data-last functional composition (pipe/cast/proc/flow, Option/Result, exhaustive match) — NOT the fluent expect(x).toBe(y) method-chain of the first attempt. Assertions should be composable data-last functions returning Result, piped, not a stateful chainable object that throws. Idiomatic composition is prioritized OVER drop-in vitest migration. Keep a real minimal runner with --watch and four-metric coverage; the existing plgg-test plumbing (runner/discovery/reporter/resolver/coverage/watch) is prior art to reuse/refactor. House style mandatory; breaking changes fine."
phase: planning
step: not-started
iteration: 0
updated_at: 2026-06-23T21:41:42+09:00
---

# Trip Plan

## Initial Idea

Redesign plgg-test FROM THE DESIGN PHASE so its public authoring/assertion API embodies plgg's pipe-style data-last functional composition (pipe/cast/proc/flow, Option/Result, exhaustive match) — NOT the fluent expect(x).toBe(y) method-chain of the first attempt. Assertions should be composable data-last functions returning Result, piped, not a stateful chainable object that throws. Idiomatic composition is prioritized OVER drop-in vitest migration. Keep a real minimal runner with --watch and four-metric coverage; the existing plgg-test plumbing (runner/discovery/reporter/resolver/coverage/watch) is prior art to reuse/refactor. House style mandatory; breaking changes fine.

## Plan Amendments

## Progress

- [x] [Planner] Drafted `directions/direction-v1.md` — business vision for the pipe-style plgg-test redesign: the test suite is the most-read teaching surface, so a fluent OOP-style chain is corrosive in an Option/Result data-last codebase; assertions become composable data-last functions returning Result. Owns the explicit trade-off (idiom OVER drop-in vitest compat; every spec gets rewritten, not re-imported) and why it's worth paying. Personas, risks-with-mitigations (the Result-can-be-silently-dropped false green is the existential one; success = reads naturally as a pipeline AND no false green), and verifiable success criteria. Reuse the proven runner/discovery/reporter/resolver/watch/coverage plumbing.
- [x] [Architect] Drafted `models/model-v1.md` — structural model grounded in plgg's combinators (pipe/cast/proc/match, Result/Option folds, all read in `packages/plgg/src/Flowables` + `Disjunctives`) and the prior-art plgg-test plumbing. Proposes: `Assertion = Result<Pass,Fail>` (plgg's own Result, not a bespoke type); matcher = data-last `(expected)=>(actual)=>Assertion` composed under `pipe`; negation/multi/async as combinators (`not`, `all` mirroring `cast`'s sibling accumulation, async via `proc`) not `.not`/`.resolves` chain segments; `test(name, body)` where the body RETURNS the assertion the runner folds. Throw-vs-return decision: assertions RETURN Result (verdict from the returned value); throw is the Defect/misuse path only, mirroring proc. Reuse Runner(refactor the catch-throw seam)/Registry/Reporter/Discovery/Coverage/Resolver/Watch unchanged. Top risks: silent-dropped Result (existential — close via non-void body type + Runner fail-on-void guard), `assert` narrowing survival (prefer value-carrying matchers over an `asserts cond` throw), async fold correctness, ergonomic regression on the trivial single-`toBe` (a `check` sugar lever), deep-equal fidelity.
