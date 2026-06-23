---
instruction: "Create a new package plgg-test — a from-scratch minimal test framework for the plgg monorepo to drop the vitest dependency and avoid Dependabot churn. Traditional describe/it/expect-style API for minimal test migration. Minimum but real implementation. Must include a --watch option (re-run on file change). Coverage support may need to be addressed/corrected. plgg house style (Option/Result, no as/any/ts-ignore). plgg is its own only consumer; breaking changes fine."
phase: planning
step: not-started
iteration: 0
updated_at: 2026-06-23T17:04:26+09:00
---

# Trip Plan

## Initial Idea

Create a new package plgg-test — a from-scratch minimal test framework for the plgg monorepo to drop the vitest dependency and avoid Dependabot churn. Traditional describe/it/expect-style API for minimal test migration. Minimum but real implementation. Must include a --watch option (re-run on file change). Coverage support may need to be addressed/corrected. plgg house style (Option/Result, no as/any/ts-ignore). plgg is its own only consumer; breaking changes fine.

## Plan Amendments

## Progress

- [x] [Planner] Drafted `directions/direction-v1.md` — business vision for the plgg-test from-scratch test framework (value proposition, personas, business risks with mitigations, "minimum but real" definition, success criteria).
- [x] [Architect] Drafted `models/model-v1.md` — structural model grounded in the current vitest setup: business-need→component coherence map, domain model (Suite/Test/Hook/Expect/Matcher/Runner/Discovery/Reporter/Watcher/Coverage/TestDouble), translation-fidelity analysis (closed matcher set from the 132-file corpus; import-source rewrite; the single `vi.mock` outlier; `toEqual` as the false-green vector), dependency boundary (`plgg` + Node built-ins only; Node native strip-types over tsx), and ranked structural risks (in-house V8 coverage, alias resolution, deep-equality fidelity, module mocking, watch reliability).
- [x] [Constructor] Drafted `designs/design-v1.md` — buildable technical plan: enumerated API surface (test/it/describe + skip, 13 expect matchers with exact corpus counts + .not/.resolves, asserts-cond `assert` used 448×, scoped `vi`) from the real specs; native-Node TS execution via `--experimental-strip-types` + a `module.register` resolver hook for the `plgg/index` alias (no tsx/bundler — verified locally); `fs.watch`+debounce watch; zero-dep V8 coverage via `NODE_V8_COVERAGE` with the >90% gate; bootstrapping via a meta-harness + both-runners parity gate; command-scripts-compliant integration; Policies section (directory-structure, coding-standards, testing, command-scripts, CI, dependencies).
- [x] [Planner] Submitted `reviews/round-1-planner.md` — business-outcome review of Model v1 (Approve with minor suggestions) and Design v1 (Approve with observations), plus cross-artifact coherence note. Key asks: bind "separable coverage" to a recorded ship-or-defer verdict so it never decays into a silent gap; make the parity gate cover the spec-file *set* (not only executed verdicts) to close the partial-discovery false green; surface the `vi.mock`→`postJson`-injection refactor as a visible product-code edit with its own parity check; reconcile the file-count vs call-count figures across the two artifacts.
