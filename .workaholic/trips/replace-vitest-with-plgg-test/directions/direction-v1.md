# Direction v1

Author: Planner
Status: draft
Reviewed-by: (pending)

## Content

### Value Proposition

This monorepo ships a functional TypeScript library whose entire identity
is built on a small set of in-house primitives — Result over thrown
exceptions, Option over null, expression-style data-last pipelines, and an
exhaustive `match` discipline backed by a hard "no escape hatch" rule. The
project already authors its own test runner, `plgg-test`, and already runs
one package (`plgg`) fully on it. Everywhere else, the codebase still leans
on an external runner (`vitest`).

Consolidating every package onto `plgg-test` is worth doing because it
closes the last large gap between what the project preaches and what it
practices, and it pays off along four business dimensions:

- **Dependency sovereignty.** The test runner is the gate every change
  passes through before it is trusted. Owning that gate end-to-end means the
  project decides when its testing semantics change, rather than inheriting
  breaking changes, deprecations, or release-cadence pressure from an
  upstream tool the maintainers do not control. For a library that markets
  itself on self-sufficiency, sovereignty over the verification path is a
  first-class outcome, not a nicety.

- **A single house-style test idiom.** Today a contributor reads two
  dialects: the fluent `expect(x).toBe(y)` style in most packages and the
  data-last `check(x, toBe(y))` style in `plgg`. One idiom — the data-last,
  Result/Option-aware one that matches the library's own pipelines — means
  tests read like the code they cover. That coherence lowers the cost of
  moving between packages and makes the test suite itself a teaching example
  of the house style.

- **Reduced external supply-chain surface.** Every third-party runner brings
  a transitive dependency tree, its own release pipeline, and its own
  trust boundary into the build. Removing `vitest` shrinks the set of
  outside parties that can affect whether this project's tests pass, which
  is a tangible reduction in supply-chain exposure for a foundational
  library that other code depends on.

- **Type-driven consistency all the way down.** The library's central claim
  is that gaps in reasoning should be caught by types early. A test runner
  authored under the same discipline keeps that claim intact through the
  tooling layer, instead of dropping it at the boundary where verification
  begins.

### Business Risk Assessment

From a stakeholder and outcome view, the things that could go wrong are
about preserving trust during a wide-reaching change, not about whether the
end state is desirable:

- **Coverage regression during the rewrite.** ~58 test files across nine
  packages must be migrated. The dominant risk is that a mechanical rewrite
  silently drops assertions or weakens them, so the suite still goes green
  while actually testing less. The outcome that matters is that protection
  is preserved file-for-file, not merely that the suite passes.

- **Developer-experience friction.** Contributors fluent in the fluent
  `expect().toBe()` style must adopt the data-last `check(x, toBe(y))` form.
  If the new idiom is harder to write or read for common cases, the change
  taxes every future test author. The success of the migration is measured
  partly by whether writing a test stays at least as easy as before.

- **Workflow parity (watch and coverage).** Maintainers and CI rely on
  watch-mode iteration and coverage reporting today. If either workflow
  degrades — slower feedback, missing coverage numbers, a less usable
  watcher — the migration trades a real daily benefit for an abstract one.
  Parity on these workflows is a release condition, not an optional extra.

- **CI breakage and release exposure.** The test command is wired into CI
  and into the deploy/verify path. A migration that destabilizes CI blocks
  every contributor at once and can stall releases. The rollout must keep CI
  trustworthy throughout, including for `plgg-test` itself as a published
  artifact whose own behavior now gates the whole repo.

- **Capability gaps surfacing late.** If a package uses a `vitest` capability
  that `plgg-test` does not yet cover, discovering it mid-migration forces a
  detour into runner development. Surfacing the full capability requirement
  up front (a discovery the Architect and Constructor own) de-risks the
  schedule.

### User Personas

- **plgg library maintainers and contributors.** They write and read tests
  daily and decide what "passing" means. They are the primary beneficiaries
  of one idiom and the primary bearers of any friction it introduces. The
  direction succeeds for them only if a new test is as natural to write
  under `plgg-test` as it was under `vitest`.

- **Continuous Integration.** CI is a non-human stakeholder that must invoke
  one test command, get reliable pass/fail signal, and continue to report
  coverage. It depends on the runner being stable, fast enough, and
  scriptable in exactly the contexts the previous runner occupied.

- **Downstream consumers of `plgg-test`.** Because `plgg-test` is itself a
  published package, external users adopt it as their runner. Dogfooding it
  across the whole monorepo raises the bar on its completeness and stability,
  which directly improves the product these consumers receive. Their
  interest is that the in-house migration hardens the runner rather than
  bending it into a repo-private shape.

### System Positioning

A self-hosted test runner is the natural endpoint of the plgg philosophy,
not an exception to it. The library exists to provide functional primitives
and to demonstrate that a codebase can be built on them without reaching for
escape hatches. A test runner authored from those same primitives lets the
library dogfood itself at the layer that decides what is trusted: the runner
becomes both a product the project ships and the proof that the product is
sufficient for real work.

The "no escape hatch" rule, which today governs the source, extends cleanly
to tooling. Just as the code forbids `as`, `any`, and `ts-ignore` as
solutions, the verification layer should not depend on an outside runner as
its escape hatch from owning its own testing semantics. Positioned this way,
the migration is the tooling-level expression of a principle the project
already holds at the code level — consistency between what is claimed and
what is run.

### Business Rationale and Success Criteria

The rationale is convergence: the project should run on what it builds and
preaches, so that its tooling, its source, and its public claims tell one
story. "Done" is defined in outcome terms, so that any stakeholder can check
it without reading code:

1. **Zero vitest references remain.** No package depends on, configures, or
   imports `vitest` anywhere in the repository. Dependency sovereignty is
   only real when the external runner is fully gone, not merely unused.

2. **Every package's tests pass under `plgg-test`.** All nine migrated
   packages, plus the already-migrated `plgg` package, run green on the
   in-house runner — with coverage preserved file-for-file, not traded away
   for a passing suite.

3. **Watch and coverage workflows are preserved.** The daily iteration loop
   (watch) and the coverage reporting that CI and maintainers rely on work
   at least as well after the migration as before. Parity here is a release
   condition.

4. **A contributor can write a new test without reaching for vitest.** The
   data-last idiom is documented and natural enough that the obvious,
   discoverable way to add a test uses `plgg-test`. If the project must
   "refine `plgg-test` to make this happen," that refinement is in scope and
   is itself a win for the published package — the success bar is that the
   runner rises to meet real needs, never that tests bend around runner gaps.

These criteria together make the desired outcome auditable: sovereignty
(criterion 1), preserved protection (2), preserved workflow (3), and a
contributor experience that makes the new idiom the path of least
resistance (4).

## Review Notes

(awaiting round-1 reviews from Architect and Constructor)
