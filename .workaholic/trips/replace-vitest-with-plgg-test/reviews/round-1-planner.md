# Round 1 Review — Planner

- **Reviewer**: Planner (business-outcome lens)
- **Artifacts reviewed**: `models/model-v1.md` (Architect), `designs/design-v1.md` (Constructor)
- **Status**: draft

## Content

I review both artifacts against the Direction's four success criteria:
(1) zero vitest references, (2) every package green under plgg-test with
coverage preserved **file-for-file**, (3) watch + coverage workflow
parity as a release condition, (4) a contributor reaching for plgg-test
as the path of least resistance, with refining plgg-test treated as an
in-scope win. My concern throughout is outcome trust during a
wide-reaching change, not whether the end state is desirable.

### Decision: models/model-v1.md — Approve with observations

The Model serves the Direction well. It retires the success-criteria
risk I cared most about — the resolver boundary — by verifying the
existing tsconfig convention and the proven `plgg` precedent, which
means criterion 2 ("every package green") is not gated on per-package
resolver work. It correctly identifies that the orchestration layer
needs zero edits, which protects criterion 3 (CI/workflow parity) at the
script level. And it surfaces, rather than hides, the long-tail risks
(`.resolves` rejection-path fidelity, `.rejects`/`toThrow` hand-rewrites,
the `vi.mock` DI redesign, the timeout-arg signature) — that traceability
is exactly what stakeholders need to trust the migration.

**Concern M-1 (business-critical): the `.resolves` rejection-path
fidelity is the single biggest threat to "coverage preserved
file-for-file," and the Model leaves it as an unverified precondition.**
The Model's §3-#1 is candid that the naïve `check(await p, toBe(y))`
rewrite changes behavior on the rejection path and depends on the
runner's throw-handling, "which needs confirmation against
`Core/Runner.ts` before the rewrite is trusted." From a business view,
this is the difference between a suite that still protects what it
protected before and one that goes green while testing less — the exact
silent-regression outcome criterion 2 exists to prevent. The Model
defers this to "Constructor's first acts" but does not make it a gate.

- **Proposal**: Make the `Core/Runner.ts` throw-handling check and the
  `Expect/equals.spec.ts` `toEqual`-parity check (§3-#4) explicit
  **entry gates** before any bulk rewrite begins — not just early tasks.
  Framed as a business outcome: "no file is migrated until we have
  confirmed that a rejected promise and a divergent deep-equal both
  produce a visible test failure, so a green suite provably means
  preserved protection." This costs two file reads up front and converts
  the highest silent-regression risk into a checked precondition.

**Concern M-2 (DX / criterion 4): the Model frames the
`.rejects`/`toThrow` refinement as merely "de-risking," underselling its
value to the contributor-experience criterion.** The Model treats "refine
the runner vs. hand-rewrite 14 sites" as a Design decision weighted
mostly on migration risk. But criterion 4 is about the *future* test
author: if plgg-test has no way to assert "this throws / this rejects,"
every future error-path test is a hand-rolled try/catch, which is the
friction that makes a contributor reach back for vitest's ergonomics.

- **Proposal**: Re-frame the refinement question in outcome terms, not
  just migration terms — "does a contributor writing a *new* error-path
  test next quarter have a first-class way to express it?" The
  instruction explicitly blesses refining plgg-test, so a `toThrow`
  matcher + async `rejects` helper is a strategic win for criterion 4,
  not just a one-time migration convenience. (See the Design conflict
  C-1 below, which makes resolving this urgent regardless.)

### Decision: designs/design-v1.md — Request revision

The Design is strong, concrete, and outcome-aware: it directly defends
criterion 2 by discovering the 6 gated packages and making per-package
`plgg-test.config.json` a hard checklist item (R2), it defends criterion
1 by folding the lingering `plgg` vitest devDeps/dead config into U3, it
defends criterion 4 by ruling that an `assert` shim would re-introduce
the throw idiom the house style removed, and its §6 threshold-drift risk
(V8 vs istanbul) is precisely the kind of "green but unguarded" outcome I
need surfaced. I would approve it but for one material cross-artifact
factual conflict that, if the Design's number is wrong, silently breaks
criterion 2.

**Concern C-1 (BLOCKER — cross-artifact factual conflict on the
error-path inventory).** The Model and the Design disagree on the single
most rewrite-sensitive part of the corpus:

- The Model (§2 table, §3-#2, Component taxonomy d) measures **`.rejects`
  11 sites + `toThrow` 3 sites = 14 sites with NO plgg-test parity**,
  each requiring a hand-written try/catch that "a mechanical pass will
  get wrong," and proposes a possible `toThrow`/`rejects` refinement.
- The Design (§1b table, §1h, §3) states **`.rejects` is used 0 times**,
  does not list `toThrow` at all, and names **`toBeGreaterThanOrEqual`
  (1 site)** as the *only* gap requiring refinement (R1).

These cannot both be true, and the gap is not cosmetic: it is the
difference between "1 trivial matcher to add" and "14 error-path
assertions that must be hand-rewritten without dropping what they
assert." If the Design's "0 `.rejects` / no `toThrow`" is the operative
plan and the Model's 14 sites are real, the migration will either fail to
compile or — worse for criterion 2 — silently rewrite throw/reject
assertions into something weaker. This is the highest business risk in
the whole planning round because it directly produces the silent
coverage regression criterion 2 forbids.

- **Proposal**: Before the plan is fixed, reconcile the inventory with a
  single authoritative grep over the 58 files (e.g.
  `grep -rn '\.rejects\|toThrow' packages --include="*.spec.ts"`) and
  record the true count in **both** the revised Design and (via the
  Architect) the Model. Then the Design must explicitly state, for
  whatever the real count is, the chosen path: (a) add a `toThrow`
  matcher + async `rejects` helper to plgg-test (my recommended outcome —
  serves criterion 4), or (b) enumerate each error-path site as a
  named, human-reviewed hand-rewrite (acceptable only if the count is
  genuinely 0–3 and each is individually listed). A revision that simply
  asserts "0 `.rejects`" without reconciling against the Model's 14 is
  not shippable, because if the Model is right the suite regresses
  silently.

**Concern C-2 (criterion 2 — threshold drift turns "file-for-file" into
a judgment call, and the Design's mitigation can be read as license to
lower gates).** §6 correctly flags that V8 block-branch counting will
report lower numbers than vitest's istanbul-normalized thresholds, and
proposes "lower the threshold with a documented comment" as a
mitigation. From a business-outcome view, "preserve coverage
file-for-file" (my criterion 2) and "lower the threshold to whatever the
new runner reports" are in tension — the latter, applied loosely, would
let the migration quietly weaken every gate and still call itself done.

- **Proposal**: Constrain the mitigation with an outcome rule the Design
  states explicitly: a threshold may be lowered **only** to the migrated
  package's *measured* plgg-test number, **only** with a one-line
  documented rationale naming the istanbul-vs-V8 cause, and **never** by
  excluding files to hit a number (the Design already says the latter —
  good; make the former a named gate, not a footnote). Each lowered gate
  should be surfaced to me/CI as an explicit "ship-or-defer" line item,
  so criterion 2 stays auditable: a stakeholder can see exactly which
  gates moved, by how much, and why.

**Concern C-3 (criterion 3 — watch + coverage parity is asserted but not
made a per-package acceptance gate).** The Design's §4 says "run
`test-watch-<pkg>.sh` once to confirm watch parity" and run coverage for
gated packages, which is good. But criterion 3 is a *release condition*
in the Direction, and the delivery plan (§5) lets each package ship
"green for that package" — I want to be sure "green" provably includes
watch + coverage, not just the one-shot `test` run.

- **Proposal**: Add watch-mode and coverage-run confirmation to the
  explicit per-package definition-of-done in U2 (not just the §4 prose),
  so no package is marked shippable until its watch loop and (if gated)
  its coverage gate have both been exercised. This makes criterion 3
  auditable per package rather than assumed.

### Cross-artifact coherence assessment

The two artifacts are highly coherent on structure and faithfully serve
the Direction's value proposition in most respects: both retire the
resolver risk, both confirm zero shell-script/CI edits (protecting
criterion 3 at the orchestration layer), both fold the `plgg` cleanup
into scope (protecting criterion 1), and both reject an `assert` shim in
favor of data-flow narrowing (protecting criterion 4 and the house
style). The Design's coverage-config discovery (6 gated packages) is a
genuine strengthening of criterion 2 that the Model did not surface, and
the Model's resolver verification is a genuine de-risk the Design relies
on — the two complement each other well.

The **one coherence break is C-1**: the error-path inventory (`.rejects`/
`toThrow`) differs between the two artifacts by 14 sites versus 0, and
this is precisely the corpus region both agree is highest-risk to
rewrite. Until that single number is reconciled against the source, the
plan cannot be trusted to deliver criterion 2, and the criterion-4
refinement decision (M-2) cannot be made on solid ground. Everything
else is approvable; this conflict is the gating item for the round.

## Review Notes

- Net decisions: **Model — Approve with observations** (M-1 gate the two
  fidelity checks; M-2 re-frame the refinement as a criterion-4 win).
  **Design — Request revision** (C-1 blocker: reconcile the `.rejects`/
  `toThrow` inventory against the Model and state the chosen error-path
  path; C-2: constrain threshold-lowering to a documented, surfaced
  rule; C-3: make watch+coverage a per-package definition-of-done).
- I have intentionally raised concrete, outcome-framed proposals for
  every concern per the Critical Review Policy, including on the Model I
  approved.
