# Direction v1

Author: Planner
Status: draft
Reviewed-by: none yet

## Content

### 0. What changed since the first plgg-test

The first plgg-test succeeded on its own terms: it dropped vitest,
proved test-for-test parity, shipped `--watch` and four-metric
coverage, and never produced a false green. But it optimized for one
goal — **drop-in vitest migration** — and that goal silently dictated
its public face: the fluent, stateful `expect(x).toBe(y)` method
chain. The user has now rejected that face. plgg is, end to end, a
**pipe-style, data-last, functional** library; a test framework that
makes contributors write OOP-style fluent chains is foreign in the one
place they read and write most. This trip is a redesign from the
design phase: keep the proven plumbing, replace the authoring/assertion
surface so it reads the plgg way.

### 1. Value Proposition

The test suite is the most-read, most-written code in the repo —
every contributor and every AI agent touches specs constantly. That
makes the assertion API not just a utility but a **teaching surface**:
whatever idiom it uses, it trains. A fluent, throw-on-mismatch,
stateful chain sitting at the center of an Option/Result, data-last,
exhaustively-matched codebase is corrosive precisely because of its
prominence — it quietly tells every reader that "the plgg way" has an
exception, and the exception is the thing they see most.

The proposition of this redesign: make assertions **composable,
data-last functions you pipe a value through, returning `Result`** —
the same shape as every other plgg operation. The payoff is coherence,
not novelty:

- **The suite reinforces the idiom instead of undermining it.** A
  contributor reading specs sees pipelines, `Result`, and composition
  — the same vocabulary they use everywhere else. The test file
  becomes a worked example of the plgg way, not a counter-example.
- **One mental model, not two.** Today a contributor context-switches
  between "pipe everything, return Result, never throw" in product
  code and "build a chain, it throws" in tests. Collapsing that to a
  single model lowers cognitive load and removes a category of "which
  world am I in" mistakes.
- **Assertions compose like everything else.** Because an assertion is
  just a data-last function over a value yielding `Result`, it can sit
  in the same pipelines, be combined, reused, and reasoned about with
  the tools the team already has — rather than being a special object
  with its own rules.
- **Identity, fully realized.** The first attempt made plgg "build its
  own runner." This makes plgg "test itself *in its own idiom*" — the
  honest completion of the from-scratch, house-style identity.

This is worth more than vitest-API familiarity. Familiarity is a
one-time onboarding convenience; idiom coherence is a daily,
compounding benefit paid to everyone who reads the suite forever.

### 2. The explicit trade-off we are choosing to own

The first attempt prioritized **drop-in migration**, and that choice
*forced* the fluent API — you cannot be drop-in compatible with
vitest's `expect().toBe()` without reproducing its fluent, stateful,
throwing shape. The two goals are in direct tension.

**This trip reverses the priority: pipe-style idiom OVER drop-in
migration compatibility.** Vitest-API compatibility is **no longer a
hard requirement.** We are explicitly trading it away.

The honest cost: **every spec gets rewritten, not merely re-imported.**
The first migration was "change the import source." This one is a
genuine authoring change — each assertion is re-expressed as a piped,
`Result`-returning composition. That is real, repo-wide effort on a
correctness-sensitive surface, and we should not pretend otherwise.

Why it is worth paying:
- The rewrite is **one-time**; the idiom benefit is **permanent and
  compounding** (Section 1).
- plgg is its own only consumer, so the rewrite is bounded by one
  codebase under our control — no external users are stranded by the
  break. Breaking changes are explicitly acceptable here.
- The suite already passed test-for-test parity once, so we know the
  *intended verdicts*; the rewrite changes how assertions are
  *expressed*, not what they must *conclude*. That gives us a precise
  oracle for getting the rewrite right (Section 5).
- A half-measure (a pipe-style veneer over a still-fluent core, or
  keeping both APIs) would reintroduce the two-models problem and
  betray the whole point. Owning the full rewrite is what makes the
  coherence real.

### 3. User Personas

- **The plgg contributor who thinks in pipelines (primary).** Lives in
  data-last composition, `Option`/`Result`, exhaustive `match`. Wants
  tests that read the way they think — assert by piping a value through
  composable checks that yield `Result`. For them the current fluent
  API is friction every single day; the redesign removes it. Success
  for this persona is a spec that "reads like the rest of plgg."

- **The AI coding agent (operational).** Reads existing specs to learn
  the pattern and writes new ones by imitation. A consistent,
  idiomatic assertion API means the agent generalizes ONE pattern
  across product and test code, producing specs that match house style
  by default — instead of having to learn and reproduce a foreign
  fluent dialect. The agent also still depends on the runner's exit
  code as the gating contract (unchanged from the first plgg-test).

- **Future contributors.** Arrive and learn plgg from its most-read
  code. With an idiomatic suite, the tests teach the real plgg way
  from day one, rather than presenting a fluent exception they must
  mentally bracket. Onboarding cost shifts from "learn two idioms" to
  "learn one, see it everywhere."

### 4. System Positioning — what must hold for the redesign to be trustworthy

This is a redesign of the **authoring/assertion surface**, deliberately
preserving the proven engine. Positioning:

- **Reuse the proven plumbing.** The runner, discovery, reporter,
  resolver, watch, and four-metric coverage already work and were
  externally validated. They are prior art to refactor and keep, not
  to rebuild. The redesign's risk budget should go to the new
  assertion surface, not to re-litigating solved infrastructure.
- **Replace only the face.** The describe/it-style structural grouping
  and the assertion mechanism are what change to pipe-style. What an
  assertion *returns* (`Result`) and how it *composes* (data-last,
  pipeable) is the heart of the work.
- **"Minimum but real, and idiomatic" must still include:** structural
  test grouping; a composable, data-last assertion vocabulary covering
  the checks the suite actually needs; automatic discovery; a pass/fail
  reporter with a correct process exit code; `--watch`; and
  four-metric coverage. None of the proven capabilities regress.
- **The no-false-green guarantee is non-negotiable and survives the
  paradigm shift.** Moving from "throw on mismatch" to "return a
  failing `Result`" changes the mechanism by which a failure is
  signaled — so the redesign must prove that a failing assertion still
  *reliably fails the test* (a `Result` that is ignored, swallowed, or
  not awaited must never read as a pass). This is the single most
  important correctness property to design for and verify.

### 5. Business Risk Assessment (with mitigations)

- **Risk: a `Result`-returning assertion can be silently dropped (the
  redesign-specific false green).** A fluent API that throws fails
  loudly if you write the assertion at all. A function returning
  `Result` can be *called and its result ignored*, or composed
  incorrectly, so a real failure never reaches the runner — a green
  that should be red. This is the existential risk of the whole
  paradigm.
  *Mitigation (business-framed):* make "a failing assertion always
  fails its test, even if its `Result` is mishandled" the
  non-negotiable definition of done, and prove it by deliberately
  constructing the mishandling cases and showing they still fail. The
  design must make the right way the easy/only way (an assertion
  pipeline that cannot be accidentally no-op'd).

- **Risk: an unfamiliar assertion API is less ergonomic or more
  error-prone than the fluent one.** Pipe-style is more idiomatic but
  could read awkwardly for common checks, or invite subtle composition
  mistakes.
  *Mitigation:* define success as **"reads naturally as a pipeline AND
  keeps the no-false-green guarantee"** — both, not either. Validate
  ergonomics by rewriting a representative slice of real specs early
  and judging whether they genuinely read better than the fluent
  version; if a common check is clumsy, fix the vocabulary before
  committing to the full rewrite.

- **Risk: full-suite rewrite cost and the chance of changing verdicts
  during rewrite.** Rewriting every spec by hand can introduce errors
  that flip a verdict.
  *Mitigation:* use the **already-established intended verdicts** as
  the oracle — the rewritten suite must reach the same pass/fail
  conclusions the validated suite did. Rewrite is "change the
  expression, preserve the verdict," checked against that baseline.

- **Risk: scope creep — redesign balloons into rebuilding the engine
  or inventing a large assertion DSL.** "Redesign" can tempt
  over-engineering.
  *Mitigation:* hard guardrails — reuse the proven plumbing untouched
  where possible; scope the assertion vocabulary to the checks the real
  suite needs (a closed, knowable set), not a speculative catalog;
  anything beyond that is a named follow-up, not v1.

### 6. Success Criteria (team-verifiable)

1. **Idiomatic authoring.** A representative real spec, rewritten,
   reads as data-last pipe-style composition — assertions are
   composable functions a value is piped through, returning `Result` —
   and is judged by a plgg contributor to read like the rest of plgg
   (no fluent `expect(x).toBe(y)` chains remain).
2. **No false green across the paradigm shift.** A failing assertion
   reliably fails its test, demonstrated against deliberately
   constructed mishandling cases (ignored/uncomposed/un-awaited
   `Result`s) — none read as a pass.
3. **Verdict preservation.** The rewritten suite reaches the same
   pass/fail conclusions as the previously-validated suite (the
   intended-verdict oracle).
4. **No capability regression.** The runner still provides automatic
   discovery, a correct process exit code, `--watch` that re-runs on
   change, and four-metric coverage gated at the per-package
   threshold.
5. **Bounded scope.** The proven plumbing is reused/refactored rather
   than rebuilt, and the assertion vocabulary is scoped to the suite's
   real needs, with anything beyond recorded as an explicit follow-up.

## Review Notes

(none yet)
