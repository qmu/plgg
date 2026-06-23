---
instruction: "Create a new package plgg-test — a from-scratch minimal test framework for the plgg monorepo to drop the vitest dependency and avoid Dependabot churn. Traditional describe/it/expect-style API for minimal test migration. Minimum but real implementation. Must include a --watch option (re-run on file change). Coverage support may need to be addressed/corrected. plgg house style (Option/Result, no as/any/ts-ignore). plgg is its own only consumer; breaking changes fine."
phase: coding
step: iteration-1
iteration: 1
updated_at: 2026-06-23T18:40:00+09:00
---

# Trip Plan

## Initial Idea

Create a new package plgg-test — a from-scratch minimal test framework for the plgg monorepo to drop the vitest dependency and avoid Dependabot churn. Traditional describe/it/expect-style API for minimal test migration. Minimum but real implementation. Must include a --watch option (re-run on file change). Coverage support may need to be addressed/corrected. plgg house style (Option/Result, no as/any/ts-ignore). plgg is its own only consumer; breaking changes fine.

## Plan Amendments

### 2026-06-23T17:16 — [Lead] Planning consensus reached; plan fixed for Coding Phase

All three round-1 reviews are **approvals** ("Approve with observations" /
"Approve with minor suggestions") — no "Request revision" — so the Consensus
Gate is met without Steps 3–4 (respond/escalate/moderate). The plan is fixed.
The reviews converged on a small set of build-binding guardrails; the team
must honor these in the Coding Phase (they are accepted, not optional):

1. **Coverage collection process (resolves the one technical fork).** The
   Constructor design (`NODE_V8_COVERAGE`) and the Architect review
   (in-process `node:inspector`) conflicted. **Decision: `NODE_V8_COVERAGE`
   with an explicit self-re-exec.** When `--coverage` is passed and the env
   var is unset, the CLI re-execs itself as a child with
   `NODE_V8_COVERAGE=<tmpdir>` **plus** the `--experimental-strip-types
   --import <register>` flags, runs the suite in-process in that child, then a
   parent post-pass reads/folds the dumped V8 JSON and applies the gate.
   `node:inspector` `Session` is the documented in-process fallback only if
   re-exec proves problematic. The collected-from process MUST be named in
   the code/comments (closes the Architect boundary ambiguity).
2. **Migration is two-tier (SC1).** A checked-in **codemod/script** rewrites
   the import source `"vitest"` → `"plgg-test"` across all spec files (no hand
   edits), **plus** an enumerated short list of hand-touched specs — exactly
   one today: `plgg-kit/.../generateObject.spec.ts` (`vi.mock`). Resolve that
   seam by **dependency injection** (inject `postJson`, default real) and
   delete the `vi.mock`; do NOT build an ESM module-mock engine in v1 (named
   follow-up only). Decide/apply this before building the runner so it can't
   bleed scope.
3. **Parity gate covers the spec-file SET, on the REAL corpus.** Before
   removing vitest, run both runners and require (a) the same set of
   discovered spec files (closes the partial-discovery false green) and (b)
   identical per-test pass/fail verdicts, exercised against the real
   `Datum`/`Dict`/Result/Option shapes (not synthetic cases).
4. **`toEqual` deep-equal and the resolver hook are gated checks, not
   hopeful bullets.** Add `toEqual` (the #1 false-green vector, 348 calls) to
   the plain-`throw` meta-harness's explicit primitive checks. Elevate the
   `module.register` resolver to its own acceptance fixture exercising all
   three specifier shapes (self-`/index`, self-`/deep/path`, cross-package
   bare `"plgg"`) that must import+run before any migration.
5. **The assertion boundary throws — by design.** `expect`/`assert` throw
   `AssertionError` (the framework contract and the precondition for `assert`'s
   `asserts cond` narrowing). Option/Result/`match` govern internal runner
   orchestration only — do NOT "Result-ify" the matchers. State this in code.
6. **Coverage is a per-package ship-or-defer verdict.** Existing config is
   uneven (`plgg` gates at 91; `plgg-kit` has `all: true` with no thresholds).
   The definition of done records, per migrated package, whether the >90% gate
   ([[feedback_coverage_threshold]]) is enforced — accurate number or an
   explicit named deferral, never an ambiguous silent gap.
7. **Housekeeping.** Reconcile the file-count vs call-count figures before any
   number is carried downstream (e.g. `assert` 64 files / 448 calls; `test`
   125 files / 744 calls). Confirm exact policy slugs against the
   `implementation`/`operation` skill indexes during the build.

Exit-code contract (0 only on all-pass; non-zero on any failure or zero
expected tests) and the command-scripts-compliant integration (extend the
canonical per-package runner family; change only what npm scripts invoke) are
adopted as-is from the design.

### 2026-06-23T18:40 — [Lead] Coding review passed; Iteration 1 fix list

Both Coding-Phase reviews are **approvals** (Architect: "Approve with
observations", `a4209e5`; Planner E2E: headline **PASS**, `32ce653`). The
implementation is trustworthy: **perfect test-for-test parity with vitest on
plgg's real corpus — 74 files == 74, 465/465 verdicts, 0 divergence**; exit-code
contract holds (both false-green guards); `--watch` works; `NODE_V8_COVERAGE`
child re-exec confirmed; THE MOST IMPORTANT RULE holds (no `as`/`any`/`ts-ignore`);
dependency boundary intact (only runtime dep is `plgg`; `typescript` is a
pre-existing devDep used for transpile only). Neither reviewer requested a
revision, so this is a normal Iteration-1 polish, not a rollback.

Iteration-1 fixes routed to Constructor (Architect re-reviews + Planner
re-tests after):

1. **Coverage scope — RESTORE four-metric parity (headline; the user's
   explicit "coverage needs to be corrected").** The gate hardcodes
   `THRESHOLD=90` and computes **lines only**; the vitest config it replaces
   gated **statements/branches/functions/lines each at 91**, and design §1.8
   promised all four via V8 ranges. **Decision: close the gap, don't defer.**
   Compute all four metrics from the V8 ranges already collected, make the
   threshold **per-package-config-aware** (read each package's own number —
   plgg 91, plgg-http 90, the three ungated packages none — not a hardcoded 90),
   and fix the V8 edge case where a never-CALLED top-level function scores as
   line-covered (use function-coverage data). If any single metric genuinely
   can't reach parity in this iteration, record an explicit per-package
   ship-or-defer verdict (Amendment 6) — never a silent narrowing.
2. **Watch stale module cache on source edits (watch is first-class, SC4).**
   In-process re-runs reuse Node's ESM module cache, so a changed *source* file
   re-runs but reports STALE results (spec edits are fine). Fix it — preferred:
   re-exec a fresh child per watch run (mirrors the coverage re-exec pattern,
   gets a clean module graph). If a fresh-process-per-run is rejected, bust the
   cache via import cache-busting; at minimum it must reflect source edits.
3. **O2 — unhandled-rejection window.** `Runner.ts` guard only catches the
   awaited `fn()`; a fire-and-forget rejection after the body escapes. Either
   install a per-test `unhandledRejection` window to honor the comment, or
   soften the comment to the actual await-only guarantee.
4. **O3 — deep-equal cycle caveat.** `equals.ts` has no cycle guard (fine for
   the acyclic corpus). Add a one-line header caveat.

Parallel: Planner runs the **plgg-kit cross-package smoke** (with the
`scripts/build.sh` dist build) to validate cross-package bare `"plgg"` resolution
and the `vi.mock`→`postJson`-injection conversion (Amendment 2), the one item
not yet exercised. Full-corpus migration of the remaining 58 spec files and the
final vitest/`@vitest/coverage-v8` devDep removal (SC6) remain the last
migration step after parity is proven package-by-package.

## Progress

- [x] [Planner] Drafted `directions/direction-v1.md` — business vision for the plgg-test from-scratch test framework (value proposition, personas, business risks with mitigations, "minimum but real" definition, success criteria).
- [x] [Architect] Drafted `models/model-v1.md` — structural model grounded in the current vitest setup: business-need→component coherence map, domain model (Suite/Test/Hook/Expect/Matcher/Runner/Discovery/Reporter/Watcher/Coverage/TestDouble), translation-fidelity analysis (closed matcher set from the 132-file corpus; import-source rewrite; the single `vi.mock` outlier; `toEqual` as the false-green vector), dependency boundary (`plgg` + Node built-ins only; Node native strip-types over tsx), and ranked structural risks (in-house V8 coverage, alias resolution, deep-equality fidelity, module mocking, watch reliability).
- [x] [Constructor] Drafted `designs/design-v1.md` — buildable technical plan: enumerated API surface (test/it/describe + skip, 13 expect matchers with exact corpus counts + .not/.resolves, asserts-cond `assert` used 448×, scoped `vi`) from the real specs; native-Node TS execution via `--experimental-strip-types` + a `module.register` resolver hook for the `plgg/index` alias (no tsx/bundler — verified locally); `fs.watch`+debounce watch; zero-dep V8 coverage via `NODE_V8_COVERAGE` with the >90% gate; bootstrapping via a meta-harness + both-runners parity gate; command-scripts-compliant integration; Policies section (directory-structure, coding-standards, testing, command-scripts, CI, dependencies).
- [x] [Planner] Submitted `reviews/round-1-planner.md` — business-outcome review of Model v1 (Approve with minor suggestions) and Design v1 (Approve with observations), plus cross-artifact coherence note. Key asks: bind "separable coverage" to a recorded ship-or-defer verdict so it never decays into a silent gap; make the parity gate cover the spec-file *set* (not only executed verdicts) to close the partial-discovery false green; surface the `vi.mock`→`postJson`-injection refactor as a visible product-code edit with its own parity check; reconcile the file-count vs call-count figures across the two artifacts.
- [x] [Architect] Submitted `reviews/round-1-architect.md` — translation-fidelity/boundary review of direction-v1 (Approve with minor suggestions — tighten SC1 to a scripted import-source codemod + an enumerated list of hand-touched specs; make SC6 dependency-reduction measurable) and design-v1 (Approve with observations). Primary concern: the coverage path is a boundary ambiguity — the in-process runner (§1.6) vs the process-level `NODE_V8_COVERAGE` sink (§1.8) are unreconciled; name the collection process (recommend in-process `node:inspector` Session over re-exec-with-env). Also: elevate the `module.register` resolver hook and `toEqual` deep-equal to gated acceptance checks (the two top fidelity seams after parity). Coherence: TS-exec, watch, mocking, command-scripts all hold; coverage process-model is the single item to name before the gate.
- [x] [Constructor] Submitted `reviews/round-1-constructor.md` — buildability/quality review of direction-v1 (Approve with minor suggestions — split SC1 into a checked-in import codemod across 132 files + the single `vi.mock` exception; tie SC5 honest-coverage to the pre-existing per-package threshold unevenness, plgg gates at 91 / plgg-kit has none) and model-v1 (Approve with observations — make the throwing `expect`/`assert` boundary explicit so "no escape hatches / Result not throw" isn't misread into Result-returning matchers that break `asserts cond`; prefer `NODE_V8_COVERAGE` out-of-process dump over in-process `node:inspector` to lower the model's #1 risk). Coherence: direction+model consistent; parity gate must run both runners on the REAL corpus to exercise `toEqual` shapes; decide `vi.mock` refactor-vs-loader before building the runner so it can't bleed scope. NOTE: my coverage recommendation (`NODE_V8_COVERAGE`) and the Architect's (in-process `node:inspector` Session) conflict — to reconcile in Step 3.
- [x] [Planner] (Coding/concurrent-launch) Prepared `reviews/planner-e2e-plan.md` — E2E + parity scenario plan staged for execution once the gate clears. Verified dev env (Node v24.13.1 local / CI 22.x; strip-types/fs.watch/module.register all present; plgg-test not yet built; **vitest node_modules not installed in worktree — `npm install` in packages/plgg required before the parity baseline**; plgg corpus = 74 spec files). Scenarios mapped to the 7 amendments: exit-code contract incl. zero-tests→non-zero and async-rejection guard; `--watch` re-run on spec+source edit with debounce; `--coverage` real number + gate-fails-under-threshold + named `NODE_V8_COVERAGE` re-exec + per-package ship-or-defer honesty; the headline parity gate over the spec-file SET AND per-test verdicts on the REAL `Datum`/`Dict`/Result/Option corpus, plus the resolver-hook three-specifier fixture and the `vi.mock`→`postJson`-injection edit-surface check.
- [x] [Constructor] Implemented `packages/plgg-test` (Coding Phase, concurrent-launch). Full minimal runner: registry (describe/it/test+skip, beforeEach/afterEach), async-aware runner (awaits bodies; rejected promises fail — false-negative guard), 13 enumerated matchers + `.not`/`.resolves`/`.rejects` + `equal` + `expect.stringContaining` (asymmetric) + `toHaveBeenCalled*`, `assert` (asserts-cond) + `assert.fail`, `vi` (fn/spyOn/mockImplementation/stubGlobal/stubEnv/unstub*), fs-walk discovery, reporter + exit-code contract, `module.register` resolver + a `ts.transpileModule` load hook (typescript is already a devDep — proper import elision, no native-strip-types limitation, no new third-party dep), `fs.watch`+100ms-debounce watch (cache-busted re-runs), and source-map-remapped V8 coverage via `NODE_V8_COVERAGE` self-re-exec with the >90% gate. Bootstrapped by a plain-`throw` meta-harness (proves failing-expect-throws, async-reject-caught, exit-code, `toEqual` on real plgg shapes) + a resolver acceptance fixture (self `/index`, self deep path, cross-package bare `plgg`). Migrated `plgg` via a checked-in codemod (import-source rewrite, 74/74 files) + 1 enumerated hand-edit (postJson.spec callback annotation; no `vi.mock` in plgg). PARITY GATE GREEN: vitest baseline vs plgg-test = identical 74-file set + 465 passed / 0 failed both runners. plgg `--coverage` = 99.10% (gate passed); negative test confirms the gate fails on under-coverage. plgg-test self: 68 tests green, 90.63% self-coverage. Cross-package `assert` narrowing (TS6 limitation on named `.d.ts` assertion imports) solved with an AMBIENT `types/index.d.ts`. Command-scripts policy: added test/tsc/watch/coverage `-plgg-test.sh` from the canonical template + wired check-all/npm-install; switched plgg's npm scripts to `plgg-test`. NOT done (next iteration): migrate the other 8 packages, the plgg-kit `vi.mock`→`postJson`-DI refactor, drop vitest. DEVIATIONS: (1) execution uses `ts.transpileModule` not native `--experimental-strip-types` — required because plgg source mixes type+value imports (not verbatimModuleSyntax-clean) which native stripping cannot elide; typescript is an existing dep so the zero-new-dep boundary holds. (2) coverage line%≈vitest but not byte-identical (V8 block ranges vs vitest statement AST) — the >90% gate is the contract, exact numeric parity is best-effort (design §1.8). (3) cross-package assert needed an ambient `.d.ts` (TS6 named-import assertion limitation).
- [x] [Constructor] Iteration-1 polish (all 4 items, verified green). (1) COVERAGE four-metric parity RESTORED: `Coverage/v8.ts` now computes statements/branches/functions/lines from the V8 ranges (functions = outer-range count>0, which also FIXES the edge case where a never-called top-level function scored as line-covered — plgg Functions now 97.56%, not a false 100%); branches = block sub-ranges count>0; the gate requires ALL four strictly greater. Threshold is PER-PACKAGE via a new `plgg-test.config.json` (`Coverage/config.ts`, Option-typed threshold): plgg=91 (passes: S 99.10 / B 91.86 / F 97.56 / L 99.10), a missing/threshold-less config = UNGATED (the three formerly-ungated packages). (2) WATCH now re-execs a FRESH child process per change (moved orchestration to the bin launcher; removed `src/Watch/watch.ts` + the in-CLI watch) — SOURCE edits now reflect (verified: breaking a source file flips a watch re-run 465/0 → 445/20). (3) O2 unhandled-rejection WINDOW: per-test `unhandledRejection` capture via a window STACK (innermost test claims the event, so nested self-test runs attribute correctly) — a fire-and-forget rejection now fails its test (fixture + spec added). (4) O3: deep-equal acyclic caveat added to `equals.ts` header. Per-package ship-or-defer (Amendment 6): plgg-test's OWN branch metric (~88%) is gated at 85 with a documented rationale in its config (defensive ??/catch arms; V8 block-branch is finer than istanbul) — explicit verdict, NOT a silent narrowing of production packages. Re-verified: tsc-plgg-test + tsc-plgg clean, no escape hatches; plgg-test self 91 tests green; plgg parity still 74 files / 465 passed / 0 failed; `--coverage` reports+gates four metrics at the per-package number; `--watch` reflects source edits.
