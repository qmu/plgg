# Round 1 Review — Planner

Reviewer: Planner (Progressive / business-outcome lens)
Artifacts reviewed:
- Architect — `models/model-v1.md`
- Constructor — `designs/design-v1.md`

Review question I hold each artifact to: does it deliver the
business outcome from direction-v1 (quiet supply chain, owned and
trustworthy green/red signal, familiar authoring, working watch,
honest coverage), and can a stakeholder trace the reasoning end to
end?

---

## Decision: Architect's Model v1 — Approve with minor suggestions

The model faithfully carries every direction success criterion into a
structural component and keeps the chain traceable: the §1 coherence
table maps each business need (SC1–SC6) to exactly one owned
component, which is precisely the stakeholder-traceability I look for.
It correctly elevates the two things the direction made
non-negotiable: `toEqual` deep-equality as the #1 false-green vector
(§3.4, §5) and the parity gate as the proof mechanism. It also
honored the role boundary well — it grounded claims in the repo
without straying into the Constructor's build-sequencing territory.
Business-wise, the "prove L0/L1 against the corpus before
watch/coverage/TS-loader land" seam (§5) directly serves the "verdict
parity, then removal" north star. Strong.

### Concern 1 (business risk): coverage framed as "separable" risks
quietly becoming "dropped."
The model recommends gating on describe/it/expect parity first and
treating coverage as a separable second component that "either ships
or is deferred honestly" (§5.1). I support the engineering sequencing,
but from a business-outcome view "separable" is one slip away from
the ambiguous coverage gap that direction §6.5 explicitly forbids.
The repo already has a strict >90% expectation; if coverage silently
lapses during the swap, under-tested code ships green — a trust
regression that undercuts the whole value proposition.
**Proposal:** keep coverage separable in *build order* but bind it to
a business gate in the model's language — i.e. state that vitest is
not removed until coverage is either (a) reported under plgg-test or
(b) explicitly deferred with a named, dated follow-up AND an interim
guarantee that the >90% gate is not silently lost in the interim. The
decision must be a recorded, visible verdict, never a default.

### Concern 2 (traceability): the `vi.mock` resolution is left "for
downstream to decide" — fine structurally, but the business cost of
each option should be made explicit.
§3.3 names two options (loader hook vs refactor the one spec) and
defers the choice. That is correct role discipline, but a stakeholder
reading the model cannot yet see which option protects the
"trustworthy minimal runner" outcome better.
**Proposal:** add one business-framed sentence noting that option (b)
— refactoring the single seam — keeps the runner minimal and avoids a
fragile, correctness-sensitive module-interception surface, which is
the lower-risk choice for the trust outcome; the loader hook only buys
us avoiding one file's edit at the cost of a permanent complex
surface. This lets the decision be traced to a business rationale, not
just a structural one. (The Constructor already lands on (b) — see
coherence note.)

### Minor data-fidelity note (not blocking):
The model's grepped counts (`assert` 64, `test` 125, `toThrow` 6)
differ from the design's (`assert` 448, `test` 744, `toThrow` 6 — but
"per file" vs "per call" framing differs). The matcher *frequency
ranking* and the *closed-set conclusion* agree, so the business
conclusion is unaffected. I flag it only so the two authors reconcile
whether they counted files vs call-sites before either number is
quoted as fact downstream — a stakeholder shouldn't see two different
"truths."

---

## Decision: Constructor's Design v1 — Approve with observations

This is a buildable, honest, scope-disciplined plan that serves the
business outcome well. It nails the things I care about most:
- **The agent-facing contract is explicit** (§1.6): exit code 1 on any
  failure or zero-expected-tests, 0 only on all-pass. That is exactly
  persona 2's (AI agents running `scripts/test-*.sh`) non-negotiable
  requirement, stated as the most safety-critical behavior.
- **The false-green risk is the headline risk** (§4) with concrete
  failure modes (async swallowing, escaping unhandled rejection) and a
  meta-harness that verifies the primitives *without trusting the thing
  under test* (§3.1). The bootstrapping blind-spot is named and
  mitigated — this is the single best trust-protecting idea in either
  artifact.
- **The parity gate is a delivery step** (§3.2.4), not an aspiration:
  run both runners, require identical per-test verdicts before removing
  vitest. This operationalizes direction §6.2 exactly.
- **Coverage honesty** (§1.8): the >90% gate is named as the real
  contract with an explicit, non-ambiguous correction path for
  statement-granularity. This satisfies direction §6.5's "never an
  ambiguous silent gap."
- **Watch as a first-class acceptance criterion** (§1.7, §4) with
  debounce + full re-run and the criterion "edit triggers fresh
  re-run."

### Concern 1 (business risk): the "zero discovered tests → exit 1"
rule is correct but needs a guard against a silent partial-discovery
false green.
§1.6 exits non-zero on "zero discovered tests-that-were-expected,"
which is good. But the more dangerous business case is *partial*
discovery — the runner silently finds 60 of 74 spec files (a resolver
or glob edge case), reports all-pass on the 60, and exits 0. To an
agent that is an all-clear; to the business it is a false green hiding
14 unrun files.
**Proposal:** add an expected-file-count or manifest check to the
acceptance criteria — during the parity migration, assert that
plgg-test discovers the *same set* of spec files vitest runs (not just
the same verdicts on the files it happens to find). Parity must be
over the file set, not only over executed tests. Cheap, and it closes
the most plausible silent-green hole.

### Concern 2 (traceability/business cost): the `vi.mock` refactor is
the right call, but it edits product source, not just a spec — that
crosses from "test migration" into "behavior-adjacent change" and
should be surfaced as such.
§1.5/§3.2.3 refactors `generateObject` to inject `postJson`. I agree
this is the lower-risk path (it matches direction's "refactor
low-quality seeds" permission). But a stakeholder should see that this
is a change to shipped code, however small, with its own test that the
injected default still calls the real `postJson`.
**Proposal:** call out in the migration plan that the `postJson`
injection gets its own parity check (real default path tested), so the
refactor cannot itself introduce a behavior change masked by the
migration. Keep it explicitly listed as the one product-code edit, so
the migration's blast radius is fully visible.

### Minor (not blocking): "watch never exits non-zero to kill the
loop" is correct for interactive use, but confirm CI never invokes the
watch path — agents must always hit the one-shot, exit-coded path.
A one-line statement that CI/agents use the non-watch invocation
removes any doubt about the gating contract.

---

## Cross-Artifact Coherence Assessment

The model and design are highly coherent and both faithfully serve
direction-v1. Concretely:

- **False-greens parity gate** — both treat it as the existential
  concern; the model identifies the chokepoints (`toEqual`, async)
  and the design operationalizes the gate as a delivery step plus a
  meta-harness. Fully aligned and traceable to direction §5/§6.2.
- **Watch as first-class** — model §2/§5.5 and design §1.7/§4 agree on
  `fs.watch` + debounce + full re-run with "edit triggers fresh
  re-run" as the criterion. Aligned with direction §6.4.
- **Honest coverage** — design §1.8 satisfies "never ambiguous";
  model §5.1 frames it as separable. These are compatible IF my Model
  Concern 1 is taken (bind "separable" to a recorded
  ship-or-defer verdict so separable never decays into dropped).
- **vi.mock** — model defers the choice; design picks the
  refactor-the-seam option. Coherent, and the design's choice is the
  business-preferred one; my Model Concern 2 just asks the model to
  state the business rationale so both artifacts point the same way.
- **Command-scripts policy** — both correctly read it as "change what
  npm scripts invoke, keep the canonical wrapper family," not new
  bespoke scripts. Aligned with the project memory on this.

**One coherence gap to close:** the two artifacts quote different raw
usage counts (assert 64 vs 448, test 125 vs 744). The conclusions
agree, but before any number is carried into the build or used to
scope the matcher set, the authors should reconcile file-count vs
call-count framing so downstream work and any stakeholder-facing claim
rests on one set of figures.

Net: both artifacts are sound, mutually consistent, and deliver the
business outcome. My two requested additions are guardrails, not
redesigns: (1) bind "separable coverage" to a recorded ship-or-defer
verdict, and (2) make parity cover the *spec-file set*, not only
executed verdicts — together they close the two most plausible routes
to a false green, which is the outcome the whole trip exists to
protect.
