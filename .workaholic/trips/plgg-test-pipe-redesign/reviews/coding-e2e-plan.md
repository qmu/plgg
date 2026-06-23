# Planner E2E + Validation Plan — Pipe-Style Redesign (Coding Phase)

Author: Planner (E2E / external-interface QA only)
Status: ready — staged for execution once the concurrent-launch gate clears
Scope: external validation of the redesigned plgg-test CLI from the
outside. No unit tests, no code review. All mutating scenarios run on
temp copies under the scratchpad; the real corpus is never mutated.

Bound to the 9 fixed Plan Amendments (guardrails G1–G9) and the closed
drop-shape set (a–e in G6).

---

## 0. Dev-environment readiness (verified now)

- **Node**: local `v24.13.1` (native strip-types, fs.watch recursive,
  module.register all present — same proven base as the prior trip).
- **plgg-test CLI**: `packages/plgg-test/bin/plgg-test.mjs` present;
  invoked `node bin/plgg-test.mjs src [--watch] [--coverage]`. Confirm
  exact flags from Constructor's committed `args.ts`/`cli.ts` at
  execution time (the authoring layer is being rebuilt; the launcher is
  reused).
- **Rewrite status**: plgg's 74 specs currently import the OLD plgg-test
  (`from "plgg-test"`, fluent) — 74 files, 0 vitest. They are being
  REWRITTEN to the new pipe idiom by Constructor. The file SET (74)
  stays; the assertion EXPRESSION changes.
- **BLOCKERS to clear before execution (flagged up front):**
  1. **plgg-test deps NOT installed** in this worktree
     (`packages/plgg-test/node_modules/plgg` absent). Need `npm install`
     in `packages/plgg-test` (links `plgg`, brings `typescript` for the
     transpile hook) before the CLI runs.
  2. **vitest NOT installed** in `packages/plgg`
     (`node_modules/.bin/vitest` absent). The prior-verdict oracle
     (74/465/0) is the OLD plgg-test's output, NOT vitest — so for the
     parity baseline I do NOT strictly need vitest; I need the OLD
     plgg-test's per-test verdicts. **Plan: capture the prior oracle
     from the previous trip's worktree (`work-20260623-170403`, where
     the fluent plgg-test + its 74/465/0 result live) OR by running the
     OLD plgg-test against the pre-rewrite specs.** I will confirm the
     cleanest source at gate time; the number to beat is 74 files / 465
     pass / 0 fail.
- **Prior verdict oracle baseline**: 74 spec files, 465 passed, 0
  failed (established and externally validated in the prior trip). This
  is the denominator for parity (G8).

---

## 1. Branded-Assertion guard (G1) — the NEW keystone false-green class

The redesign introduces a false-green class the fluent model couldn't
have: a body returning a bare DOMAIN `Result` that the runner mistakes
for a verdict. G1 brands `Assertion` (via plgg's `Box`/`isBox`) so the
runner can tell a verdict from a domain `Result`.

- **1a Bare domain Result body FAILS as "not an assertion":** a temp
  spec `test("x", () => asInt("5"))` (returns a real `Result<Int,_>`,
  NOT a branded Assertion). Expected: the test is reported FAILED with a
  "body did not return an assertion" message — NOT read as pass, NOT
  read as fail-by-value. Verify exit non-zero and the message.
- **1b Bare domain Err body also FAILS as "not an assertion":**
  `test("x", () => asInt("oops"))` (a domain `Err`). Must STILL fail as
  "not an assertion", NOT be misread as a failing verdict (a domain Err
  is not an assertion failure). This is the subtle half of G1 — confirm
  the runner brands, not just checks Ok/Err.
- **1c A real branded Assertion passes/fails correctly:**
  `pipe(2+2, shouldBe(4))` → pass; `pipe(2+2, shouldBe(5))` → fail.
  Confirms the brand doesn't break legitimate verdicts.

## 2. Closed drop-shape set (G6 a–e) — each must FAIL, not pass vacuously

Each is a temp spec; each must be reported FAILED (exit non-zero). This
is the measurable form of direction SC2.

- **(a) void/undefined return while an assertion was computed:**
  body computes `shouldBe(5)(2+2)` as a statement, then returns nothing.
  Expected: FAILED ("did not return an assertion").
- **(b) returns a DIFFERENT passing Result than the one computed:**
  body computes a real (failing) assertion, discards it, returns a
  separate passing `pipe(1, shouldBe(1))`. Expected: FAILED — the guard
  must not let a wrong/substituted verdict through. (NOTE: per
  Constructor's review, (b)'s sync-Err is caught by the body-return
  contract; I verify the OUTCOME — this body must not be green — however
  the mechanism achieves it.)
- **(c) async `Promise<Assertion>` not awaited:** body returns a
  non-awaited promise / drops an async assertion. Expected: FAILED, not
  a vacuous green.
- **(d) `proc`/`all` short-circuits or swallows an inner Err:** an
  `all([...])` / `proc(...)` containing a real Err must surface it as
  FAILED, never swallow. Expected: FAILED.
- **(e) non-Result truthy value returned:** `test("x", () => 42)` or
  `() => "ok"`. Expected: FAILED ("not an assertion").

Pass criterion: all five FAIL. A green on any (a)–(e) is the
existential false green and a hard fail of the redesign.

## 3. `all` aggregation (G3) — aggregate, never short-circuit

- **3a One Err among several → FAILED AND every Err surfaced:** an
  `all([passing, failingA, failingB])` body. Expected: test FAILED and
  the report shows BOTH failingA and failingB messages (not just the
  first). This is the dual of `cast` and part of why the idiom reads
  better — a silent short-circuit here degrades the ergonomics win.
- **3b Async `all` (Promise<Result>-awaiting form):** same, with async
  assertions — both failures surfaced after awaiting all.

## 4. Exit-code contract — agent/CI gate (G1/G5)

| # | Setup | Expected `$?` |
|---|---|---|
| 4a | all assertions pass | 0 |
| 4b | one failing assertion | non-zero |
| 4c | zero spec files discovered | non-zero |
| 4d | any drop-shape (1a/2a–e) | non-zero |
| 4e | a body that THROWS (defect path) | non-zero (caught as Defect→failed) |

## 5. `--watch` (G-reuse; same proven launcher)

- **5a spec edit → fresh re-run** reflecting the change.
- **5b SOURCE edit → fresh re-run** reflecting the NEW value
  (fresh-process; this was the iter-1 fix in the prior trip — re-verify
  it survived the runner fold-seam change).
- **5c rapid multi-write → debounced to ONE run.**
- **5d a failing run does NOT kill the loop.**
Mechanics: background launch + Monitor/poll on a sentinel in the log,
mutate the file, poll for the next run marker, hard timeout per wait.

## 6. `--coverage` four-metric per-package gate (G-reuse)

- **6a** real four-metric numbers (statements/branches/functions/lines)
  printed on the rewritten plgg corpus.
- **6b** gate PASSES at/above the per-package threshold (read from
  `plgg-test.config.json`, 91 for plgg) — exit 0.
- **6c** gate FAILS under threshold on deliberately under-executed code
  — exit non-zero.
- **6d** confirm the `NODE_V8_COVERAGE` child re-exec path still used.
Re-verify because the runner fold-seam changed; coverage must not
regress.

## 7. VERDICT PARITY vs the prior oracle (G8) — on the rewritten corpus

The headline correctness gate. Run the REWRITTEN plgg corpus under the
NEW plgg-test and compare to the prior oracle (74 files / 465 / 0).

- **7a discovered spec-file SET parity:** the rewritten corpus discovers
  the SAME 74 files (the rewrite changes expression, not the file set).
- **7b per-test verdict parity:** every test reaches the SAME pass/fail
  verdict as the prior oracle — 465 pass / 0 fail. Capture per-test
  results from the new runner (via its reporter or a small harness
  reusing its discover+run, as in the prior trip) and compare keys +
  verdicts to the prior baseline (test-id normalized for any naming
  changes). Any divergence is investigated, not waved through.

## 8. MUTATION SPOT-CHECK (G8 / my headline addition) — prove FORCE, not color

Parity (§7) proves SAME conclusions, but a rewrite that quietly WEAKENS
an assertion still shows green and still "matches" all-pass. The
mutation spot-check proves the rewritten assertions actually have force.

**Concrete design:**
- **Slice:** the fixed idiom-spanning slice from G9 (see §9) plus a few
  high-`toBe` specs — a representative ~3–5 rewritten spec files.
- **On a TEMP COPY** of those specs in scratchpad, programmatically
  mutate assertions: for each `shouldBe(X)` / `shouldEqual(X)` /
  `shouldContain(X)`, flip the expected to a guaranteed-wrong value
  (e.g. `shouldBe(n)` → `shouldBe(n + 1)` for numbers; append a junk
  suffix for strings; swap booleans). One mutation per test where
  feasible, applied via a scripted sed/AST-ish transform.
- **Run the mutated copy under the new plgg-test.** Expected: **every
  mutated test now FAILS.** Record the count: N assertions mutated → N
  tests flipped to FAIL.
- **The kill criterion:** any mutated test that STILL PASSES is an
  assertion with no force (a hollowed-out rewrite) — reported as a
  specific FAIL with the spec/line, routed to Constructor. A clean
  result is "all mutations killed."
- This is cheap insurance that the full-spec rewrite preserved the
  assertion's force, not just its green color.

## 9. Ergonomics read (G9) — does it read like plgg?

Judge the idiom on the fixed, idiom-spanning slice (per G9):
- a **high-`toBe`-density** spec (the trivial-check ergonomics — does
  `check(actual, shouldBe(x))` / `pipe(actual, shouldBe(x))` read as
  cleanly as the old fluent form, or is the common case punished?);
- an **async/`proc`** spec (does `proc(asyncActual, shouldBeOk(), …)`
  read naturally?);
- a **Result-narrowing** spec (does the value-carrying
  `cast(x, okContent(), shouldBe(…))` replace `assert(isOk); x.content`
  cleanly, with NO throwing `narrow` present — G2?).
Output: a plain-language judgment per spec — "reads like plgg" / "reads
awkwardly because …" — with the specific clumsy spot if any, so the
ergonomics success bar ("reads naturally as a pipeline AND no false
green") is judged honestly before the full rewrite is locked.

---

## 10. Execution discipline

- All mutating scenarios on temp copies under the scratchpad; the real
  corpus is never edited for a test.
- Watch via background + Monitor polling with hard timeouts; always tear
  down spawned watchers.
- Each scenario records: command, observed `$?`/output excerpt,
  PASS/FAIL.
- Do NOT run anything against Constructor's code until the team lead
  confirms the concurrent-launch gate has cleared.
- Up-front asks: (1) OK to `npm install` in `packages/plgg-test`
  (needed to run the CLI at all)? (2) Preferred source for the prior
  verdict oracle — re-run the OLD fluent plgg-test, or read the prior
  trip's recorded 74/465/0? No dist build is expected for the headline
  plgg parity (plgg specs import plgg's own src); flag if the rewritten
  corpus changes that.

## Prior-verdict ORACLE — captured (2026-06-23)

Per the lead's direction, the oracle is the OLD fluent plgg-test's
PER-TEST verdicts (name SET + outcome), NOT the bare aggregate — so a
rewrite that silently drops/renames/skips a test is caught (an added
test can't mask a dropped one in a count).

- **Source:** the prior trip worktree `work-20260623-170403` at
  `ec9bb22` — exactly the BASE of this branch (`work-20260623-214128`
  was cut from it). It holds the 74 pre-rewrite specs importing the OLD
  fluent plgg-test, deps installed, bin present.
- **Capture method:** a harness reusing the OLD runner's
  `discover` + `runFile`, keyed `relfile :: names.join(" > ")` →
  outcome (same approach validated in the prior trip).
- **Captured baseline:** **74 files / 465 tests / all passed.** Saved
  as the per-test name+verdict set (scratchpad `oracle-verdicts.json`).
  The rewritten corpus must match this test-for-test (same 74-file set,
  same 465 named tests, same all-pass) AFTER the rewrite lands.

## Mutation spot-check slice — FIXED

Rewrite has NOT started yet (0 plgg specs use the new pipe matchers; 68
still fluent — Constructor is building the matcher layer first). So
parity (§7), mutation (§8), and ergonomics (§9) run AFTER the rewrite,
post-gate. The fixed slice (chosen now from the oracle file list so it
is idiom-spanning AND high-signal):

- **High-`toBe` density:** `Disjunctives/JsonReady.spec.ts` (densest,
  ~102 checks) and `Disjunctives/Option.spec.ts` (~70) — trivial-check
  ergonomics + the most mutation targets.
- **Async / `proc`:** `Flowables/proc.spec.ts` — the async body shape.
- **Result/Option narrowing:** `Disjunctives/Result.spec.ts` /
  `Atomics/BigInt.spec.ts` — the value-carrying `shouldBeOk()` /
  `okContent()` narrowing idiom (must show NO throwing `narrow`, G2).

Mutation operators on a TEMP COPY of the slice: `shouldBe(n)` →
`shouldBe(n+1)` for numerics; junk-suffix string literals inside
`shouldBe`/`shouldEqual`; swap `true`/`false`; bump
`shouldHaveLength(n)`→`n+1`. One mutation per test where feasible;
require every mutated test to FLIP to FAIL; any survivor = a force-less
assertion, reported with spec/line. (Exact operators finalized once the
real rewritten matcher names are visible.)

## Install status (both blockers cleared)

- `packages/plgg-test` deps installed (plgg linked, typescript present)
  — CLI can run.
- `packages/plgg` deps installed (plgg-test linked for rewritten specs).
- No vitest, no dist build needed for the headline plgg parity.

## Review Notes

(none yet)
