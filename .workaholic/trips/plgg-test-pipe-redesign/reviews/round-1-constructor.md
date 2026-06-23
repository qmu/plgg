# Round 1 Review — Constructor

Reviewer: Constructor (conservative lens — buildability, quality,
production readiness)

Artifacts reviewed:
- `directions/direction-v1.md` (Planner)
- `models/model-v1.md` (Architect)

Lens: can the pipe-style model be BUILT at the plgg quality bar
(no `as`/`any`/`ts-ignore`, Result-not-throw, pipe/cast/proc) without
escape hatches, and does the anti-false-green guard actually hold at
runtime? I implemented the prior plgg-test end to end, so these notes
are grounded in what the plumbing actually does.

---

## Artifact 1 — `directions/direction-v1.md`

### Decision: Approve with observations

The trade-off is owned honestly and correctly: the fluent face WAS
forced by the drop-in goal, reversing the priority is the right call,
and "the suite is the most-read teaching surface" is the real
justification. Success criteria are verdict-verifiable, the
intended-verdict oracle is the right rewrite check, and elevating the
dropped-Result false green to the non-negotiable DoD matches where the
genuine danger is. Nothing here blocks the build.

### Concern (biggest) — "a Result that is not awaited must never read as a pass" (§4) is the one success criterion that is NOT free, and the direction states it as if it were

§4 and SC2 require that an *un-awaited* `Result` never reads green.
This is harder than the ignored/uncomposed cases and the direction
should flag the cost. An async test body that returns
`proc(...)`/`Promise<Assertion>` is awaited by the runner — fine. But a
body that *fires* an async assertion without returning it (`void
proc(...)`; `expected` computed then dropped) only fails if the runner
also has the O2 unhandled-rejection window AND a "body must resolve to
an Assertion" check — and even then, a dropped `Result` that neither
throws nor rejects (a synchronously-produced `Err` that is computed and
discarded) is invisible to both. The honest position: the
return-is-the-verdict contract catches the *dropped sync Err* (because
the body returns something-not-an-Assertion → fail), and the rejection
window catches *thrown/rejected* escapes; together they cover the
cases, but "un-awaited" specifically is only covered when the dropped
value is the body's return.

**Concrete proposal:** in SC2, enumerate the three mishandling classes
the meta-harness must each demonstrate failing — (a) body returns a
`Fail` (the happy path), (b) body returns void / a non-Assertion while
a real assertion was computed, (c) body throws / a fired async
assertion rejects — and state that case (b) is caught by the
body-return contract, not by any runtime await-tracking. This keeps SC2
from implying a guarantee (tracking arbitrary un-awaited promises) the
design cannot actually make.

---

## Artifact 2 — `models/model-v1.md`

### Decision: Approve with minor suggestions

This is a buildable model and it converges with my design on every
load-bearing point: `Assertion = Result<Pass, Fail>`, matcher
`(expected) => (actual) => Assertion`, `all` as cast-style failure
accumulation, the runner-fold seam, value-carrying matchers as the
preferred narrowing answer, `check` sugar for the terse case, and reuse
of the proven plumbing. The L0/L1/L2/L3 layering is right and the
"prove L0 + the anti-false-green guard before touching plumbing"
ordering is exactly how I'd sequence it. Three buildability concerns,
each with a concrete fix.

### Concern 1 (biggest) — a plain plgg `Result` is NOT sufficient as `Assertion`; the runner cannot distinguish a verdict from a domain `Result` without a brand, and detecting "is this an Assertion" drives the whole anti-false-green guard

The model says use "plgg's own `Result` (not a bespoke type)" as
`Assertion` — "zero new vocabulary" (§2). That is elegant but it
**breaks the anti-false-green guard the same model relies on** (§5.1).
The guard is: "the Runner FAILs any test whose body resolves to a
non-Assertion." To implement that the runner must answer, at runtime,
"is this returned value an Assertion?" If `Assertion` is just
`Result<unknown, unknown>`, then a test whose body legitimately RETURNS
a domain `Result` (extremely common in this codebase — e.g.
`test("parse", () => asInt("x"))` where the author *meant* to then
assert on it) is indistinguishable from a real verdict: an `Err` domain
value would be reported as a failed assertion, and an `Ok` domain value
as a pass — a false green produced by the very type choice meant to
prevent them. `isResult` cannot tell a verdict from data.

**Concrete proposal:** `Assertion` must be a BRANDED Result — its
`Fail` (and ideally its `Pass`) carries a `Box`-tag the runner checks
(`__tag: "Assertion"` or a `Fail` that is a tagged `Box`, using plgg's
own `Box` so it's still "plgg vocabulary"). The runner's guard becomes
"the body's resolved value must be a Result whose payload is the
Assertion brand; anything else — a bare domain Result, void, a
non-Result — fails the test as 'body did not return an assertion'."
This keeps the Result/pipe/proc composability the model wants (a
branded Result is still a Result) while making the guard *implementable
without an `as` cast* (brand-check via `isBox`/a guard, the house way to
narrow). Without this, §5.1's guard is not buildable as stated. This is
the single most important thing for the design to nail.

### Concern 2 — `all(...assertions)` over heterogeneous actual types, and the `Fail` carrying heterogeneous matcher/expected/actual, need their types pinned or they force an `as`/`any`

§2 defines `all : (...Assertion[]) => Assertion` folding many
assertions "of different actual types." That is fine ONLY if `Assertion`
is existential in its actual type at the `all` boundary — i.e. `Fail`
must NOT be generic over the actual's type, or `all([Assertion<number>,
Assertion<string>])` won't type-check without a cast. Similarly `Fail =
{matcher, expected, actual, message}` carries heterogeneous
`expected`/`actual`: those fields must be **pre-formatted to `string`
at the matcher boundary** (reuse the prior-art `format.ts`), not stored
as the raw `unknown` values — otherwise `Fail` is generic, `all`'s
return type is unsound, and the reporter needs a cast to print them.

**Concrete proposal:** pin `Pass` to carry the (optionally narrowed)
value but make `Assertion` at composition boundaries
`Result<unknown, Fail>` with `Fail = Readonly<{ matcher: string;
expected: string; actual: string; message: string }>` — all strings,
formatted by the matcher via `format.ts` at creation time. Then `all`
is `(xs: ReadonlyArray<Assertion>) => Assertion` with no generic
gymnastics and no cast, and the cast-style sibling accumulation (fold
every `Fail` into one combined `Fail`/`InvalidError`-style sibling
list) is straightforward. Value-carrying matchers (`okContent`) keep
their precise `Pass<T>` type on the SINGLE-matcher path (`pipe`/`cast`),
where the actual type IS known; only `all`'s aggregate erases it.

### Concern 3 — narrowing: the model's value-carrying-matcher (b) is the right and ONLY fully-idiomatic answer; the throwing fallback (a) should be dropped from v1, not kept as an option

§3 offers (a) a throwing `narrow` primitive vs (b) value-carrying
matchers (`okContent: (Result) => Result<T, Fail>`), preferring (b).
From the build chair: (b) is not just preferred, it is *sufficient* —
every narrowing site in the prior corpus was `assert(isOk(x));
x.content...`, which (b) expresses exactly as `cast(x, okContent(),
shouldBe(...))`. Keeping (a) as a "pragmatic fallback" reintroduces a
sanctioned throw boundary into a no-escape-hatch codebase for zero
proven need, and it would be the one place a contributor sees "tests
may throw after all" — re-opening the two-models wound the direction is
closing. My prior trip had to ship an entire ambient `.d.ts` shim
purely to make a cross-package `asserts cond` import narrow under TS 6;
dropping control-flow narrowing **deletes that whole class of fragility**.

**Concrete proposal:** commit to (b) only for v1; if a genuine bare-
local-binding need surfaces during the spec rewrite, record it as a
named follow-up rather than pre-building (a). State in the design that
`Assertion`-returning matchers never narrow types and that narrowing is
expressed as data-flow (value carried in `Pass`), with `match`/
`matchResult` available for the rare custom case. (This is also what my
design-v1 lands on — the two converge.)

### Ergonomics (confirming the lead's question)

`check(actual, ...matchers)` IS implementable and keeps the common case
terse: `check = <A>(actual: A, ...ms: ReadonlyArray<Matcher<A>>):
Assertion => all(ms.map((m) => m(actual)))`. It is data-first
(`actual` first), data-last matchers, returns an `Assertion`, and folds
via `all` so multiple checks on one value report every failure. The
single-check case `check(x, shouldBe(y))` is one call — on par with the
fluent `expect(x).toBe(y)` in length and strictly more composable. No
buildability issue; recommend it be the documented default entry, with
bare `pipe(actual, matcher)` available when a matcher's `Pass` value
feeds a further step.

---

## Cross-artifact coherence

Direction and model are coherent and converge with my design; "minimum
but real + idiomatic" stays achievable without scope creep, with two
coherence flags for the build phase:

1. **The brand (my Concern 1) is where "zero new vocabulary" (model)
   and "no false green" (direction §4) collide — and the brand is the
   resolution.** The model's instinct to reuse plain `Result` for
   elegance directly endangers the direction's non-negotiable. A
   `Box`-branded Result satisfies both: still plgg vocabulary (it's a
   `Box` + `Result`), still composable, but runtime-distinguishable
   from domain data. The design must pick the brand explicitly; it is
   the keystone, not a detail.

2. **Scope guardrail holds, with one watch-point: `all`'s sibling
   accumulation must reuse plgg's existing mechanism, not invent one.**
   `cast` already accumulates `sibling` errors into one `InvalidError`
   ("Cast failed at N of M"). `all` should fold `Fail`s the same way
   (reuse `InvalidError`/`Box` sibling lists) rather than growing a
   bespoke aggregate type — otherwise the "no new DSL" guardrail
   (direction §5) quietly erodes. Keep `Fail` and the aggregate built
   from plgg's own error vocabulary.

No quality compromise or scope landmine is hidden between the two
artifacts. The one thing that could compromise the bar — the
anti-false-green guard being unbuildable because a verdict can't be
told from a domain `Result` — is fixable and identified (Concern 1);
get the brand right and the rest follows.

## Review Notes

(none yet)
