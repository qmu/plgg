# Direction v2

Author: Planner
Status: approved
Reviewed-by: Architect, Constructor

## Content

This revision is a clarity pass over `direction-v1.md`. The business
vision, value proposition, risk assessment, personas, and system
positioning are unchanged and carry forward as written. What changes is
**only the success criteria**: the Architect's and Constructor's
"Approve with minor suggestions" feedback sharpened each criterion so the
Coding Phase is judged against an unambiguous, auditable target. The
unchanged sections are summarized briefly; the success criteria are
restated in full.

### Carried forward unchanged from v1

- **Value proposition** — four axes: dependency sovereignty over the
  verification gate, a single house-style data-last test idiom
  (`check(x, toBe(y))` reads like the library's own pipelines), reduced
  external supply-chain surface, and type-driven consistency through the
  tooling layer.
- **Business risk assessment** — coverage regression during the rewrite,
  expect()-to-check() DX friction, watch/coverage workflow parity,
  CI/release exposure, late-surfacing capability gaps.
- **User personas** — plgg maintainers/contributors, CI as a non-human
  stakeholder, downstream consumers of `plgg-test` as a published
  package.
- **System positioning** — a self-hosted runner is the tooling-level
  expression of the "no escape hatch" rule; the library dogfoods its own
  primitives at the layer that decides what is trusted.

### Resolution of the planning-round blocker (recorded for traceability)

My round-1 review raised a blocking cross-artifact conflict (C-1): the
Model measured 14 error-path sites with no parity (`.rejects` 11 +
`toThrow` 3) while the Design measured `.rejects` 0. The factual
reconciliation settled it: **`.rejects` = 0** (the Architect withdrew its
11 false positives, confirming the Constructor's count), and the real
surviving error-path gap is just **3 `toThrow` sites** (hand-rewritten as
try/catch + `check`, no new matcher) plus **1 `vi.mock` site** (redesigned
to dependency injection). C-1 is resolved: there is **no silent
throw/reject regression risk**, because there are zero `.rejects`
assertions and the 3 `toThrow` sites are explicitly enumerated for
human-reviewed hand-rewrite. This removes the one coherence break and
lets the criterion-4 long-tail note below be stated precisely.

### Business rationale and success criteria (sharpened)

The rationale is unchanged — convergence so the project runs on what it
builds and preaches. "Done" is restated below with the accepted
sharpenings, so any stakeholder can audit the outcome without reading
code.

1. **Zero vitest references remain — including the already-migrated
   `plgg` package.** No package may depend on, configure, or import
   `vitest` anywhere. This explicitly includes `plgg` itself: it is only
   half-migrated today — its `package.json` still declares `vitest` and
   `@vitest/coverage-v8` devDependencies, and its `vite.config.ts` still
   carries a dead `test:` coverage block and a
   `/// <reference types="vitest" />`. Those are current violations of
   this criterion, so "zero" is not met until `plgg` is cleaned alongside
   the nine migrating packages. (Sharpened per Architect/Constructor:
   "zero" must include the reference package, not just the nine.)

2. **Coverage protection preserved — distinguishing the gate from the
   reported percentage.** This criterion is about *protection*, not about
   a number staying numerically identical:

   - **Protection-preserved (the binding outcome).** Every coverage
     *gate* that exists today must still hold after migration. The 6
     packages that carry real vitest thresholds (`plgg-fetch`,
     `plgg-http`, `plgg-router`, `plgg-server`, `plgg-sql`, `plgg-view`)
     are re-gated via per-package `plgg-test.config.json`; the 3 ungated
     packages (`example`, `plgg-foundry`, `plgg-kit`) stay ungated (a
     missing config file = reported-but-never-failing, reproducing their
     current `all: true` behavior).

   - **Reported-percentage (legitimately shifts).** Because `plgg-test`
     measures with a V8 block-branch ruler that reads lower than vitest's
     istanbul-normalized ruler, the reported percentage may move even
     though the same code is exercised. A shift in the number is **not** a
     regression; a hole in protection is.

   - **The rule that keeps this auditable.** A gate may be lowered **only**
     to the package's *measured* V8 number, **only** with a one-line
     rationale naming the istanbul-vs-V8 cause, and **never** by excluding
     files to hit a number. Each lowered gate is surfaced as an explicit
     ship-or-defer line item, so a stakeholder can see exactly which
     gates moved, by how much, and why. (Sharpened per Constructor:
     separate protection from percentage; per Planner C-2: bound the
     lowering rule and make every lowered gate visible.)

3. **Watch and coverage workflows preserved — proven per package, not
   assumed.** The daily watch loop and the coverage reporting CI and
   maintainers rely on must work at least as well after migration. This
   is folded into each package's **definition-of-done**: a package is not
   "green" until its `test:watch` loop has been exercised once and, if it
   is one of the 6 gated packages, its coverage run has been observed to
   fire the gate at the intended number. Parity is a per-package release
   condition, not a final-step assumption. (Sharpened per Planner C-3:
   make watch + coverage confirmation part of per-package done.)

4. **A contributor reaches for plgg-test as the path of least resistance
   — for the common cases, with the long tail honestly scoped.** For the
   matchers that dominate the corpus (`toBe`, `toEqual`, `toContain`,
   `toHaveLength`, `.not`, async-via-`await`, and Result/Option narrowing
   through `okThen`/`errThen`/`someThen`/`shouldBe*`), writing a new test
   under `plgg-test` is at least as natural as it was under vitest, and is
   the obvious, discoverable, documented way to add a test. The honest
   scope: the **long tail is strictly harder, not easier** — asserting
   that something throws is a hand-written try/catch + `check` (3 such
   sites in this migration; no `toThrow` matcher is being added), and
   module-level mocking is replaced by dependency injection (1 such
   site). These error-path and seam cases ask more of the author than
   vitest's `toThrow`/`vi.mock` shorthands did. Criterion 4 is therefore
   met for the common path that covers ~99% of assertions, with the long
   tail flagged as a known, bounded ergonomics cost rather than papered
   over. (Sharpened per Architect/Constructor: scope "natural to write"
   to the common matcher cases and name the harder long tail explicitly.)

These four criteria make the outcome auditable: sovereignty including the
reference package (1), preserved protection with a transparent
percentage-vs-gate distinction (2), per-package watch/coverage parity
(3), and an honestly scoped contributor experience (4).

## Review Notes

- Supersedes `direction-v1.md`. Both round-1 reviewers
  (Architect, Constructor) approved v1 with minor suggestions; this
  version folds those accepted suggestions into the success criteria.
  Status set to **approved**.
- No change to value proposition, risk assessment, personas, or system
  positioning — this was a clarity pass on the success criteria only.
