# Round 1 Review — Planner

Reviewer: Planner (Progressive / business-outcome lens)
Artifacts reviewed:
- Architect — `models/model-v1.md`
- Constructor — `designs/design-v1.md`

Lens: does each artifact deliver the direction's outcome — assertions
that read as plgg pipelines, the no-false-green guarantee surviving the
throw→return paradigm shift, idiom over migration, and a rewrite gated
by the prior verdicts as oracle — and can a contributor trace the
reasoning?

---

## Decision: Architect's Model v1 — Approve with minor suggestions

The model achieves the direction's core ambition structurally: it
makes the test API stop *imitating* plgg and start *being* plgg
(`pipe(actual, toBe(expected))` is literally a plgg pipeline, §3.1).
The coherence table maps every vision element to one component, and it
correctly identifies the two genuine tensions — narrowing and trivial-
case ergonomics — and ranks the dropped-Result false green as the
existential, signature hazard the fluent model could not have. The
recommended seam (keep L0 matchers provable in isolation; make the
Runner's "fold a returned Assertion, fail on void/throw" the single
small change to proven plumbing) is exactly right for protecting the
business outcome: prove the new idiom AND the guard before touching
the rest.

### Concern 1 (business risk — the anti-false-green guard is NOT yet
airtight): "fail on void/non-Result return" closes the *forgot to
return* hole but not the *returned the wrong/partial verdict* hole.
The model's guard (§1 table, §5.1) is "the runner's verdict is derived
from the RETURNED Result, and a body that returns non-Result/void is a
failure." That defeats the simplest drop (returning nothing). But the
direction's existential risk has two sharper forms the guard does NOT
catch:
- a body that returns a *passing* Assertion built from the WRONG actual
  (e.g. `pipe(2+2, toBe(4))` left in place while the value under test
  changed) — returns `Ok`, reads as pass;
- a body that computes a real assertion, *discards its Result*, then
  returns a *different* passing assertion (e.g. two statements where
  the first assertion's `Result` is dropped before the final return).
Both return a valid `Ok` Result, so "non-Result = fail" lets them
through. This is the same vacuous-pass class the direction calls
existential, just one level up.
**Proposal (business-framed):** state in the model that the guard's
job is "make the single-pipeline form the *only* natural form," so
multi-statement bodies that can drop an intermediate Result are an
anti-pattern the idiom structurally discourages — and push the
enforcement of "every computed assertion reaches the verdict" onto the
combinators: `all([...])`/`cast`/`check` should be the sanctioned way
to combine multiple assertions, with a body that is a *single*
expression (pipe/cast/proc/all) as the idiom. Pair that with a lint-
level or meta-harness check that a test body is a single returned
expression, not a statement sequence that can silently drop a Result.
Frame the guarantee as: "a failing assertion fails its test *because
the only idiomatic way to write one returns it*," not merely "a missing
return fails."

### Concern 2 (traceability — the narrowing two-path story risks
confusing contributors): the model leans toward value-carrying
matchers (option b) but keeps the throwing primitive (option a) as a
fallback, and the choice is left to design.
For the teaching-surface goal, a contributor must not face a confusing
"sometimes assert returns a value to pipe, sometimes it throws to
narrow" fork. The model is right that (b) is idiomatic, but it should
say plainly, in business terms, that **(b) is the default contributors
see and (a) is a rarely-needed, clearly-labeled escape** — so the
common reading is one clean idiom, not a two-path story.
**Proposal:** add one sentence positioning value-carrying matchers
(`shouldBeOk()` yields the inner value) as THE narrowing idiom in the
teaching surface, with the throwing `narrow` explicitly marked as a
rare escape hatch — so the idiom a reader learns is uniform.

---

## Decision: Constructor's Design v1 — Approve with observations

This is a buildable, scope-disciplined plan that serves the outcome
well. It nails the things I care about: matchers ARE `refine`-shaped
plgg functions (§2.1), the value flows THROUGH on success so checks
chain in `cast`/`pipe`, `shouldBeOk()` both asserts and yields the
inner value (§2.4 — the idiomatic narrowing replacement), async is
just `proc` and throwing code is just `tryCatch` (no special engines),
and the verdict-parity oracle (§4.4) operationalizes "change the
expression, preserve the verdict" against the prior 74/465/0 baseline.
The belt-and-suspenders runner (§3, §4.2) — returned `Err` OR a throw
both fail, and a non-Result/non-sentinel return is itself a failure —
is the right backbone. The early representative-slice ergonomics check
(§6) before the full rewrite is exactly the de-risking the direction
asked for.

### Concern 1 (business risk — same airtightness gap, plus a sentinel
that can reopen it): the `pass()`/`ok()` sentinel for
"genuinely-assertion-free tests" is a deliberate hole in the very guard
that protects against false greens.
§4.2 fails a body that returns a non-Result "unless it is the explicit
`ok()`/`pass()` sentinel." That sentinel is a legitimate convenience,
but it is precisely a value a mis-written body could return while
having dropped its real assertion `Result` — exactly the existential
case. If `pass()` is easy to reach, "forgot to return my assertion"
and "deliberately assertion-free" become indistinguishable to the
runner.
**Proposal (business-framed):** make `pass()` rare and conspicuous —
require an explicit reason argument (`pass("no observable output; see
…")`) so it reads as a deliberate, justified exception in the spec and
in review, never a silent default. And, mirroring my model concern,
treat the single-returned-expression body as the idiom: a body that is
a statement sequence (where an assertion Result can be computed and
dropped before the return) should be flagged by the meta-harness /
lint, since `pass()` cannot distinguish that from a real assertion-free
test. The business goal is that the only easy way to write a test is
one where every assertion reaches the verdict.

### Concern 2 (outcome verification — verdict-parity proves SAME
conclusions but NOT that the rewrite still tests the same THING):
parity against 74/465/0 is necessary but can be satisfied by a rewrite
that quietly weakens an assertion.
§4.4/§5 require the rewritten suite to reach the same per-test
pass/fail verdicts as the old plgg-test. That catches verdict drift,
but a spec rewritten to assert something *weaker* (or trivially true)
still shows green and still "matches" the all-pass baseline — so parity
alone can't tell a faithful rewrite from a hollowed-out one. For a
rewrite of EVERY spec, that is a real business risk to the suite's
protective value.
**Proposal:** add a cheap counter-check to the oracle: after the
rewrite, run a mutation spot-check on a representative slice — flip a
few assertions' expected values and confirm those tests now FAIL under
the new idiom. If a rewritten assertion can't be made to fail by
corrupting its expectation, it isn't really testing. This keeps the
"preserve the verdict" oracle honest about preserving the *assertion's
force*, not just its green color — cheap insurance on a full-rewrite.

### Minor (not blocking): `all` async aggregation (§6) must await all
and NOT short-circuit, unlike `cast`. The design notes this; just make
it an explicit self-test that an `all([...])` with two independent
async failures reports BOTH — because "report every failure" is part
of why the idiom reads better than the fluent one, and a silent
short-circuit there would quietly degrade the ergonomics win.

---

## Cross-Artifact Coherence Assessment

The model and design are tightly coherent and jointly serve the
direction. Concretely:

- **Idiom over migration:** both treat vitest drop-in as explicitly
  abandoned and a full rewrite as the cost — model §3, design §5. The
  design's "codemod is a convenience, correctness gated by the
  verdict-parity oracle, not the codemod" is the right framing and
  matches the direction's owned trade-off.
- **Assertions ARE plgg:** model's "stops imitating plgg, starts being
  plgg" and design's "every matcher is a `refine`-shaped function"
  describe the same component. Fully aligned, and this is the heart of
  the teaching-surface value proposition.
- **Anti-false-green:** both center it as existential and both reach
  for the same primary defense (body returns the verdict + non-Result
  return = fail). They are coherent — but they share the SAME blind
  spot my concerns name: neither yet closes the returned-wrong-verdict
  / dropped-intermediate-Result / sentinel-escape variants. This is the
  one coherence gap to close before the gate: make "every computed
  assertion reaches the verdict" a structural property (single returned
  expression as the idiom; combinators as the only multi-assert path;
  conspicuous `pass()`), not just "a missing return fails." Both
  artifacts should land on this jointly.
- **Narrowing:** model offers (a)/(b); design commits to (b) value-
  carrying `shouldBeOk()` with `narrow` as the rare throw. The design's
  commitment resolves the model's open choice in the idiomatic
  direction — good convergence; my model Concern 2 just asks the model
  to state the same positioning so a reader sees one idiom.
- **Reuse boundary:** both reuse Discovery/Reporter/Resolver/Coverage/
  Watch and refactor only the Runner seam + new matcher layer.
  Identical and correct — risk budget goes to the assertion surface,
  per the direction.

Net: both artifacts are sound, mutually consistent, and deliver the
idiom the direction demands. My asks are guardrails, not redesigns,
and they converge on ONE theme: the anti-false-green guard as currently
described stops the naive dropped-Result but not its sharper variants
(wrong/partial verdict, sentinel escape) — and on a full-spec rewrite
that residual hole is the biggest threat to the business value the
suite exists to provide. Closing it structurally (the only natural test
form is one where every assertion reaches the verdict) + a mutation
spot-check on the rewrite is what makes "no false green across the
paradigm shift" true rather than asserted.
