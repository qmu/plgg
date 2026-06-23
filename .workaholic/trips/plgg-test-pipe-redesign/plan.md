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
