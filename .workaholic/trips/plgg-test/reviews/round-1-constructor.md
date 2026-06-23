# Round 1 Review — Constructor

Reviewer: Constructor (conservative lens — engineering quality,
production readiness, buildability)

Artifacts reviewed:
- `directions/direction-v1.md` (Planner)
- `models/model-v1.md` (Architect)

I reviewed both through the question: *is what is promised actually
buildable at the plgg quality bar (no `as`/`any`/`ts-ignore`,
Option/Result, >90% coverage, no false greens), within "minimum but
real"?*

---

## Artifact 1 — `directions/direction-v1.md`

### Decision: Approve with minor suggestions

The business case is sound and, crucially, *technically achievable as
written*. The framing that the corpus — not vitest's catalog — defines
the surface is exactly the constraint that makes the scope bounded and
the success criteria reachable. The "verdict parity, then removal"
gate (SC2) and the "no false green is non-negotiable" definition of
done are the right north stars and match how I would gate the build.
The persona-2 point (agents depend on the exit code as a contract) is
correctly elevated to safety-critical.

### Concern 1 (biggest) — "minimal edits to specs" (SC1) understates a real, non-zero cost and hides the `vi.mock` exception

SC1 says migration should be "minimal, mechanical changes... ideally
just the import source." Two technical realities pull against the
"ideally just one line" framing:

- The import rewrite is `from "vitest"` → `from "plgg-test"` across
  **132 files** (per the model's grep). Mechanical, yes — but it must
  be **scripted and verified**, not hand-done, or it becomes its own
  error source. The criterion should say so.
- **One file cannot be migrated by import-rewrite alone:**
  `plgg-kit/.../generateObject.spec.ts` uses `vi.mock("plgg", …)`
  (hoisted module mocking). That is not a "minimal mechanical edit" —
  it is either a spec refactor (inject `postJson`) or a new loader-hook
  feature. SC1 as written would be reported as "met" while silently
  carrying this exception.

**Concrete proposal:** split SC1 into SC1a "the import source is
rewritten by a checked-in codemod/script across all spec files (no
hand edits)" and SC1b "at most one spec (`generateObject.spec.ts`)
requires a structural change, and the chosen approach (seam injection
vs. loader-hook mock) is recorded." This keeps the criterion honest
and measurable rather than aspirational.

### Concern 2 — SC5 "honest coverage" needs a named owner for the threshold-parity question, not just deliver-or-defer

SC5 correctly demands "reported accurately OR deferred with a named
correction path." But the model surfaces a fact the direction does not
yet account for: coverage config is **already uneven** — `plgg` gates
at 91 across all four metrics; `plgg-kit` has `coverage: { all: true }`
with **no thresholds**. So "correcting coverage" is partly a
*config-consistency* task independent of the runner rewrite.

**Concrete proposal:** add to SC5 that the definition of done must
state, per package, whether the >90% gate is enforced after migration,
so "honest coverage" covers the pre-existing inconsistency and not just
"does plgg-test emit a number." This also ties SC5 to the existing
[[feedback_coverage_threshold]] rule explicitly.

---

## Artifact 2 — `models/model-v1.md`

### Decision: Approve with observations

This is a strong, buildable structural model. The L0–L3 layering
(pure domain / orchestration / process edge / authoring façade) is
genuinely implementable at the quality bar: L0 (matchers, deep-equal,
tree types, AssertionError) is pure and unit-testable, which is exactly
where house-style Result/Option fits and where >90% coverage is
attainable. The domain vocabulary (Suite/Test/Hook/Expect/Matcher/
Runner/Discovery/Reporter/Watcher/Coverage/TestDouble) maps one-to-one
onto files I would actually create. The grounding section is excellent
and matches my own findings (matcher counts, `asserts cond` for
`assert`, native strip-types feasibility, alias resolution as the hard
part). My design-v1 and this model agree on every load-bearing point.

### Concern 1 (biggest) — the `expect`/`assert` boundary throws, but the model never says so; left implicit it collides with the no-escape-hatch house style

The model places the framework "inside the boundary" authored in house
style — "Option for maybe, Result for fallible, no escape hatches"
(§4) — and separately says a matcher's two outcomes are "satisfied
(no-op) or **AssertionError thrown**" (§2). Both are correct, but the
model does not reconcile them, and a builder reading "no escape
hatches, Result not throw" could try to make `expect().toBe()` return
a `Result` — which would break every one of the ~2000 call sites that
assume `expect(...)` either passes or throws. The `assert` `asserts
cond` signature (§2) *only works by throwing*; a Result return cannot
narrow a type.

**Concrete proposal:** add one sentence to §4 (Boundary Integrity)
making the seam explicit: *the public assertion boundary
(`expect`/`assert`) throws `AssertionError` because that is the
framework's contract and the precondition for `asserts cond` narrowing;
Result/Option/match govern the internal runner orchestration (L1/L2),
not the assertion API.* This prevents a well-intentioned but breaking
"Result-ify the matchers" misread during the build.

### Concern 2 — coverage via `node:inspector` Session is presented as the path, but `NODE_V8_COVERAGE` is the cheaper, lower-risk mechanism for the same data

The model's highest-ranked structural risk (§5.1) is in-house
coverage, and it specifies `node:inspector` Session →
`Profiler.takePreciseCoverage`. That works, but driving an inspector
session *in-process* around the runner is fiddly (enable/disable
timing, must wrap execution, interacts with the loader). The
lower-risk equivalent that yields the same V8 data is the
**`NODE_V8_COVERAGE=<dir>` env var**: the child process dumps raw V8
coverage JSON on exit, which a separate pass reads and folds — no
in-process profiler choreography, and it naturally captures the loader
and all imported source.

**Concrete proposal:** record `NODE_V8_COVERAGE` (out-of-process dump
+ post-pass) as the primary coverage mechanism and `node:inspector`
Session as the in-process fallback, in §2 (Coverage entity) and §5.1.
This lowers the model's #1 risk without changing the component
taxonomy. (This is also what my design-v1 specifies, so the two
artifacts converge cleanly.)

---

## Cross-artifact coherence

The direction and the model are **coherent and mutually consistent** —
each direction success criterion lands on exactly one model component
(the §1 coherence table is accurate), and nothing in the model forces
scope creep beyond the direction's "minimum but real." Three coherence
notes for the build phase:

1. **The parity gate (SC2) and `toEqual` (model §3.4/§5.3) are the
   same risk viewed twice, and that is good.** The direction makes
   "verdict parity before removal" the gate; the model identifies
   `toEqual` deep-equality as the single chokepoint where a divergence
   becomes a false green. These reinforce each other: the parity gate
   is precisely what validates the deep-equal implementation. No
   conflict — but the build must run *both* runners on the *real*
   corpus (not synthetic cases) for the gate to actually exercise the
   shapes (Result/Option `Datum`/`Dict`) that matter. Recommend
   stating that explicitly as the gate's acceptance form.

2. **`vi.mock` is the one place the direction's "minimal edits" (SC1)
   and the model's "keep the runner minimal" (§5.4) could quietly
   pull apart into scope creep.** If the team picks the loader-hook
   mock engine to preserve SC1's "just rewrite the import" purity, it
   imports real complexity (ESM module-graph interception) into the
   exact component the model says must stay minimal. The coherent
   resolution — which both artifacts already lean toward and which the
   direction's "breaking changes / refactor low-quality seeds" stance
   ([[feedback_breaking_changes_ok]], [[feedback_dont_clone_garbage]])
   permits — is to **refactor that one spec to inject the seam** and
   keep the runner free of a module-mock engine. Decide this *before*
   building the runner, not after, so it can't bleed.

3. **Watch reliability (SC4 ↔ model §5.5) is consistent and buildable;
   no scope conflict.** `fs.watch` + debounce + full re-run satisfies
   SC4 without the impacted-file optimization, which neither artifact
   requires. Good — keep impacted-only out of v1.

No quality compromise or scope-creep landmine is hidden between the two
artifacts. The single thing that could compromise the quality bar — a
false green from `toEqual` — is correctly identified by both and is
covered by the parity gate, provided that gate runs against the real
corpus.

## Review Notes

(none yet)
