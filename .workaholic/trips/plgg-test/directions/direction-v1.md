# Direction v1

Author: Planner
Status: draft
Reviewed-by: none yet

## Content

### 1. Value Proposition

Today the plgg monorepo depends on vitest — a large, fast-moving
third-party test library — to run its test suite. That dependency
pulls in a deep tree of transitive packages, each of which is a
source of Dependabot pull requests, version churn, and supply-chain
exposure that the maintainer must triage week after week. The test
runner is the one tool that decides whether every other piece of work
is "green" or "red," yet its internals are entirely outside our
control.

`plgg-test` proposes to flip that relationship. By building a
minimal, purpose-built test runner from scratch — owned by us, with
zero or near-zero third-party runtime dependencies — plgg gains:

- **Supply-chain quietness.** Dropping vitest collapses a large
  dependency subtree, which directly reduces the volume of Dependabot
  alerts and upgrade PRs the maintainer fields. Maintenance attention
  is freed for product work rather than dependency hygiene.
- **Full control over the green/red signal.** The team owns the exact
  semantics of pass/fail, discovery, and reporting. When behavior
  needs to change, we change it — no waiting on upstream, no working
  around upstream regressions.
- **Identity alignment.** plgg is explicitly a "built from scratch on
  primitives" project (its own web router, its own HTTP layer, its own
  SQL layer are all in-family). A bespoke test runner is a natural,
  consistent member of that family rather than a foreign import sitting
  at the center of the workflow.
- **Right-sized surface.** plgg is its own only consumer, so we need
  exactly the features plgg's tests use — not the long tail vitest
  carries for the whole ecosystem. A smaller surface is cheaper to
  understand, audit, and keep correct.

The business case is not "vitest is bad." It is "the test runner is
load-bearing infrastructure, and for a project whose identity and
governance model favor owned primitives, owning this one removes a
recurring tax and a control gap at acceptable cost."

### 2. User Personas

- **The plgg maintainer (primary).** Writes and runs tests daily,
  triages Dependabot PRs, and is accountable for whether the suite is
  trustworthy. Wants tests to keep passing with minimal rewrite, wants
  fewer dependency PRs to babysit, and — above all — must be able to
  trust that a green run means the code is actually correct. Values a
  fast feedback loop (hence `--watch`) and a familiar authoring style.

- **AI coding agents (operational).** The agents that run
  `scripts/test-*.sh` as part of `/drive`, `/ship`, and trip
  workflows. They consume the runner non-interactively and depend
  entirely on the **process exit code** to gate further action. For
  this persona, correct exit codes and a stable, parseable
  pass/fail report are not nice-to-haves — they are the contract.

- **Future contributors.** People who arrive already fluent in
  vitest/jest mental models. They should be able to read and write
  `*.spec.ts` files with the familiar `describe` / `it` / `expect`
  vocabulary and have them "just run," without learning a bespoke API.
  A familiar surface lowers onboarding cost and protects the value of
  the existing test corpus.

### 3. System Positioning — what "minimum but real" must include

`plgg-test` sits at the operational center of the repo: it is the
tool every other workflow trusts to certify correctness. Because that
trust is the whole point, "minimum" must never come at the expense of
"real and trustworthy." A test runner that is small but occasionally
reports a false green is worse than no change at all.

To be trustworthy, the minimum viable runner must include, at least:

- **`describe` / `it` (and a skip path)** — the structural vocabulary
  existing specs already use.
- **An `expect` with the common matchers** plgg's tests actually
  rely on (equality, truthiness, throwing, and the handful of others
  the current suite uses). Coverage of matchers is defined by the
  existing test corpus, not by vitest's full catalog.
- **Test discovery** — finds the repo's `*.spec.ts` files
  automatically, so authors don't register tests by hand.
- **A pass/fail reporter with a correct process exit code** — green
  exits zero, any failure exits non-zero, no failure is ever silently
  swallowed. This is the single most safety-critical behavior.
- **`--watch`** — re-runs the relevant tests on file change, giving
  the maintainer the tight feedback loop they have today. This is an
  explicit, required feature of the trip.
- **Coverage — reported, or with a clear correction path.** Coverage
  is desired and the current coverage story may need correcting; the
  definition of done must state honestly whether coverage is delivered
  in this minimum or deferred with a named follow-up, never left
  ambiguous.

Positioning summary: plgg-test is the in-family replacement for
vitest as the repo's certification tool — same authoring ergonomics,
far smaller footprint, fully owned semantics.

### 4. Business Rationale & Trade-offs

The recurring cost being removed (dependency churn, triage overhead,
loss of control) is ongoing and compounding. The cost being incurred
(a one-time build of a correctness-sensitive tool, plus its long-term
maintenance) is real but bounded — bounded precisely because plgg is
the only consumer and the feature set is dictated by one existing test
corpus rather than an open ecosystem. The trade is favorable when, and
only when, the resulting runner is trustworthy enough that the team
stops thinking about it. That condition is the north star for scope
decisions.

### 5. Business Risk Assessment (with mitigations)

- **Risk: False greens (a failing test reported as passing).**
  This is the existential risk; it silently erodes the trust the whole
  effort is meant to protect.
  *Mitigation (business-framed):* make "no false green" the
  non-negotiable definition of done. Before vitest is removed, run the
  existing suite under both runners and require identical pass/fail
  verdicts test-for-test. Trust is demonstrated by parity, not
  asserted.

- **Risk: Feature gap vs vitest blocks migration.**
  Existing specs may use matchers or APIs the minimal runner lacks.
  *Mitigation:* scope the matcher/API set from what the current corpus
  actually uses (a closed, knowable list), not from vitest's full
  surface. Migration cost is then a known quantity, and "minimal edits
  to existing specs" becomes a measurable target.

- **Risk: `--watch` unreliability degrades the daily loop.**
  A flaky watcher (missed changes, stale results) frustrates the
  primary persona and pushes them back toward the old tool.
  *Mitigation:* treat watch correctness as a first-class acceptance
  criterion — editing a source or spec file must reliably trigger a
  re-run with fresh results — rather than a best-effort extra.

- **Risk: Coverage regression or inaccuracy.**
  The repo has a strict coverage expectation; a runner that reports
  wrong or no coverage could mask under-tested code.
  *Mitigation:* require an explicit, honest coverage decision in the
  definition of done — either accurate coverage is delivered, or it is
  deferred with a named, scheduled correction path. No silent gap.

- **Risk: Underestimated build/maintenance effort.**
  Reimplementing a runner is genuine work on a sensitive surface.
  *Mitigation:* enforce scope guardrails — "minimum but real" means
  exactly the listed must-haves and nothing speculative. Anything
  beyond the existing corpus's needs is out of scope for v1 and
  recorded as a future option, keeping the effort bounded.

### 6. Success Criteria (team-verifiable)

1. **Migration with minimal edits.** The existing `*.spec.ts` suite
   runs under plgg-test with only minimal, mechanical changes to test
   files (ideally just the import source), preserving the familiar
   describe/it/expect authoring style.
2. **Verdict parity, then removal.** Every existing test produces the
   same pass/fail verdict under plgg-test as under vitest; only after
   parity is shown is the vitest dependency dropped.
3. **Correct gating signal.** The runner exits zero on all-pass and
   non-zero on any failure, so `scripts/test-*.sh` and the agent
   workflows that depend on it gate correctly.
4. **Working watch loop.** `--watch` re-runs tests on file change and
   reports fresh results reliably.
5. **Honest coverage outcome.** Coverage is either reported accurately
   or explicitly deferred with a clear, named correction path —
   documented, not ambiguous.
6. **Dependency reduction realized.** Removing vitest measurably
   shrinks the dependency tree and the associated Dependabot surface.

## Review Notes

(none yet)
