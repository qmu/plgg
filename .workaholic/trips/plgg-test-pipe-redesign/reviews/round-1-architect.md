# Round 1 Review — Architect

Reviewer: Architect (Neutral — translation fidelity & boundary integrity)
Artifacts reviewed:
- `directions/direction-v1.md` (Planner)
- `designs/design-v1.md` (Constructor)

Lens: does the chain business-vision → structural-model → design hold
without loss; does the design faithfully realize the pipe-style model
(Assertion = plgg `Result`; matcher `(expected)=>(actual)=>Assertion`;
`all`/`not`; the runner fold-seam; the anti-false-green guard); does the
reused plumbing genuinely stay unchanged and the plgg-only dependency
boundary hold. I re-verified the design's load-bearing plgg primitives
against source before reviewing (see §coherence).

---

## Artifact 1 — `directions/direction-v1.md`

**Decision: Approve with observations.**

The direction is coherent and translatable, and it does the one thing a
redesign direction must: it names the existential, paradigm-specific
risk precisely — "a `Result`-returning assertion can be silently
dropped" (§5) — and makes "a failing assertion always fails its test,
even if its `Result` is mishandled" the non-negotiable definition of
done. That is exactly the structural hazard my model flagged as #1, and
the design picks it up verbatim. The trade-off ownership (§2: idiom OVER
drop-in, every spec rewritten) is honest and correctly bounded by "plgg
is its own only consumer." The verdict-preservation oracle (§6.3),
reusing the first trip's proven intended verdicts, is a strong, falsifiable
gate that de-risks the rewrite.

**Concern (translation fidelity): SC2's "mishandling cases" are named
but not enumerated, and they are the whole ballgame.** §5/§6.2 say a
failing assertion must fail "even if its `Result` is mishandled
(ignored/uncomposed/un-awaited)" — but a dropped `Result` is, by its
nature, invisible: the danger is the case the author didn't think to
list. As written, "deliberately constructed mishandling cases" could be
satisfied by one or two token cases while a real drop-shape slips
through. *Concrete structural proposal:* enumerate the closed set of
drop-shapes the definition of done must each prove-fails, derived from
the type's degrees of freedom: (a) body computes an assertion but
returns `undefined`/`void`; (b) body returns a *different* (passing)
`Result` than the one it computed; (c) async body returns a
`Promise<Result>` that isn't awaited; (d) a `proc`/`all` that
short-circuits or swallows an inner `Err`; (e) a body that returns a
non-`Result` truthy value. The design already addresses (a) and (e)
structurally — pinning the full list in the direction makes SC2
measurable instead of judgment-call.

**Minor:** SC1 ("reads like the rest of plgg," judged by a contributor)
is the right success test but is subjective. Consider naming the
representative slice up front (e.g. a high-`toBe`-density spec plus an
async/`proc` spec plus a Result-narrowing spec) so the ergonomic verdict
is taken on a fixed, idiom-spanning sample rather than a convenient one.

---

## Artifact 2 — `designs/design-v1.md`

**Decision: Approve with observations.**

This is a faithful — in places enriching — realization of the model.
It is grounded in verified plgg primitives, it keeps the dependency and
execution boundaries intact, and it makes three good calls that improve
on my model: (1) matchers are explicitly `refine`-shaped, tying the test
API to plgg's *existing* canonical "predicate→Result" function rather
than a new convention; (2) throwing-code assertions reuse `tryCatch`
instead of a bespoke `toThrow` engine — fully idiomatic; (3) the
value-flow-through (`ok(actual)` on success so the actual threads
downstream in a `cast`) is exactly the data-flow-narrowing I wanted, and
it generalizes cleanly to `shouldBeOk()` yielding the inner `T`.

The runner fold-seam is clean and preserves my "defect path vs assertion
path" distinction (§3, §4.2): `matchResult` folds a returned `Err` →
failed; the prior throw-capture `guard` is KEPT as a safety net so a
thrown exception is *also* failed — both channels fail, neither is the
other. A returned `Err` is the assertion path; a throw is the defect/
misuse path. That is the distinction intact, and it is the right one.

**Primary concern (fidelity — the narrowing fork is described two ways
and the design must pick ONE as canonical).** §1.1 introduces a
throwing `narrow` (`asserts cond`) as "the one throwing seam," but then
the *same* paragraph and §2.4 show the actually-used mechanism is
`shouldBeOk()`/`shouldBeErr()` — value-carrying matchers that return the
unwrapped inner value as a `Result`, with NO throw and NO `asserts cond`.
These are two different resolutions of the narrowing problem, and the
design presents both without declaring which is canonical. My model
preferred narrowing-as-data-flow (the value-carrying matcher) precisely
to avoid a sanctioned `asserts cond` throw in a no-escape-hatch codebase.
The design's own §2.4 example proves the data-flow path covers the
dominant `assert(isOk(r)); r.content` case completely. *Concrete
proposal:* make the value-carrying matchers (`shouldBeOk`/`shouldBeErr`/
`shouldBeSome`/`shouldBeNone` that yield the inner value) the SOLE
narrowing mechanism, and **drop the throwing `narrow` primitive from v1
entirely** unless a concrete corpus site is shown that genuinely needs a
bare local binding the pipeline can't carry. Keeping a throwing
`asserts cond` "just in case" reintroduces exactly the escape hatch the
redesign exists to eliminate; if it must exist, it should be a named,
justified follow-up gated on a real failing example — not a v1 seam. The
delete-list (§3) already removes the old ambient narrowing shim, so the
codebase is positioned to live without it.

**Observation 2 (fidelity — `all` is the second-most-load-bearing
combinator and it inverts `cast`'s semantics; treat it as a gated
check).** `cast` short-circuits on first `Err` (verified in
`cast.ts`) — good for dependent assertions. But `all([...])` must do the
OPPOSITE: run every assertion and AGGREGATE all `Err`s (so a test
reports all failed checks, the direction's intent). The design notes this
(§6 risk "`all` async aggregation … must not short-circuit"), but `all`
is where a subtle bug hides a real failure: if `all` accidentally
short-circuits or drops a later `Err`, that's a false green of drop-shape
(d). *Proposal:* elevate `all` (both sync and the `Promise<Result>`-
awaiting async form) to an explicit meta-harness primitive check —
"`all` with one Err among many passes reports failed and surfaces every
Err" — alongside the dropped-`undefined` case. It is the aggregation dual
of the runner fold and deserves the same proof rigor as the runner seam.

**Observation 3 (minor factual — the `proc`/`AssertionError` error
channel).** §0 states `proc`'s "error channel fixed to `Error`." That is
not quite right: `proc` (read in `proc.ts`) yields `Result<T, E | Defect>`
where `E` is the union of each step's error type — so a `proc` pipeline
of matchers carries `AssertionError | Defect`, not `Error`. This is
actually *favorable* (the assertion error type flows through), but the
runner's fold (§3) folds on `AssertionError`; it must also map a
`Defect` arm (an unexpected throw caught by `proc`) to failed. *Proposal:*
state the async body's Result type as `Result<unknown, AssertionError |
Defect>` and have the fold treat BOTH error arms as failed — so a `proc`
body that fails via a caught throw (Defect) isn't mis-folded. Small, but
it's on the async correctness path the direction flagged.

---

## Cross-artifact coherence note

The direction → model → design chain is coherent; the dependency and
plumbing boundaries hold; one fork to close (narrowing) and two combinator/
async fold details to pin.

- **Design realizes the model:** Assertion = plgg `Result` (deepening,
  not complicating, the boundary — see below); matcher = data-last
  `refine`-shaped fn; `not`/`all` as combinators; runner fold-seam with
  the throw safety net. **Faithful.**
- **Boundary integrity — building on plgg's `Result` DEEPENS the
  boundary, it doesn't complicate it.** I re-verified: `refine`
  (`Functionals/refine.ts`) is `(pred,msg)=>(a)=>Result<a,InvalidError>`,
  `tryCatch` lifts throws to `Result<U,Defect>`, `cast` short-circuits,
  `matchResult`/`mapErr` fold — every primitive the design leans on
  exists and has the cited shape. Assertions become first-class
  participants in `pipe`/`cast`/`proc`/`matchResult` with zero new
  vocabulary. The runtime dep stays `plgg`-only; `typescript` is the
  existing devDep for the load hook; no third-party dep. **Coherent and
  strengthened.**
- **Reused plumbing genuinely unchanged:** Discovery, Reporter,
  `Resolve/hook.ts`, `Coverage/*`, the bin-launcher watch/coverage
  re-exec, `Cli/args.ts`, per-package `plgg-test.config.json`,
  `equals.ts`, `format.ts` — all reused. `Registry` changes only the
  stored body's TYPE (`()=>Assertion`), not its tree mechanics. The only
  substantive change is the Runner fold-seam — correctly scoped to the
  one boundary the redesign requires. **Coherent** (matches the model's
  "refactor the one seam, reuse the rest").
- **Narrowing is the one place direction-intent and design have a fork**
  (throwing `narrow` vs value-carrying matchers). Both point at the same
  goal; the design must declare the value-carrying path canonical to stay
  inside the no-escape-hatch rule the direction's whole thesis rests on.

Net: no artifact needs to go back. The design should (1) make
value-carrying matchers the sole narrowing mechanism and drop/defer the
throwing `narrow`, (2) gate `all`'s aggregate-don't-short-circuit
semantics as a meta-harness check, and (3) fix the `proc` error-channel
description so the async fold handles `AssertionError | Defect`. The
direction should enumerate the closed set of drop-shapes SC2 must each
prove-fails.

## Summary of decisions

- `directions/direction-v1.md`: **Approve with observations** (enumerate
  the closed drop-shape set for SC2; fix the ergonomic-judgment slice).
- `designs/design-v1.md`: **Approve with observations** (make
  value-carrying matchers the sole narrowing path, drop the throwing
  `narrow` from v1; gate `all` aggregation as a meta-harness primitive;
  correct the `proc` error channel to `AssertionError | Defect` in the
  async fold).
