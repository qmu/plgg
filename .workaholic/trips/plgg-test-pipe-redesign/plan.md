---
instruction: "Redesign plgg-test FROM THE DESIGN PHASE so its public authoring/assertion API embodies plgg's pipe-style data-last functional composition (pipe/cast/proc/flow, Option/Result, exhaustive match) — NOT the fluent expect(x).toBe(y) method-chain of the first attempt. Assertions should be composable data-last functions returning Result, piped, not a stateful chainable object that throws. Idiomatic composition is prioritized OVER drop-in vitest migration. Keep a real minimal runner with --watch and four-metric coverage; the existing plgg-test plumbing (runner/discovery/reporter/resolver/coverage/watch) is prior art to reuse/refactor. House style mandatory; breaking changes fine."
phase: complete
step: done
iteration: 1
updated_at: 2026-06-24T09:00:00+09:00
---

# Trip Plan

## Initial Idea

Redesign plgg-test FROM THE DESIGN PHASE so its public authoring/assertion API embodies plgg's pipe-style data-last functional composition (pipe/cast/proc/flow, Option/Result, exhaustive match) — NOT the fluent expect(x).toBe(y) method-chain of the first attempt. Assertions should be composable data-last functions returning Result, piped, not a stateful chainable object that throws. Idiomatic composition is prioritized OVER drop-in vitest migration. Keep a real minimal runner with --watch and four-metric coverage; the existing plgg-test plumbing (runner/discovery/reporter/resolver/coverage/watch) is prior art to reuse/refactor. House style mandatory; breaking changes fine.

## Plan Amendments

### 2026-06-24T09:00 — [Lead] Trip complete (complete/done), verified

The pipe-style redesign is **complete and lead-verified** at `db6b2b1`. The
plgg-test package embodies plgg's idiom: an assertion is a branded `Result`
(`Assertion = Result<Pass, Fail>`, `Box`-tagged), matchers are data-last
(`pipe(actual, toBe(expected))` / `check(actual, ...matchers)`), `all`
aggregates every failure, narrowing is data-flow via value-carrying matchers
(`shouldBeOk`/`okThen`), and `proc` carries async — no fluent chain, no
throw-on-mismatch.

Two consumer-side blockers were found AFTER the package was built (the package
itself was always type-clean) and fixed by Constructor:
1. **plgg-test resolved to `any` from plgg.** plgg-test is ESM (`type:module`),
   so under `module:NodeNext` plgg could not resolve plgg-test's *extensionless*
   dist `.d.ts` re-exports → every import degraded to `any` (the old fluent API
   hid this; the pipe API's lambdas exposed it as 187 implicit-any). Fixed by
   converting plgg-test's 29 internal source imports from the `plgg-test/*`
   tsconfig-path alias to relative NodeNext-style `./X/Y.js` imports, so
   vite-plugin-dts emits ESM-resolvable re-exports; the runtime loader hook
   (`Resolve/hook.ts`) gained a relative-`.js`→`.ts` redirect so the CLI still
   runs from source.
2. **Matcher over-constraint.** `toBe`/`toEqual` made the *actual* generic on
   application (`(expected) => (actual) => Assertion`) so a wider actual than the
   expected literal no longer conflicts (cleared 233 errors); `errThen` made
   `<E = InvalidError>` (default applies for bare lambdas once types resolve,
   matcher-first infers other error channels). A handful of spec-level fixes
   (export `deepEqual`, an `isRequestInit` guard, `atProp` for `Datum` access —
   which even removed a pre-existing `restored as any`).

**Verified (lead):** `tsc-plgg-test` 0 errors; `tsc-plgg` 0 errors; **no `as`/
`any`/`ts-ignore` added** (`git diff 5852ed8..db6b2b1`); `npx plgg-test src` →
**465 passed / 0 failed / 74 files**, exact parity with the captured oracle;
mutation spot-check (flip 3 expectations) → 461 passed / 4 failed with the
mutated messages, proving the rewrites have force. Ready to ship.

### 2026-06-23T22:00 — [Lead] Planning consensus; plan fixed for Coding Phase

All three round-1 reviews are approvals (Planner `2f5bfcf`, Architect `d620b3d`,
Constructor `f32fbc5`) — no "Request revision" — so the Consensus Gate is met.
The pipe-style design is sound: assertions ARE plgg pipelines
(`pipe(actual, toBe(expected))`), built on plgg's own `Result`/`refine`/`cast`/
`tryCatch`/`matchResult`. The reviews converged on a precise set of
build-binding guardrails (accepted, not optional):

1. **`Assertion` is a BRANDED `Result` (the keystone).** A plain `Result` is
   NOT sufficient: the runner must distinguish a verdict from a domain `Result`
   a body legitimately returns, or the anti-false-green guard is unbuildable AND
   a new false-green class appears (a body that returns `asInt("x")` would be
   read as a verdict). Brand it with plgg's own `Box` tag (still plgg
   vocabulary, still a composable `Result`), and detect it via `isBox`/a guard —
   **no `as` cast**. The runner's guard: the body's resolved value must be a
   branded `Assertion`; a bare domain `Result`, `void`, or any non-Assertion
   fails the test as "body did not return an assertion."
2. **Narrowing = value-carrying matchers ONLY; DROP the throwing `narrow`.**
   `shouldBeOk`/`shouldBeErr`/`shouldBeSome`/`shouldBeNone` (and `okContent`)
   return the unwrapped inner value inside `Pass`, so narrowing is **data-flow**
   (`cast(x, okContent(), shouldBe(...))`), not control-flow. No `asserts cond`,
   no sanctioned throw — this deletes the whole ambient-`.d.ts` fragility class
   from the first trip. A throwing primitive is a named follow-up ONLY if a real
   corpus site proves it's needed.
3. **`all` aggregates, never short-circuits** (the inverse of `cast`): it runs
   every assertion and folds EVERY `Err`, reusing plgg's existing
   `InvalidError`/`Box` sibling-accumulation (no bespoke aggregate DSL). It is a
   gated meta-harness primitive: "one Err among many → reports failed AND
   surfaces every Err" (sync and the `Promise<Result>`-awaiting async form).
4. **`Fail` fields pre-formatted to strings at the matcher boundary** (reuse
   `format.ts`): `Fail = Readonly<{matcher; expected; actual; message: string}>`.
   So `Assertion` is non-generic in the actual type at composition boundaries and
   `all(ReadonlyArray<Assertion>)` type-checks with no `as`/`any`. `Pass<T>`
   keeps the precise value type on the single-matcher (`pipe`/`cast`) path.
5. **Async fold handles `AssertionError | Defect`.** A `proc` body yields
   `Result<unknown, AssertionError | Defect>`; the runner fold maps BOTH error
   arms to failed (a caught throw surfaces as `Defect`). Correct the design's
   "error channel fixed to Error" note.
6. **Anti-false-green is proven against a CLOSED drop-shape set** (meta-harness,
   plain-throw, must each prove-fails): (a) body returns void/undefined while an
   assertion was computed; (b) body returns a different (passing) Result than the
   one computed; (c) async `Promise<Assertion>` not awaited; (d) `proc`/`all`
   short-circuits or swallows an inner `Err`; (e) body returns a non-Result
   truthy value. Make this the measurable form of the direction's SC2.
7. **Single returned expression is THE idiom; combinators are the only
   multi-assert path.** `check(actual, ...matchers) = all(ms.map(m => m(actual)))`
   is the documented default terse entry (one call for the common single check,
   on par with the old fluent form, strictly more composable); bare
   `pipe(actual, matcher)` when a matcher's `Pass` value feeds a further step.
   Avoid statement-sequence bodies that drop assertions; if any `pass()` sentinel
   exists, make it conspicuous (require a reason).
8. **Verdict-parity is necessary but not sufficient — add a mutation
   spot-check.** Parity vs the OLD plgg-test on plgg's corpus (74/465/0) proves
   same conclusions, but a rewrite that quietly WEAKENS an assertion still shows
   green. On a representative slice, flip expected values and confirm those tests
   now FAIL — proving the rewritten assertions' FORCE, not just their color.
9. **Ergonomic judgment on a fixed, idiom-spanning slice** (a high-`toBe`-density
   spec + an async/`proc` spec + a Result-narrowing spec), rewritten early before
   committing to the full rewrite, to validate "reads like plgg" honestly.

Reuse, unchanged: Discovery, Reporter, `Resolve/hook.ts` (module.register +
ts.transpileModule), `Coverage/*` (four-metric per-package), bin-launcher
watch/coverage re-exec, `Cli/args.ts`, `equals.ts`, `format.ts`, Registry tree
mechanics. The ONE substantive plumbing change is the Runner fold-seam
(catch-throw → collect-returned-branded-Assertion, with the throw-capture kept
as the defect safety net). Dependency boundary unchanged: runtime dep = `plgg`
only; `typescript` devDep for the load hook.

## Progress

- [x] [Planner] Drafted `directions/direction-v1.md` — business vision for the pipe-style plgg-test redesign: the test suite is the most-read teaching surface, so a fluent OOP-style chain is corrosive in an Option/Result data-last codebase; assertions become composable data-last functions returning Result. Owns the explicit trade-off (idiom OVER drop-in vitest compat; every spec gets rewritten, not re-imported) and why it's worth paying. Personas, risks-with-mitigations (the Result-can-be-silently-dropped false green is the existential one; success = reads naturally as a pipeline AND no false green), and verifiable success criteria. Reuse the proven runner/discovery/reporter/resolver/watch/coverage plumbing.
- [x] [Architect] Drafted `models/model-v1.md` — structural model grounded in plgg's combinators (pipe/cast/proc/match, Result/Option folds, all read in `packages/plgg/src/Flowables` + `Disjunctives`) and the prior-art plgg-test plumbing. Proposes: `Assertion = Result<Pass,Fail>` (plgg's own Result, not a bespoke type); matcher = data-last `(expected)=>(actual)=>Assertion` composed under `pipe`; negation/multi/async as combinators (`not`, `all` mirroring `cast`'s sibling accumulation, async via `proc`) not `.not`/`.resolves` chain segments; `test(name, body)` where the body RETURNS the assertion the runner folds. Throw-vs-return decision: assertions RETURN Result (verdict from the returned value); throw is the Defect/misuse path only, mirroring proc. Reuse Runner(refactor the catch-throw seam)/Registry/Reporter/Discovery/Coverage/Resolver/Watch unchanged. Top risks: silent-dropped Result (existential — close via non-void body type + Runner fail-on-void guard), `assert` narrowing survival (prefer value-carrying matchers over an `asserts cond` throw), async fold correctness, ergonomic regression on the trivial single-`toBe` (a `check` sugar lever), deep-equal fidelity.
- [x] [Constructor] Drafted `designs/design-v1.md` — buildable pipe-style technical plan. Decision: matchers are `refine`-shaped data-last functions `(actual) => Result<actual, AssertionError>`; a test body RETURNS its assertion `Result` and the runner COLLECTS it (return-is-the-verdict), so a `Result` can't be silently dropped. Assertions compose via `pipe`/`cast` (short-circuit) and `all([...])` (aggregate every failure); negation is a `not` matcher-combinator; async via `proc`; throwing code via `tryCatch`→`shouldBeErr`. The old `assert`-narrowing is split: value matchers return Result; a rare `narrow` (asserts-cond, throws) handles type-narrowing, and `shouldBeOk()`/`shouldBeErr()` assert-AND-unwrap so `assert(isOk(r)); r.content` becomes one pipeline. THROW-vs-RESULT resolved: matchers RETURN Result (house rule); the runner keeps throw-capture as a belt-and-suspenders safety net AND treats a body that returns a non-Result as a failure (kills the dropped-Result false green). REUSE: runner tree/registry, discovery, reporter, resolver hook, four-metric coverage, watch, bin launcher, deep-equal, formatter — all style-agnostic; only the authoring/assertion layer + the runner's body contract change. Migration: specs rewritten (codemod best-effort, gated by verdict-parity vs the OLD plgg-test, not by the codemod). Top risk: dropped-Result false green — mitigated by return-is-verdict + non-Result-return-fails + meta-harness mishandling proofs. Policies: directory-structure, coding-standards, testing, command-scripts, operation/CI, dependencies.
- [x] [Planner] Submitted `reviews/round-1-planner.md` — business-outcome review of Model v1 (Approve with minor suggestions) and Design v1 (Approve with observations), plus cross-artifact coherence. Central finding (shared blind spot in both): the anti-false-green guard as described stops the naive dropped-Result (void/non-Result return) but NOT its sharper variants — a returned passing assertion built from the WRONG actual, a real assertion computed-then-dropped before a different passing return, and the `pass()`/`ok()` sentinel escape. Proposals: make "every computed assertion reaches the verdict" structural (single returned expression as the idiom; combinators `all`/`cast`/`check` as the only multi-assert path; make `pass()` rare/conspicuous with a required reason); add a mutation spot-check to the verdict-parity oracle (flip expected values on a slice, confirm those tests now FAIL) so parity proves the assertion's FORCE, not just its green color; and position value-carrying matchers as THE narrowing idiom with `narrow`-throw as a rare labeled escape so contributors see one clean idiom.
- [x] [Architect] Submitted `reviews/round-1-architect.md` — translation-fidelity/boundary review of direction-v1 (Approve with observations: enumerate the closed set of `Result`-drop-shapes SC2 must each prove-fails — void/wrong-Result/un-awaited-Promise/short-circuited-inner-Err/non-Result-truthy; name a fixed idiom-spanning ergonomic slice) and design-v1 (Approve with observations). Design faithfully realizes and improves the model (matchers are `refine`-shaped; throwing code uses `tryCatch` not a `toThrow` engine; actual flows through on success). Primary concern: the narrowing FORK — design shows both a throwing `narrow` (`asserts cond`) and value-carrying `shouldBeOk()` matchers; make value-carrying matchers the SOLE mechanism and drop the throwing `narrow` from v1 (it reintroduces the escape hatch the redesign exists to remove). Also: gate `all`'s aggregate-don't-short-circuit semantics (the dual of `cast`) as a meta-harness check; correct §0's `proc` "error channel fixed to Error" — it is `E | Defect`, so the async fold must map both `AssertionError` and `Defect` arms to failed. Coherence: building Assertion on plgg's `Result` DEEPENS the boundary (refine/tryCatch/cast/matchResult re-verified against source with cited shapes); reused plumbing genuinely unchanged; runner fold-seam preserves the defect-path-vs-assertion-path distinction. NOTE: my narrowing concern converges with Planner's "value-carrying matchers as THE narrowing idiom" — strong cross-review agreement to make that canonical.
- [x] [Constructor] One-turn review `reviews/round-1-constructor.md` — direction: Approve with observations (SC2's "un-awaited Result never reads green" isn't free; enumerate the 3 mishandling classes the meta-harness must each fail, and note case (b) dropped-sync-Err is caught by the body-return contract, not by await-tracking). model: Approve with minor suggestions. BIGGEST concern: a plain plgg `Result` is NOT a sufficient `Assertion` — the runner can't distinguish a verdict from a returned DOMAIN `Result` (very common: `test(()=>asInt("x"))`), so the model's own anti-false-green guard (§5.1 "fail any body that returns a non-Assertion") is unbuildable without a BRAND. Fix: `Assertion` = a `Box`-branded Result the runner checks via `isBox` (no `as`) — still plgg vocabulary, still composable, runtime-distinguishable. Also: pin `Fail` to all-string fields (pre-formatted via prior-art `format.ts`) so `all([Assertion<number>,Assertion<string>])` and the heterogeneous Fail don't force an `as`/`any`; drop the throwing `narrow` fallback entirely (value-carrying matchers `okContent()` cover every prior narrowing site — deletes the TS6 ambient-`.d.ts` fragility class); confirmed `check(actual, ...matchers)=all(ms.map(m=>m(actual)))` is buildable and keeps the common case one call. Coherence: the brand is exactly where model's "zero new vocabulary" and direction's "no false green" collide — and resolves both; `all`'s sibling accumulation should reuse `cast`/InvalidError's existing mechanism, not a bespoke aggregate (scope guardrail).
- [x] [Planner] (Coding/concurrent-launch) Prepared `reviews/coding-e2e-plan.md` — E2E + validation plan staged for execution once the gate clears, mapped to the 9 guardrails + closed drop-shape set (a–e). Scenarios: branded-Assertion guard (bare domain Result body — incl. a domain Err — must FAIL as "not an assertion", the new false-green class); each of drop-shapes a–e must FAIL not pass vacuously; `all` aggregates every Err (sync+async); exit-code contract incl. zero-tests + defect-throw; `--watch` incl. source-edit freshness re-verify; `--coverage` four-metric per-package gate re-verify (runner fold-seam changed); verdict parity vs the prior oracle (74/465/0) on the REWRITTEN corpus over file-set + per-test verdicts; the headline MUTATION SPOT-CHECK (flip expected values on a temp copy of a representative slice, require every mutated test to FAIL — proving FORCE not color, killed-mutant count reported); ergonomics read on the fixed idiom-spanning slice (high-`toBe` + async/`proc` + Result-narrowing, no throwing `narrow` present). Flagged blockers up front: plgg-test deps + vitest not installed; prior oracle is the OLD plgg-test's verdicts (not vitest); no dist build expected for headline plgg parity.
- [x] [Architect] (Coding/concurrent-launch) Prepared `reviews/coding-review-checklist.md` — read-only analytical-review criteria grounded in re-verified plgg source + the 9 guardrails. Keystone check (highest scrutiny): since `Ok`/`Err` ARE `Box`es, `isBox(anyResult)` is already true, so the runner's Assertion-guard must check a DISTINCT brand tag (`isBox(v) && v.__tag === "<assertionTag>"`, no `as`), not `isBox` alone — else `test(()=>asInt("x"))` (a domain Result) is mis-read as a verdict (the new false-green class). Also pins: value-carrying matchers as the SOLE narrowing path with the throwing `narrow`/ambient-`.d.ts` GONE (grep `asserts `); `all` aggregates every Err reusing `cast`/`InvalidError` sibling accumulation, never short-circuits (sync+async); `Fail` all-string fields (via `format.ts`) so heterogeneous `all([...])` needs no `as`/`any`; runner fold maps both `AssertionError` AND `Defect` to failed with throw-capture kept as the defect safety net; closed drop-shape set a–e each prove-fails in the plain-throw meta-harness; reused plumbing genuinely unchanged + runtime dep plgg-only. Reject-on-sight list: any `as`/`any`/`ts-ignore`, an `isBox`-alone guard, a short-circuiting `all`, a surviving `asserts cond`, an async fold that lets `Defect` pass, a coverage four-metric regression.
